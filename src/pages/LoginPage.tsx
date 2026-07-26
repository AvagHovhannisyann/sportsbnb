import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Shield, Mail, Lock, Users, Loader2, CheckCircle, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { useAuth } from "@/hooks/useAuth";
import { useAuthProviders } from "@/hooks/useAuthProviders";
import { getGenericAuthError } from "@/lib/authErrors";
import authHero from "@/assets/auth-hero.jpg";

type AuthMode = "password" | "magic-link";

const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname;
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
    fetchOnboardingStatus,
  } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>("password");
  const providers = useAuthProviders();
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [mfaRequired, setMfaRequired] = useState(false);
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null);
  const [totpCode, setTotpCode] = useState("");
  const [isVerifyingMfa, setIsVerifyingMfa] = useState(false);

  // Redirect if already authenticated
  useEffect(() => {
    if (!authLoading && user) {
      navigate("/dashboard", { replace: true });
    }
  }, [user, authLoading, navigate]);

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
      toast.error(getGenericAuthError(error, 'login'));
      setIsLoading(false);
      return;
    }

    // Check if MFA is required
    const { data: factorsData } = await listMfaFactors();
    const verifiedFactors = factorsData?.totp?.filter(f => f.status === 'verified') || [];
    
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
      return;
    }

    setIsLoading(true);

    const { error } = await signInWithOtp(formData.email);

    if (error) {
      toast.error(getGenericAuthError(error, 'login'));
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
    toast.success("Welcome back!");

    if (userId) {
      const profile = await fetchOnboardingStatus(userId);

      if (profile && !profile.onboarding_completed) {
        navigate(profile.user_type === "owner" ? "/owner-dashboard" : "/onboarding/player", { replace: true });
        return;
      }
      // Honor the page the user was trying to reach before login
      if (redirectTo && redirectTo !== "/login") {
        navigate(redirectTo, { replace: true });
        return;
      }
      if (profile?.user_type === "owner") {
        navigate("/owner-dashboard", { replace: true });
      } else {
        navigate("/dashboard", { replace: true });
      }
    } else {
      navigate(redirectTo && redirectTo !== "/login" ? redirectTo : "/dashboard", { replace: true });
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
      toast.error(getGenericAuthError(error, 'login'));
      setIsLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    setIsLoading(true);
    const { error } = await signInWithOAuth("apple");

    if (error) {
      toast.error(getGenericAuthError(error, 'login'));
      setIsLoading(false);
    }
  };

  // Show loading while checking auth state
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Emotional Brand Side */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        {/* Background Image */}
        <img
          src={authHero}
          alt="Athletes playing sports" loading="eager" fetchPriority="high" decoding="async"
          className="absolute inset-0 w-full h-full object-cover"
        />
        {/* Two-axis scrim. A uniform top-to-bottom veil (80/50/30) covered the
            whole frame — including the middle, where the photo is most
            legible — so a vivid sports shot read as flat brown. All the text
            on this panel is left-aligned, so the weight moves horizontally:
            the left third carries the copy and stays dark, the right third
            keeps the image. The mild bottom pass is only for the copyright. */}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/45 to-black/10"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/25"
        />
        
        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between p-10 lg:p-14 w-full">
          {/* Logo */}
          <Link to="/" aria-label="Sportsbnb home" className="inline-flex items-center group">
            <img
              src="/favicon.png"
              alt="Sportsbnb"
              className="h-10 w-10 object-contain transition-transform group-hover:scale-105 drop-shadow-[0_4px_24px_rgba(22,163,74,0.45)]"
            />
            <span className="ml-3 font-display text-xl font-bold text-white tracking-tight">Sportsbnb</span>
          </Link>
          
          {/* Hero Text */}
          <div className="max-w-lg">
            <h1 className="auth-hero-title text-white">
              Find your game.<br />Join your people.
            </h1>
            <p className="text-lg text-white/80 leading-relaxed">
              Sportsbnb helps you discover venues, join open games, and stay active with your community.
            </p>
            
            {/* Trust Indicators */}
            <div className="flex items-center gap-6 mt-8">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                <span className="text-white/70 text-sm">Free to join</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                <span className="text-white/70 text-sm">Verified venues</span>
              </div>
            </div>
          </div>
          
          {/* Footer */}
          {/* /40 composited to #6c706e on this near-black panel: 3.81:1,
              under the 4.5:1 body copy needs. /50 measures 5.29:1 and is
              still far quieter than the headline above it. The same defect on
              the forgot- and reset-password panels was found and fixed
              earlier; these two were invisible to every audit here, because
              /login and /signup redirect to /dashboard under the stubbed
              signed-in session. */}
          <div className="text-sm text-white/50">
            © {new Date().getFullYear()} Sportsbnb. All rights reserved.
          </div>
        </div>
      </div>

      {/* Right Panel - Form Side */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10 lg:p-16 bg-background">
        <div className="w-full max-w-md">
          {/* Magic Link Sent State */}
          {magicLinkSent ? (
            <>
              <button
                onClick={handleBackToLogin}
                className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors mb-10"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to login
              </button>

              <div className="text-center">
                <div className="w-16 h-16 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-6">
                  <CheckCircle className="h-8 w-8 text-emerald-600" />
                </div>
                <h2 className="auth-form-title">Check your email</h2>
                <p className="text-muted-foreground mb-6">
                  We sent a login link to<br />
                  <span className="font-medium text-foreground">{formData.email}</span>
                </p>

                <Button
                  variant="outline"
                  onClick={handleResendMagicLink}
                  disabled={resendCooldown > 0 || isLoading}
                  className="w-full"
                >
                  {resendCooldown > 0 ? (
                    `Resend in ${resendCooldown}s`
                  ) : isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    "Resend link"
                  )}
                </Button>

                <p className="text-sm text-muted-foreground mt-6">
                  Didn't receive it? Check your spam folder or try another email.
                </p>
              </div>
            </>
          ) : mfaRequired ? (
            <>
              <button
                onClick={handleBackToLogin}
                className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors mb-10"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to login
              </button>

              <div className="flex items-center gap-4 mb-8">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
                  <Shield className="h-7 w-7 text-primary" />
                </div>
                <div>
                  <h2 className="auth-form-title">Two-factor authentication</h2>
                  <p className="text-muted-foreground">Enter the code from your authenticator app</p>
                </div>
              </div>

              <div className="space-y-8">
                <div className="flex justify-center">
                  <InputOTP
                    maxLength={6}
                    value={totpCode}
                    onChange={setTotpCode}
                  >
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
                  className="w-full h-12 text-base font-medium shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all" 
                  size="lg" 
                  disabled={totpCode.length !== 6 || isVerifyingMfa}
                >
                  {isVerifyingMfa ? "Verifying..." : "Verify & Continue"}
                </Button>

                <p className="text-center text-sm text-muted-foreground">
                  Open your authenticator app to view your verification code
                </p>
              </div>
            </>
          ) : (
            <>
              {/* Mobile Logo */}
              <div className="lg:hidden mb-8">
                <Link to="/" aria-label="Sportsbnb home" className="inline-flex items-center">
                  <Logo variant="full" className="h-8 w-auto" />
                </Link>
              </div>

              <Link
                to="/"
                className="hidden lg:inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors mb-10"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to home
              </Link>

              {/* Welcome Header */}
              <div className="mb-8">
                <h2 className="auth-form-title">Welcome back</h2>
                <p className="text-muted-foreground">
                  Sign in to continue your sports journey
                </p>
              </div>

              {/* Form Card */}
              <div className="bg-card rounded-2xl border border-border/50 shadow-xl shadow-black/5 p-8">
                {/* Third-party buttons render only when the project actually
                    has that provider enabled — see useAuthProviders. */}
                {providers.google && (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-12 text-base font-medium border-2 hover:bg-accent transition-all"
                  onClick={handleGoogleSignIn}
                  disabled={isLoading}
                >
                  <svg className="h-5 w-5 mr-3" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  Continue with Google
                </Button>
                )}

                {providers.apple && (
                <Button
                  type="button"
                  variant="outline"
                  className={`w-full h-12 text-base font-medium border-2 hover:bg-accent transition-all ${providers.google ? "mt-3" : ""}`}
                  onClick={handleAppleSignIn}
                  disabled={isLoading}
                >
                  <svg className="h-5 w-5 mr-3" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                  </svg>
                  Continue with Apple
                </Button>
                )}

                {/* Magic Link Button — signInWithOtp only needs the email
                    provider, which is always on, so this is never gated. */}
                <Button
                  type="button"
                  variant="outline"
                  className={`w-full h-12 text-base font-medium border-2 hover:bg-accent transition-all ${providers.anyOAuth ? "mt-3" : ""}`}
                  onClick={() => setAuthMode("magic-link")}
                  disabled={isLoading}
                >
                  <Mail className="h-5 w-5 mr-3" />
                  Send Magic Link
                </Button>

                {/* Divider */}
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center">
                    <span className="bg-card px-4 text-xs text-muted-foreground uppercase tracking-wider">
                      or sign in with password
                    </span>
                  </div>
                </div>

                {authMode === "magic-link" ? (
                  <form onSubmit={handleMagicLinkSubmit} className="space-y-5">
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-sm font-medium">Email address</Label>
                      <div className="relative">
                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <Input
                          id="email"
                          type="email"
                          autoComplete="email"
                          placeholder="you@example.com"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          className="h-12 pl-11 text-base border-2 focus:border-primary transition-colors"
                          required
                        />
                      </div>
                    </div>

                    <Button 
                      type="submit" 
                      className="w-full h-12 text-base font-medium shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all" 
                      size="lg" 
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Sending link...
                        </>
                      ) : (
                        <>
                          Send magic link
                          <ArrowRight className="h-4 w-4 ml-2" />
                        </>
                      )}
                    </Button>

                    <button
                      type="button"
                      onClick={() => setAuthMode("password")}
                      className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Sign in with password instead
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-sm font-medium">Email address</Label>
                      <div className="relative">
                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <Input
                          id="email"
                          type="email"
                          autoComplete="email"
                          placeholder="you@example.com"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          className="h-12 pl-11 text-base border-2 focus:border-primary transition-colors"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="password" className="text-sm font-medium">Password</Label>
                        <Link to="/forgot-password" className="text-sm text-primary hover:underline font-medium">
                          Forgot password?
                        </Link>
                      </div>
                      <div className="relative">
                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <Input
                          id="password"
                          type="password"
                          autoComplete="current-password"
                          placeholder="Enter your password"
                          value={formData.password}
                          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                          className="h-12 pl-11 text-base border-2 focus:border-primary transition-colors"
                          required
                        />
                      </div>
                    </div>

                    <Button 
                      type="submit" 
                      className="w-full h-12 text-base font-medium shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all" 
                      size="lg" 
                      disabled={isLoading}
                    >
                      {isLoading ? "Signing in..." : "Sign in"}
                    </Button>
                  </form>
                )}
              </div>

              {/* Sign Up Link */}
              <p className="text-center text-muted-foreground mt-8">
                Don't have an account?{" "}
                <Link to="/signup" className="text-primary hover:underline font-semibold">
                  Create one
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
