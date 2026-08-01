/**
 * Passkey (WebAuthn) capability detection and failure mapping.
 *
 * Kept free of React and of the supabase client so it can be unit-tested
 * directly — everything here is a pure function of its inputs plus, for the
 * capability probes, `window`.
 *
 * Two things this module exists to get right:
 *
 * 1. **Never render a control that cannot work.** WebAuthn needs a secure
 *    context and a browser that implements it. Both are cheap to check and
 *    neither is universal, so the checks gate the UI rather than producing an
 *    error after the user has already committed to a click.
 *
 * 2. **A cancelled ceremony is not a failure.** Dismissing the OS passkey
 *    sheet is the single most common outcome of pressing the button, and it is
 *    a decision, not a fault. It gets `cancelled: true` and callers stay quiet.
 *    The WebAuthn spec deliberately reports cancellation and timeout with the
 *    same `NotAllowedError`, so that the relying party cannot learn whether a
 *    credential existed; the two are therefore indistinguishable here and are
 *    treated alike.
 */

/** Why a passkey ceremony did not produce a session. */
export type PasskeyFailureReason =
  | "cancelled"
  | "unsupported"
  | "insecure-context"
  | "no-credential"
  | "rp-mismatch"
  | "already-registered"
  | "challenge-expired"
  | "verification-failed"
  | "server-disabled"
  | "too-many"
  | "rate-limited"
  | "needs-confirmed-contact"
  | "network"
  | "unknown";

export interface PasskeyFailure {
  /** Safe to show to the user as-is. */
  message: string;
  /**
   * True when the user dismissed the prompt (or it timed out — WebAuthn does
   * not distinguish). Callers must NOT raise an error toast for these.
   */
  cancelled: boolean;
  reason: PasskeyFailureReason;
}

/**
 * Does this browser expose the WebAuthn API at all?
 *
 * Mirrors the check supabase-js makes internally before it will start a
 * ceremony, so the button's presence and the SDK's willingness agree.
 */
export const browserSupportsWebAuthn = (): boolean => {
  if (typeof window === "undefined" || typeof navigator === "undefined") return false;
  return (
    "PublicKeyCredential" in window &&
    Boolean(window.PublicKeyCredential) &&
    "credentials" in navigator &&
    typeof navigator.credentials?.create === "function" &&
    typeof navigator.credentials?.get === "function"
  );
};

/**
 * WebAuthn is restricted to secure contexts. `window.isSecureContext` already
 * encodes the localhost carve-out browsers make for development, so it is
 * preferred over sniffing `location.protocol` by hand.
 */
export const isSecureContextForWebAuthn = (): boolean => {
  if (typeof window === "undefined") return false;
  if (typeof window.isSecureContext === "boolean") return window.isSecureContext;
  // Pre-`isSecureContext` browsers: approximate the same rule.
  const { protocol, hostname } = window.location;
  return protocol === "https:" || hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
};

/** The synchronous half of capability detection: API present and usable here. */
export const canUsePasskeys = (): boolean =>
  browserSupportsWebAuthn() && isSecureContextForWebAuthn();

/**
 * Is there a built-in (platform) authenticator — Touch ID, Windows Hello,
 * Android screen lock?
 *
 * Only advisory. A `false` here does not mean passkeys are unusable: a security
 * key or a phone over hybrid/QR transport still works, and Chrome reports
 * `false` on plenty of desktops that can nonetheless complete a ceremony. It is
 * therefore used to choose *wording*, never to hide the control — hiding on
 * `false` would remove the button from every desktop without a fingerprint
 * reader.
 */
export const hasPlatformAuthenticator = async (): Promise<boolean> => {
  if (!browserSupportsWebAuthn()) return false;
  try {
    const fn = window.PublicKeyCredential?.isUserVerifyingPlatformAuthenticatorAvailable;
    if (typeof fn !== "function") return false;
    return await fn.call(window.PublicKeyCredential);
  } catch {
    // Some embedded webviews throw rather than resolve false.
    return false;
  }
};

/**
 * Is conditional UI (passkey autofill) available? Advisory, same as above.
 */
export const supportsConditionalMediation = async (): Promise<boolean> => {
  if (!browserSupportsWebAuthn()) return false;
  try {
    const fn = window.PublicKeyCredential?.isConditionalMediationAvailable;
    if (typeof fn !== "function") return false;
    return await fn.call(window.PublicKeyCredential);
  } catch {
    return false;
  }
};

/** Pull a `code` off an error without assuming its class. */
const codeOf = (error: unknown): string => {
  if (typeof error !== "object" || error === null) return "";
  const c = (error as { code?: unknown }).code;
  return typeof c === "string" ? c.toLowerCase() : "";
};

const nameOf = (error: unknown): string => {
  if (typeof error !== "object" || error === null) return "";
  const n = (error as { name?: unknown }).name;
  return typeof n === "string" ? n : "";
};

const messageOf = (error: unknown): string =>
  error instanceof Error ? error.message.toLowerCase() : "";

/**
 * The name of the underlying DOMException, following one level of `cause`.
 *
 * supabase-js wraps browser errors in its own `WebAuthnError`; when it cannot
 * attribute a cause it uses the code `ERROR_PASSTHROUGH_SEE_CAUSE_PROPERTY` and
 * leaves the original on `cause`, which is where the useful name lives.
 */
const domExceptionName = (error: unknown): string => {
  const direct = nameOf(error);
  if (direct && direct !== "WebAuthnError" && direct !== "AuthError") return direct;
  const cause = (error as { cause?: unknown } | null)?.cause;
  return cause ? nameOf(cause) : "";
};

const CANCELLED: PasskeyFailure = {
  // Shown only where a caller opts to surface it; it is not an error toast.
  message: "Passkey prompt dismissed.",
  cancelled: true,
  reason: "cancelled",
};

/**
 * Turn anything a passkey ceremony can reject with into something a person can
 * read.
 *
 * `context` changes only the wording, never the classification.
 */
export const getPasskeyFailure = (
  error: unknown,
  context: "register" | "signin",
): PasskeyFailure => {
  if (!error) return { message: "Passkey sign-in failed.", cancelled: false, reason: "unknown" };

  const code = codeOf(error);
  const domName = domExceptionName(error);
  const msg = messageOf(error);

  /* ── The user said no ─────────────────────────────────────────────────
     Also covers the timeout, which the spec renders as the same error so
     that a site cannot probe for the existence of a credential. */
  if (
    code === "error_ceremony_aborted" ||
    domName === "NotAllowedError" ||
    domName === "AbortError" ||
    domName === "TimeoutError"
  ) {
    return CANCELLED;
  }

  /* ── Environment cannot do this ───────────────────────────────────── */
  if (!browserSupportsWebAuthn() || msg.includes("does not support webauthn")) {
    return {
      message: "This browser does not support passkeys. Use your email and password instead.",
      cancelled: false,
      reason: "unsupported",
    };
  }
  if (!isSecureContextForWebAuthn() || domName === "SecurityError") {
    // SecurityError is also what an RP-ID/origin mismatch raises, but an
    // insecure page cannot reach a ceremony at all, so order matters: check
    // the context we can actually observe before blaming configuration.
    if (!isSecureContextForWebAuthn()) {
      return {
        message: "Passkeys require a secure (HTTPS) connection.",
        cancelled: false,
        reason: "insecure-context",
      };
    }
    return {
      message:
        "This site's address does not match the one your passkey was created for. Open the site at its usual address and try again.",
      cancelled: false,
      reason: "rp-mismatch",
    };
  }

  /* ── Relying-party configuration ──────────────────────────────────────
     The classic apex-vs-www mistake: a passkey made on sportsbnb.org will not
     be offered on www.sportsbnb.org unless the RP ID covers both. */
  if (code === "error_invalid_rp_id" || code === "error_invalid_domain") {
    return {
      message:
        "This site's address does not match the one your passkey was created for. Open the site at its usual address and try again.",
      cancelled: false,
      reason: "rp-mismatch",
    };
  }

  /* ── Server-side passkey states ───────────────────────────────────── */
  if (code === "passkey_disabled" || msg.includes("passkey") && msg.includes("not enabled")) {
    return {
      message: "Passkey sign-in is not available right now. Please use another sign-in method.",
      cancelled: false,
      reason: "server-disabled",
    };
  }
  if (code === "too_many_passkeys") {
    return {
      message: "You have reached the maximum number of passkeys for this account. Remove one and try again.",
      cancelled: false,
      reason: "too-many",
    };
  }
  if (
    code === "webauthn_credential_exists" ||
    code === "error_authenticator_previously_registered" ||
    domName === "InvalidStateError"
  ) {
    return {
      message: "This device already has a passkey for your account.",
      cancelled: false,
      reason: "already-registered",
    };
  }
  if (code === "webauthn_credential_not_found") {
    return {
      message:
        "That passkey is not registered to any account here. Sign in another way, then add a passkey from your security settings.",
      cancelled: false,
      reason: "no-credential",
    };
  }
  if (code === "webauthn_challenge_expired" || code === "webauthn_challenge_not_found") {
    return {
      message: "The passkey request expired. Please try again.",
      cancelled: false,
      reason: "challenge-expired",
    };
  }
  if (code === "webauthn_verification_failed") {
    return {
      message: "That passkey could not be verified. Please try again.",
      cancelled: false,
      reason: "verification-failed",
    };
  }
  if (code === "email_not_confirmed" || code === "phone_not_confirmed") {
    return {
      message: "Confirm your email address before using a passkey.",
      cancelled: false,
      reason: "needs-confirmed-contact",
    };
  }
  if (code === "over_request_rate_limit" || msg.includes("rate limit")) {
    return { message: "Too many attempts. Please try again later.", cancelled: false, reason: "rate-limited" };
  }

  /* ── Authenticator could not satisfy the request ──────────────────── */
  if (
    code === "error_authenticator_missing_discoverable_credential_support" ||
    code === "error_authenticator_missing_user_verification_support" ||
    code === "error_authenticator_no_supported_pubkeycredparams_alg" ||
    domName === "ConstraintError" ||
    domName === "NotSupportedError"
  ) {
    return {
      message:
        context === "register"
          ? "This device cannot store a passkey for this site. Try a different device or security key."
          : "This device cannot provide a passkey for this site. Try another sign-in method.",
      cancelled: false,
      reason: "unsupported",
    };
  }

  /* ── Transport ────────────────────────────────────────────────────── */
  if (
    msg.includes("failed to fetch") ||
    msg.includes("networkerror") ||
    msg.includes("network request failed")
  ) {
    return {
      message: "Could not reach the server. Check your connection and try again.",
      cancelled: false,
      reason: "network",
    };
  }

  return {
    message:
      context === "register"
        ? "Could not add that passkey. Please try again."
        : "Could not sign you in with a passkey. Please try again.",
    cancelled: false,
    reason: "unknown",
  };
};

/**
 * A label for a passkey the server did not name.
 *
 * Supabase derives a friendly name from the authenticator's AAGUID (for
 * example "iCloud Keychain"), but that is best-effort and often absent.
 */
export const passkeyLabel = (friendlyName?: string | null): string =>
  friendlyName?.trim() || "Passkey";
