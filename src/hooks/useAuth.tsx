import React, { useState, useEffect, createContext, useContext, ReactNode } from "react";
import { User, Session, AuthError } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface Profile {
  id: string;
  user_id: string;
  user_type: "player" | "owner";
  onboarding_completed: boolean;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  phone: string | null;
  email: string | null;
  city: string | null;
  date_of_birth: string | null;
  gender: string | null;
  preferred_sports: string[] | null;
  skill_level: string | null;
  business_name: string | null;
  venue_name: string | null;
  venue_address: string | null;
  sports_offered: string[] | null;
  venue_description: string | null;
  xp?: number;
  level?: number;
}

interface SignUpParams {
  email: string;
  password: string;
  fullName: string;
  userType: "player" | "owner";
}

/** Minimal profile slice used to decide where to send a user after login. */
interface OnboardingStatus {
  onboarding_completed: boolean;
  user_type: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  isLoading: boolean;
  /**
   * True while the profile row for the current user is still in flight.
   *
   * Distinct from `isLoading`, which only covers the *session*. The
   * onAuthStateChange path deliberately defers the profile fetch (calling
   * supabase inside that callback can deadlock) and releases `isLoading`
   * straight away, so there is a window where a user is authenticated and
   * `profile` is still null. Anything that authorizes on a profile field —
   * RequireRole reads `profile.user_type` — has to wait for this too, or it
   * decides against a null and bounces a legitimate owner.
   */
  isProfileLoading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  // Auth actions (wrap the supabase client; return { error } like supabase does)
  signInWithPassword: (
    email: string,
    password: string
  ) => ReturnType<typeof supabase.auth.signInWithPassword>;
  signInWithOtp: (email: string) => Promise<{ error: AuthError | null }>;
  signUp: (params: SignUpParams) => Promise<{ error: AuthError | null }>;
  signInWithOAuth: (
    provider: "google" | "apple"
  ) => ReturnType<typeof supabase.auth.signInWithOAuth>;
  resetPassword: (email: string) => Promise<{ error: AuthError | null }>;
  updatePassword: (password: string) => Promise<{ error: AuthError | null }>;
  getSession: () => ReturnType<typeof supabase.auth.getSession>;
  getUser: () => ReturnType<typeof supabase.auth.getUser>;
  listMfaFactors: () => ReturnType<typeof supabase.auth.mfa.listFactors>;
  challengeMfa: (factorId: string) => ReturnType<typeof supabase.auth.mfa.challenge>;
  verifyMfa: (params: {
    factorId: string;
    challengeId: string;
    code: string;
  }) => ReturnType<typeof supabase.auth.mfa.verify>;
  fetchOnboardingStatus: (userId: string) => Promise<OnboardingStatus | null>;
  /* ── Passkeys (WebAuthn) ──────────────────────────────────────────────
     Thin pass-throughs, exactly like the OAuth and MFA wrappers above: the
     ceremony itself lives in supabase-js. Callers must still gate on
     usePasskeySupport — these will reject rather than no-op on a browser or a
     project that cannot do passkeys. */
  registerPasskey: (
    signal?: AbortSignal
  ) => ReturnType<typeof supabase.auth.registerPasskey>;
  signInWithPasskey: (
    signal?: AbortSignal
  ) => ReturnType<typeof supabase.auth.signInWithPasskey>;
  listPasskeys: () => ReturnType<typeof supabase.auth.passkey.list>;
  deletePasskey: (passkeyId: string) => ReturnType<typeof supabase.auth.passkey.delete>;
  renamePasskey: (
    passkeyId: string,
    friendlyName: string
  ) => ReturnType<typeof supabase.auth.passkey.update>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProfileLoading, setIsProfileLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      console.error("Error fetching profile:", error);
      return null;
    }
    return data as Profile | null;
  };

  const refreshProfile = async () => {
    if (user) {
      const profileData = await fetchProfile(user.id);
      setProfile(profileData);
    }
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Defer profile fetch to avoid blocking: calling supabase from
          // inside this callback can deadlock. isProfileLoading covers the
          // gap this opens between "session known" and "profile known".
          setIsProfileLoading(true);
          setTimeout(async () => {
            const profileData = await fetchProfile(session.user.id);
            setProfile(profileData);
            setIsProfileLoading(false);
          }, 0);
        } else {
          setProfile(null);
          setIsProfileLoading(false);
        }
        
        setIsLoading(false);
      }
    );

    // THEN check current session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        const profileData = await fetchProfile(session.user.id);
        setProfile(profileData);
      }
      setIsProfileLoading(false);

      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
  };

  const signInWithPassword = (email: string, password: string) =>
    supabase.auth.signInWithPassword({ email, password });

  const signInWithOtp = async (email: string) => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    return { error };
  };

  const signUp = async ({ email, password, fullName, userType }: SignUpParams) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: {
          full_name: fullName,
          user_type: userType,
        },
      },
    });
    return { error };
  };

  const signInWithOAuth = (provider: "google" | "apple") =>
    supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    return { error };
  };

  const updatePassword = async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password });
    return { error };
  };

  const getSession = () => supabase.auth.getSession();

  const getUser = () => supabase.auth.getUser();

  const listMfaFactors = () => supabase.auth.mfa.listFactors();

  const challengeMfa = (factorId: string) => supabase.auth.mfa.challenge({ factorId });

  const verifyMfa = (params: { factorId: string; challengeId: string; code: string }) =>
    supabase.auth.mfa.verify(params);

  /* ── Passkeys (WebAuthn) ──────────────────────────────────────────────
     `registerPasskey` and `signInWithPasskey` each run the whole ceremony:
     fetch a challenge, call navigator.credentials, verify with the server.
     Both resolve to `{ data, error }` rather than throwing, with one exception
     — supabase-js throws synchronously if the client was built without
     `experimental.passkey`, which is why the client sets it.

     An AbortSignal is threaded through so a component that unmounts mid-prompt
     can cancel its own ceremony instead of leaving it pending; supabase-js
     otherwise installs a module-level signal shared by every caller. */
  const registerPasskey = (signal?: AbortSignal) =>
    supabase.auth.registerPasskey(signal ? { options: { signal } } : undefined);

  const signInWithPasskey = (signal?: AbortSignal) =>
    supabase.auth.signInWithPasskey(signal ? { options: { signal } } : undefined);

  const listPasskeys = () => supabase.auth.passkey.list();

  const deletePasskey = (passkeyId: string) => supabase.auth.passkey.delete({ passkeyId });

  const renamePasskey = (passkeyId: string, friendlyName: string) =>
    supabase.auth.passkey.update({ passkeyId, friendlyName });

  const fetchOnboardingStatus = async (userId: string): Promise<OnboardingStatus | null> => {
    const { data } = await supabase
      .from("profiles")
      .select("onboarding_completed, user_type")
      .eq("user_id", userId)
      .maybeSingle();
    return data;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        isLoading,
        isProfileLoading,
        signOut,
        refreshProfile,
        signInWithPassword,
        signInWithOtp,
        signUp,
        signInWithOAuth,
        resetPassword,
        updatePassword,
        getSession,
        getUser,
        listMfaFactors,
        challengeMfa,
        verifyMfa,
        fetchOnboardingStatus,
        registerPasskey,
        signInWithPasskey,
        listPasskeys,
        deletePasskey,
        renamePasskey,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
