import React, { useState, useEffect, createContext, useContext, ReactNode } from "react";
import { User, Session, AuthError } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";

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
  ) => ReturnType<typeof lovable.auth.signInWithOAuth>;
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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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
          // Defer profile fetch to avoid blocking
          setTimeout(async () => {
            const profileData = await fetchProfile(session.user.id);
            setProfile(profileData);
          }, 0);
        } else {
          setProfile(null);
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
    lovable.auth.signInWithOAuth(provider, {
      redirect_uri: window.location.origin,
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
