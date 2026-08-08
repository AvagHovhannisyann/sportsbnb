import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowRight, CheckCircle2, KeyRound, Loader2, Lock, Mail, Shield } from "lucide-react";
import { toast } from "sonner";

import { AuthDivider, AuthHeading, AuthPanel, AuthShell } from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { useAuthProviders } from "@/hooks/useAuthProviders";
import { usePasskeySupport } from "@/hooks/usePasskeySupport";
import { getGenericAuthError } from "@/lib/authErrors";
import { getPasskeyFailure } from "@/lib/passkeys";
import { safeRedirect } from "@/lib/redirect";

type AuthMode = "password" | "magic-link";

const FIELD_ICON =
  "pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground transition-colors duration-150 group-focus-within:text-primary motion-reduce:transition-none";

const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  /**
   * The page the user was trying to reach, from either of the two ways the
   * app asks for one.
   *
   * Both go through `safeRedirect`, because one of them arrives in a URL a
   * stranger can write. See src/lib/redirect.ts.
   */
  const redirectTo =
    safeRedirect(searchParams.get("redirect")) ??
    safeRedirect((location.state as { from?: { pathname?: string } } | null)?.from?.pathname);
  const {
    user,
    isLoading: authLoading,
    signInWithPassword,
    signInWithOtp,
    signInWithOAuth,
    signOut,
    getUser,
    listMfaFactors,
    challengeMfa,
    verifyMfa,
    signInWithPasskey,
    fetchOnboardingStatus,
  } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>("password");
  const providers = useAuthProviders();
  /* Hidden unless this browser can run a ceremony and the project has
     passkeys enabled. */
  const passkeys = usePasskeySupport();
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [mfaRequired, setMfaRequired] = useState(false);
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null);
  const [totpCode, setTotpCode] = useState("");
  const [isVerifyingMfa, setIsVerifyingMfa] = useState(false);
  const [handingOff, setHandingOff] = useState(false);
  const [feedbackTarget, setFeedbackTarget] = useState<"form" | "mfa" | null>(null);

  /* Failure feedback is immediate and static. Toast text carries the error;
     this short-lived ring anchors it to the affected panel without shaking
     the form or adding vestibular motion. */
  const cardFeedback = "form" as const;
  const otpFeedback = "mfa" as const;
  const shake = (target: typeof cardFeedback | typeof otpFeedback) => {
    setFeedbackTarget(target);
    window.setTimeout(() => {
      setFeedbackTarget((current) => (current === target ? null : current));
    }, 700);
  };

  // Redirect if already authenticated.
  useEffect(() => {
    if (!authLoading && user) {
      navigate(redirectTo ?? "/dashboard", { replace: true });
    }
  }, [user, authLoading, navigate, redirectTo]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const { data, error } = await signInWithPassword(formData.email, formData.password);

    if (error) {
      toast.error(getGenericAuthError(error, "login"));
      shake(cardFeedback);
      setIsLoading(false);
      return;
    }

    // Check if MFA is required
    const { data: factorsData } = await listMfaFactors();
    const verifiedFactors = factorsData?.totp?.filter((f) => f.status === "verified") || [];

    if (verifiedFactors.length > 0) {
      // MFA is enabled, need to verify
      setMfaFactorId(verifiedFactors[0].id);
      setMfaRequired(true);
      setIsLoading(false);
      return;
    }

    // No MFA, proceed with normal login
    await handleLoginSuccess(data.user?.id);
    setIsLoading(false);
  };

  const handleMagicLinkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email) {
      toast.error("Please enter your email address");
      shake(cardFeedback);
      return;
    }

    setIsLoading(true);

    const { error } = await signInWithOtp(formData.email);

    if (error) {
      toast.error(getGenericAuthError(error, "login"));
      shake(cardFeedback);
      setIsLoading(false);
      return;
    }

    setMagicLinkSent(true);
    setResendCooldown(30);
    setIsLoading(false);
    toast.success("Check your email for the login link!");
  };

  const handleResendMagicLink = async () => {
    if (resendCooldown > 0) return;

    setIsLoading(true);
    const { error } = await signInWithOtp(formData.email);

    if (error) {
      toast.error("Failed to resend. Please try again.");
    } else {
      setResendCooldown(30);
      toast.success("New link sent!");
    }
    setIsLoading(false);
  };

  const handleMfaVerify = async () => {
    if (!mfaFactorId || totpCode.length !== 6) return;

    setIsVerifyingMfa(true);

    const { data: challengeData, error: challengeError } = await challengeMfa(mfaFactorId);

    if (challengeError) {
      toast.error("Failed to create MFA challenge");
      shake(otpFeedback);
      setIsVerifyingMfa(false);
      return;
    }

    const { error: verifyError } = await verifyMfa({
      factorId: mfaFactorId,
      challengeId: challengeData.id,
      code: totpCode,
    });

    if (verifyError) {
      toast.error("Invalid verification code");
      shake(otpFeedback);
      setTotpCode("");
      setIsVerifyingMfa(false);
      return;
    }

    // MFA verified, proceed with login
    const { data: userData } = await getUser();
    await handleLoginSuccess(userData.user?.id);
    setIsVerifyingMfa(false);
  };

  const handleLoginSuccess = async (userId: string | undefined) => {
    setHandingOff(true);
    toast.success("Welcome back!");

    if (userId) {
      const profile = await fetchOnboardingStatus(userId);

      if (profile && !profile.onboarding_completed) {
        navigate(profile.user_type === "owner" ? "/owner-dashboard" : "/onboarding/player", {
          replace: true,
        });
        return;
      }
      if (redirectTo) {
        navigate(redirectTo, { replace: true });
        return;
      }
      if (profile?.user_type === "owner") {
        navigate("/owner-dashboard", { replace: true });
      } else {
        navigate("/dashboard", { replace: true });
      }
    } else {
      navigate(redirectTo ?? "/dashboard", { replace: true });
    }
  };

  const handleBackToLogin = () => {
    setMfaRequired(false);
    setMfaFactorId(null);
    setTotpCode("");
    setMagicLinkSent(false);
    signOut();
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    const { error } = await signInWithOAuth("google");

    if (error) {
      toast.error(getGenericAuthError(error, "login"));
      shake(cardFeedback);
      setIsLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    setIsLoading(true);
    const { error } = await signInWithOAuth("apple");

    if (error) {
      toast.error(getGenericAuthError(error, "login"));
      shake(cardFeedback);
      setIsLoading(false);
    }
  };

  /** Sign in with a discoverable passkey, then retain the existing TOTP gate. */
  const handlePasskeySignIn = async () => {
    setIsLoading(true);
    const controller = new AbortController();

    try {
      const { data, error } = await signInWithPasskey(controller.signal);

      if (error) {
        const failure = getPasskeyFailure(error, "signin");
        if (!failure.cancelled) {
          toast.error(failure.message);
          shake(cardFeedback);
        }
        setIsLoading(false);
        return;
      }

      const { data: factorsData } = await listMfaFactors();
      const verifiedFactors = factorsData?.totp?.filter((f) => f.status === "verified") || [];

      if (verifiedFactors.length > 0) {
        setMfaFactorId(verifiedFactors[0].id);
        setMfaRequired(true);
        setIsLoading(false);
        return;
      }

      await handleLoginSuccess(data?.user?.id);
      setIsLoading(false);
    } catch (err) {
      const failure = getPasskeyFailure(err, "signin");
      if (!failure.cancelled) {
        toast.error(failure.message);
        shake(cardFeedback);
      }
      setIsLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background" role="status" aria-live="polite">
        <Loader2 aria-hidden="true" className="h-7 w-7 animate-spin text-primary motion-reduce:animate-none" />
        <span className="sr-only">Checking your session</span>
      </div>
    );
  }

  return (
    <AuthShell
      asideTitle="Find a court. Join a game. Keep moving."
      asideDescription="Discover nearby sports venues and open games, then manage every booking from one clear place."
    >
      <div aria-busy={handingOff || undefined} className={handingOff ? "pointer-events-none opacity-60" : undefined}>
        {magicLinkSent ? (
          <section aria-labelledby="magic-link-heading">
            <AuthHeading
              id="magic-link-heading"
              title="Check your email"
              description="Your secure sign-in link is on its way."
            />
            <AuthPanel className="text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary-soft text-primary">
                <CheckCircle2 aria-hidden="true" className="h-7 w-7" />
              </div>
              <p className="mt-5 text-sm leading-relaxed text-muted-foreground" role="status" aria-live="polite">
                We sent a login link to
                <strong className="mt-1 block break-all font-semibold text-foreground">{formData.email}</strong>
              </p>
              <Button
                variant="outline"
                onClick={handleResendMagicLink}
                disabled={resendCooldown > 0 || isLoading}
                className="mt-6 w-full"
              >
                {resendCooldown > 0 ? (
                  `Resend in ${resendCooldown}s`
                ) : isLoading ? (
                  <>
                    <Loader2 aria-hidden="true" className="animate-spin motion-reduce:animate-none" />
                    Sending…
                  </>
                ) : (
                  "Resend link"
                )}
              </Button>
              <button
                type="button"
                onClick={handleBackToLogin}
                className="mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-lg text-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                Use another sign-in method
              </button>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                If it does not arrive, check your spam folder before requesting another link.
              </p>
            </AuthPanel>
          </section>
        ) : mfaRequired ? (
          <section aria-labelledby="mfa-heading">
            <AuthHeading
              id="mfa-heading"
              title="Two-factor authentication"
              description="Use the six-digit code from your authenticator app."
            />
            <AuthPanel className={feedbackTarget === "mfa" ? "ring-2 ring-destructive/40" : undefined}>
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
                  <Shield aria-hidden="true" className="h-5 w-5" />
                </div>
                <p id="mfa-heading" className="text-sm leading-relaxed text-muted-foreground">
                  Open your authenticator and enter the current code.
                </p>
              </div>
              <div className="flex justify-center" role="group" aria-labelledby="mfa-code-label">
                <span id="mfa-code-label" className="sr-only">Verification code</span>
                <InputOTP maxLength={6} value={totpCode} onChange={setTotpCode}>
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>
              <Button
                onClick={handleMfaVerify}
                className="mt-7 w-full"
                size="lg"
                disabled={totpCode.length !== 6 || isVerifyingMfa}
              >
                {isVerifyingMfa ? (
                  <>
                    <Loader2 aria-hidden="true" className="animate-spin motion-reduce:animate-none" />
                    Verifying…
                  </>
                ) : (
                  "Verify and continue"
                )}
              </Button>
              <button
                type="button"
                onClick={handleBackToLogin}
                className="mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                Back to sign in
              </button>
            </AuthPanel>
          </section>
        ) : (
          <section aria-labelledby="login-heading">
            <AuthHeading id="login-heading" title="Welcome back" description="Sign in to manage your games and bookings." />
            <AuthPanel className={feedbackTarget === "form" ? "ring-2 ring-destructive/40" : undefined}>
              {(providers.google || providers.apple || passkeys.available) && (
                <div className="space-y-3" aria-label="Alternative sign-in methods">
                  {providers.google && (
                    <Button type="button" variant="outline" size="lg" className="w-full" onClick={handleGoogleSignIn} disabled={isLoading}>
                      <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                      </svg>
                      Continue with Google
                    </Button>
                  )}
                  {providers.apple && (
                    <Button type="button" variant="outline" size="lg" className="w-full" onClick={handleAppleSignIn} disabled={isLoading}>
                      <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
                      </svg>
                      Continue with Apple
                    </Button>
                  )}
                  {passkeys.available && (
                    <Button type="button" variant="outline" size="lg" className="w-full" onClick={handlePasskeySignIn} disabled={isLoading}>
                      <KeyRound aria-hidden="true" />
                      Sign in with a passkey
                    </Button>
                  )}
                </div>
              )}

              {(providers.google || providers.apple || passkeys.available) && (
                <AuthDivider>{authMode === "password" ? "Or use your password" : "Or use email"}</AuthDivider>
              )}

              {authMode === "magic-link" ? (
                <form onSubmit={handleMagicLinkSubmit} className="space-y-5" aria-labelledby="login-heading">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email address</Label>
                    <div className="group relative">
                      <Mail aria-hidden="true" className={FIELD_ICON} />
                      <Input
                        id="email"
                        type="email"
                        autoComplete="email"
                        inputMode="email"
                        placeholder="you@example.com"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="h-12 pl-11"
                        required
                      />
                    </div>
                  </div>
                  <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 aria-hidden="true" className="animate-spin motion-reduce:animate-none" />
                        Sending link…
                      </>
                    ) : (
                      <>
                        Send magic link
                        <ArrowRight aria-hidden="true" />
                      </>
                    )}
                  </Button>
                  <button
                    type="button"
                    onClick={() => setAuthMode("password")}
                    className="inline-flex min-h-11 w-full items-center justify-center rounded-lg text-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    Sign in with password instead
                  </button>
                </form>
              ) : (
                <>
                  <form onSubmit={handleSubmit} className="space-y-5" aria-labelledby="login-heading">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email address</Label>
                      <div className="group relative">
                        <Mail aria-hidden="true" className={FIELD_ICON} />
                        <Input
                          id="email"
                          type="email"
                          autoComplete="email"
                          inputMode="email"
                          placeholder="you@example.com"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          className="h-12 pl-11"
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-3">
                        <Label htmlFor="password">Password</Label>
                        <Link
                          to="/forgot-password"
                          className="inline-flex min-h-11 items-center rounded-md text-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        >
                          Forgot password?
                        </Link>
                      </div>
                      <div className="group relative">
                        <Lock aria-hidden="true" className={FIELD_ICON} />
                        <Input
                          id="password"
                          type="password"
                          autoComplete="current-password"
                          placeholder="Enter your password"
                          value={formData.password}
                          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                          className="h-12 pl-11"
                          required
                        />
                      </div>
                    </div>
                    <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
                      {isLoading ? (
                        <>
                          <Loader2 aria-hidden="true" className="animate-spin motion-reduce:animate-none" />
                          Signing in…
                        </>
                      ) : (
                        "Sign in"
                      )}
                    </Button>
                  </form>
                  <button
                    type="button"
                    onClick={() => setAuthMode("magic-link")}
                    className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg text-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    disabled={isLoading}
                  >
                    <Mail aria-hidden="true" className="h-4 w-4" />
                    Email me a magic link
                  </button>
                </>
              )}
            </AuthPanel>

            <p className="mt-6 text-center text-sm text-muted-foreground">
              Do not have an account?{" "}
              <Link
                to={redirectTo ? `/signup?redirect=${encodeURIComponent(redirectTo)}` : "/signup"}
                className="inline-flex min-h-11 items-center rounded-md font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                Create one
              </Link>
            </p>
          </section>
        )}
      </div>
    </AuthShell>
  );
};

export default LoginPage;
