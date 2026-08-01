import { useQuery } from "@tanstack/react-query";
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "@/integrations/supabase/client";

/**
 * Which third-party sign-in providers the Supabase project actually has
 * enabled.
 *
 * The login and signup pages were offering "Continue with Google" and
 * "Continue with Apple" as their two most prominent options while the project
 * had only `email` enabled. Clicking either called `signInWithOAuth`, got back
 * "Unsupported provider: provider is not enabled", and — because the shared
 * error mapper collapses every login failure to one message — told the user
 * "Invalid email or password" for credentials they had never typed.
 *
 * `/auth/v1/settings` is a public, unauthenticated GoTrue endpoint (it needs
 * only the publishable key, which already ships in the bundle) that reports
 * exactly this. Reading it means the buttons follow the backend: they stay
 * hidden until a provider is switched on in the dashboard, and appear on the
 * next load once it is, with no code change or redeploy.
 *
 * Fails closed. If the request errors, providers are treated as unavailable —
 * a missing button is a smaller harm than one that cannot work.
 */
export interface AuthProviders {
  google: boolean;
  apple: boolean;
  /** True when at least one third-party provider is usable. */
  anyOAuth: boolean;
  /**
   * Whether the project has Passkeys (Authentication → Passkeys) switched on.
   *
   * Reported by the same `/auth/v1/settings` payload as the OAuth providers, so
   * it costs no extra request and follows the backend exactly like they do: the
   * passkey controls stay hidden until the toggle is flipped in the dashboard,
   * and appear on the next load once it is — no code change, no redeploy.
   */
  passkeys: boolean;
}

const NONE: AuthProviders = { google: false, apple: false, anyOAuth: false, passkeys: false };

export const useAuthProviders = (): AuthProviders => {
  const { data } = useQuery({
    queryKey: ["auth-providers"],
    queryFn: async (): Promise<AuthProviders> => {
      // From the client module rather than `import.meta.env`, which is unset in
      // a build that was not given it — and the `return NONE` below then hides
      // the Google and Apple buttons on a site whose auth is working fine.
      const url = SUPABASE_URL;
      const key = SUPABASE_PUBLISHABLE_KEY;
      if (!url || !key) return NONE;

      const res = await fetch(`${url}/auth/v1/settings`, {
        headers: { apikey: key },
      });
      if (!res.ok) return NONE;

      const json = (await res.json()) as {
        external?: Record<string, boolean>;
        passkeys_enabled?: boolean;
      };
      const external = json.external ?? {};
      const google = external.google === true;
      const apple = external.apple === true;
      return {
        google,
        apple,
        anyOAuth: google || apple,
        passkeys: json.passkeys_enabled === true,
      };
    },
    // Provider configuration changes about as often as a deploy does.
    staleTime: 60 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    retry: 1,
  });

  return data ?? NONE;
};
