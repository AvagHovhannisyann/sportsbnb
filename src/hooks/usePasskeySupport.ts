import { useEffect, useState } from "react";
import { useAuthProviders } from "@/hooks/useAuthProviders";
import { canUsePasskeys, hasPlatformAuthenticator } from "@/lib/passkeys";

export interface PasskeySupport {
  /**
   * Render passkey controls? True only when the browser can run a ceremony
   * *and* the project has passkeys enabled.
   *
   * Fails closed on both halves: an unknown server state (the settings request
   * errored) and an unknown browser state both resolve to `false`. A control
   * that is missing is a smaller harm than one that cannot work — the same
   * reasoning `useAuthProviders` applies to the OAuth buttons.
   */
  available: boolean;
  /** The browser exposes WebAuthn in a secure context. */
  browserCapable: boolean;
  /** The project has Authentication → Passkeys switched on. */
  serverEnabled: boolean;
  /**
   * A built-in authenticator (Touch ID / Windows Hello / screen lock) is
   * present. Advisory only — used to word the copy, never to gate the button,
   * because a security key or a nearby phone works without one.
   */
  platformAuthenticator: boolean;
  /** The async platform probe has settled. */
  ready: boolean;
}

/**
 * Whether to offer passkeys here, at all.
 *
 * The synchronous half (`canUsePasskeys`) is evaluated on first render so the
 * button does not flicker in and out; only the advisory platform-authenticator
 * probe is asynchronous.
 */
export const usePasskeySupport = (): PasskeySupport => {
  const { passkeys: serverEnabled } = useAuthProviders();
  const [browserCapable] = useState(() => canUsePasskeys());
  const [platformAuthenticator, setPlatformAuthenticator] = useState(false);
  const [ready, setReady] = useState(!browserCapable);

  useEffect(() => {
    if (!browserCapable) return;
    let active = true;
    void hasPlatformAuthenticator().then((has) => {
      if (!active) return;
      setPlatformAuthenticator(has);
      setReady(true);
    });
    return () => {
      active = false;
    };
  }, [browserCapable]);

  return {
    available: browserCapable && serverEnabled,
    browserCapable,
    serverEnabled,
    platformAuthenticator,
    ready,
  };
};
