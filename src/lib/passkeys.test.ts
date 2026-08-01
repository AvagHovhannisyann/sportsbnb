import { describe, it, expect, afterEach, vi } from "vitest";
import {
  browserSupportsWebAuthn,
  canUsePasskeys,
  getPasskeyFailure,
  hasPlatformAuthenticator,
  isSecureContextForWebAuthn,
  passkeyLabel,
} from "./passkeys";

/**
 * jsdom has no WebAuthn, so the capability probes are driven by installing and
 * removing the two globals they read. Everything is restored afterwards so the
 * suite cannot leak a fake `PublicKeyCredential` into another file.
 */
const stubWebAuthn = (opts: { platform?: boolean; secure?: boolean } = {}) => {
  const { platform = true, secure = true } = opts;
  vi.stubGlobal("PublicKeyCredential", {
    isUserVerifyingPlatformAuthenticatorAvailable: () => Promise.resolve(platform),
  });
  vi.stubGlobal("isSecureContext", secure);
  Object.defineProperty(globalThis.navigator, "credentials", {
    value: { create: () => Promise.resolve(null), get: () => Promise.resolve(null) },
    configurable: true,
  });
};

afterEach(() => {
  vi.unstubAllGlobals();
  // @ts-expect-error — removing the property we defined above.
  delete globalThis.navigator.credentials;
});

/** A supabase-js WebAuthnError carries a `code`; DOMExceptions carry a `name`. */
const withCode = (code: string) => Object.assign(new Error("ceremony failed"), { code });
const withName = (name: string) => Object.assign(new Error("dom failure"), { name });
/** The passthrough case: real reason hangs off `cause`. */
const passthrough = (causeName: string) =>
  Object.assign(new Error("see cause"), {
    name: "WebAuthnError",
    code: "ERROR_PASSTHROUGH_SEE_CAUSE_PROPERTY",
    cause: withName(causeName),
  });

describe("capability detection", () => {
  it("reports no support when WebAuthn is absent (bare jsdom)", () => {
    expect(browserSupportsWebAuthn()).toBe(false);
    expect(canUsePasskeys()).toBe(false);
  });

  it("reports support once the API and a secure context are present", () => {
    stubWebAuthn();
    expect(browserSupportsWebAuthn()).toBe(true);
    expect(isSecureContextForWebAuthn()).toBe(true);
    expect(canUsePasskeys()).toBe(true);
  });

  it("refuses an insecure context even with the API present", () => {
    // WebAuthn is HTTPS/localhost only; offering the button over plain http
    // guarantees a failure the user cannot do anything about.
    stubWebAuthn({ secure: false });
    expect(browserSupportsWebAuthn()).toBe(true);
    expect(canUsePasskeys()).toBe(false);
  });

  it("detects a platform authenticator, and tolerates one that throws", async () => {
    stubWebAuthn({ platform: true });
    await expect(hasPlatformAuthenticator()).resolves.toBe(true);

    vi.stubGlobal("PublicKeyCredential", {
      isUserVerifyingPlatformAuthenticatorAvailable: () => {
        throw new Error("webview says no");
      },
    });
    // Some embedded webviews throw instead of resolving false. Advisory only,
    // so it must degrade rather than propagate.
    await expect(hasPlatformAuthenticator()).resolves.toBe(false);
  });
});

describe("getPasskeyFailure — cancellation is not a failure", () => {
  it("treats a dismissed prompt as cancelled, not an error", () => {
    stubWebAuthn();
    for (const err of [
      withCode("ERROR_CEREMONY_ABORTED"),
      withName("NotAllowedError"),
      withName("AbortError"),
      passthrough("NotAllowedError"),
    ]) {
      const failure = getPasskeyFailure(err, "signin");
      expect(failure.cancelled).toBe(true);
      expect(failure.reason).toBe("cancelled");
    }
  });

  it("treats a timeout as cancelled too, since WebAuthn reports both alike", () => {
    // The spec deliberately returns NotAllowedError for a timeout as well as a
    // dismissal, so that a site cannot probe whether a credential exists. The
    // two are therefore indistinguishable and must not produce a red toast.
    stubWebAuthn();
    expect(getPasskeyFailure(withName("TimeoutError"), "signin").cancelled).toBe(true);
  });
});

describe("getPasskeyFailure — ordinary failures get human wording", () => {
  it("explains an unsupported browser without blaming the user", () => {
    // No stub: WebAuthn genuinely absent.
    const failure = getPasskeyFailure(new Error("Browser does not support WebAuthn"), "signin");
    expect(failure.reason).toBe("unsupported");
    expect(failure.cancelled).toBe(false);
    expect(failure.message).toMatch(/does not support passkeys/i);
  });

  it("names an insecure context as the cause", () => {
    stubWebAuthn({ secure: false });
    const failure = getPasskeyFailure(withName("SecurityError"), "signin");
    expect(failure.reason).toBe("insecure-context");
    expect(failure.message).toMatch(/https/i);
  });

  it("catches the apex-vs-www relying party mistake", () => {
    stubWebAuthn();
    for (const err of [withCode("ERROR_INVALID_RP_ID"), withCode("ERROR_INVALID_DOMAIN")]) {
      const failure = getPasskeyFailure(err, "signin");
      expect(failure.reason).toBe("rp-mismatch");
      expect(failure.message).toMatch(/address/i);
    }
  });

  it("distinguishes a SecurityError on a secure page as an RP mismatch", () => {
    stubWebAuthn({ secure: true });
    expect(getPasskeyFailure(withName("SecurityError"), "signin").reason).toBe("rp-mismatch");
  });

  it("reports an unenrolled credential as such rather than as bad credentials", () => {
    stubWebAuthn();
    const failure = getPasskeyFailure(withCode("webauthn_credential_not_found"), "signin");
    expect(failure.reason).toBe("no-credential");
    expect(failure.message).toMatch(/not registered/i);
  });

  it("recognises a device that already holds a passkey during registration", () => {
    stubWebAuthn();
    for (const err of [
      withCode("webauthn_credential_exists"),
      withCode("ERROR_AUTHENTICATOR_PREVIOUSLY_REGISTERED"),
      withName("InvalidStateError"),
    ]) {
      expect(getPasskeyFailure(err, "register").reason).toBe("already-registered");
    }
  });

  it("reports an expired challenge as retryable", () => {
    stubWebAuthn();
    for (const code of ["webauthn_challenge_expired", "webauthn_challenge_not_found"]) {
      const failure = getPasskeyFailure(withCode(code), "signin");
      expect(failure.reason).toBe("challenge-expired");
      expect(failure.message).toMatch(/try again/i);
    }
  });

  it("reports the project having passkeys switched off", () => {
    stubWebAuthn();
    const failure = getPasskeyFailure(withCode("passkey_disabled"), "signin");
    expect(failure.reason).toBe("server-disabled");
    expect(failure.message).toMatch(/not available/i);
  });

  it("maps rate limiting and network faults to their own wording", () => {
    stubWebAuthn();
    expect(getPasskeyFailure(withCode("over_request_rate_limit"), "signin").reason).toBe(
      "rate-limited"
    );
    expect(getPasskeyFailure(new TypeError("Failed to fetch"), "signin").reason).toBe("network");
  });

  it("falls back to context-appropriate wording for an unknown fault", () => {
    stubWebAuthn();
    expect(getPasskeyFailure(withCode("something_new"), "register").message).toMatch(/add that passkey/i);
    expect(getPasskeyFailure(withCode("something_new"), "signin").message).toMatch(/sign you in/i);
  });

  it("never returns an empty message", () => {
    stubWebAuthn();
    for (const err of [null, undefined, {}, new Error(""), withCode("")]) {
      expect(getPasskeyFailure(err, "signin").message.length).toBeGreaterThan(0);
    }
  });
});

describe("passkeyLabel", () => {
  it("falls back when the server did not derive a name", () => {
    expect(passkeyLabel("iCloud Keychain")).toBe("iCloud Keychain");
    expect(passkeyLabel(undefined)).toBe("Passkey");
    expect(passkeyLabel(null)).toBe("Passkey");
    expect(passkeyLabel("   ")).toBe("Passkey");
  });
});
