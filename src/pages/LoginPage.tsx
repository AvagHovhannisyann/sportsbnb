import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation, useSearchParams } from "react-router-dom";
import {
  AnimatePresence,
  motion,
  useAnimationControls,
  useReducedMotion,
  type MotionProps,
  type Variants,
} from "framer-motion";
import { Logo } from "@/components/brand/Logo";
import { RemotionScene } from "@/remotion/RemotionScene";
import { useMediaQuery } from "@/remotion/useMediaQuery";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Shield, Mail, Lock, Users, Loader2, CheckCircle, ArrowRight, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { useAuth } from "@/hooks/useAuth";
import { useAuthProviders } from "@/hooks/useAuthProviders";
import { usePasskeySupport } from "@/hooks/usePasskeySupport";
import { getPasskeyFailure } from "@/lib/passkeys";
import { getGenericAuthError } from "@/lib/authErrors";
import { safeRedirect } from "@/lib/redirect";
import authHero from "@/assets/auth-hero.jpg";

type AuthMode = "password" | "magic-link";

/* ------------------------------------------------------------------
   Motion on this page has three jobs and no others: bring the form in
   in reading order, answer a focus, and answer a failure. Numbers are
   the app's own motion primitives from index.css (--ease-out-expo,
   --dur-*), restated as literals because framer-motion needs values
   rather than CSS variables.

   Everything below moves opacity and transform only, so nothing here
   can trigger layout while it runs, and every one of them is skipped
   outright when the visitor has asked for reduced motion.
------------------------------------------------------------------ */
const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1]; // --ease-out-expo
const EASE_SPRING: [number, number, number, number] = [0.34, 1.56, 0.64, 1]; // --ease-spring
const ENTER = 0.42; // an element arriving
const EXIT = 0.16; // an element leaving, always quicker than it arrived
const FEEDBACK = 0.28; // --dur-base-ish: the page answering an event
const STAGGER = 0.05; // 50ms between siblings

/*
 * Order in a reveal → its delay. Capped, because stagger is a reading cue
 * and not a queue: past the sixth sibling the extra delay stops describing
 * sequence and merely makes the tail arrive late. Nothing on this page is
 * that long today; the cap is here so nothing added later can be.
 */
const STAGGER_CAP = 6; // ⇒ 300ms, whatever the length
const step = (i: number) => Math.min(i, STAGGER_CAP) * STAGGER;

const reveal: Variants = {
  hidden: { opacity: 0, y: 14 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: ENTER, ease: EASE, delay: step(i) },
  }),
};

/*
 * Field affordance, one string so all three fields cannot drift apart: the
 * leading icon answers focus by taking the primary colour and growing a
 * tenth. `motion-safe:` guards the scale alone — under reduced motion the
 * colour cue, which is the half that carries the meaning, still lands.
 */
const FIELD_ICON =
  "absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground " +
  "transition-[color,transform] duration-200 group-focus-within:text-primary " +
  "motion-safe:group-focus-within:scale-110";

/* One gesture for "that did not work", used by every failure path so the
   form answers in a single voice rather than a different one per provider. */
const SHAKE = {
  x: [0, -8, 8, -6, 6, 0],
  transition: { duration: 0.3, ease: "easeInOut" as const },
};

const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  /**
   * The page the user was trying to reach, from either of the two ways the
   * app asks for one.
   *
   * Router state is what the route guards use. `?redirect=` is what
   * `BookingPanel` and `JoinTeamPage` use, and nothing read it — a signed-out
   * visitor pressing Reserve, or opening a team invite, was sent here and then
   * dropped on the dashboard, having lost the venue or the invite code.
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
  /* Hidden outright unless this browser can run a ceremony *and* the project
     has passkeys enabled — a "Sign in with a passkey" button that cannot
     produce a passkey prompt is worse than no button. */
  const passkeys = usePasskeySupport();
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

  /* ── Motion state ──────────────────────────────────────────────── */
  const prefersReduced = useReducedMotion();
  /* The brand panel is `hidden lg:flex` — CSS-hidden, which is not the same
     as unmounted. Without this gate every phone visiting /login would still
     mount the panel's subtree, fetch the player chunk and run a 1920×1080
     composition it will never see a pixel of. The breakpoint is Tailwind's
     `lg`, and has to stay in step with the class above. */
  const brandPanelVisible = useMediaQuery("(min-width: 1024px)");
  /* Two controls rather than one: the card and the OTP group are never
     mounted at the same time, and starting a control nothing is bound to
     is a no-op that logs. */
  const cardShake = useAnimationControls();
  const otpShake = useAnimationControls();
  /* Set the moment sign-in succeeds. The navigate that follows is awaited
     behind a profile fetch, so this fills that gap with a hand-off instead
     of a frozen form — it adds no delay of its own and defers to nothing. */
  const [handingOff, setHandingOff] = useState(false);

  const shake = (controls: typeof cardShake) => {
    if (prefersReduced) return;
    void controls.start(SHAKE);
  };

  /* Under reduced motion we render the final state outright rather than
     animating into it, so no content depends on an animation that never runs. */
  const enter = (i: number): MotionProps =>
    prefersReduced ? {} : { initial: "hidden", animate: "visible", variants: reveal, custom: i };

  /* The two secondary panels arrive as a unit — they are a change of subject,
     not a form being assembled, so they do not stagger internally. */
  const swap: MotionProps = prefersReduced
    ? {}
    : {
        initial: { opacity: 0, y: 10 },
        animate: { opacity: 1, y: 0, transition: { duration: ENTER, ease: EASE } },
        exit: { opacity: 0, y: -8, transition: { duration: EXIT, ease: "easeIn" } },
      };
  const swapOut: MotionProps = prefersReduced
    ? {}
    : { exit: { opacity: 0, y: -8, transition: { duration: EXIT, ease: "easeIn" } } };

  // Redirect if already authenticated.
  //
  // `redirectTo` here too: arriving at /login?redirect=/join-team/CODE with a
  // live session is the common case for an invite link opened in a tab that is
  // still signed in, and sending that to the dashboard threw the code away
  // just as thoroughly as the signed-out path did.
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
      toast.error(getGenericAuthError(error, 'login'));
      shake(cardShake);
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
      shake(cardShake);
      return;
    }

    setIsLoading(true);

    const { error } = await signInWithOtp(formData.email);

    if (error) {
      toast.error(getGenericAuthError(error, 'login'));
      shake(cardShake);
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
      shake(otpShake);
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
      shake(otpShake);
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
        navigate(profile.user_type === "owner" ? "/owner-dashboard" : "/onboarding/player", { replace: true });
        return;
      }
      // Honor the page the user was trying to reach before login.
      // `safeRedirect` already excludes /login and /signup, so a destination
      // that survives it cannot bounce back here.
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
      toast.error(getGenericAuthError(error, 'login'));
      shake(cardShake);
      setIsLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    setIsLoading(true);
    const { error } = await signInWithOAuth("apple");

    if (error) {
      toast.error(getGenericAuthError(error, 'login'));
      shake(cardShake);
      setIsLoading(false);
    }
  };

  /**
   * Sign in with a passkey.
   *
   * `signInWithPasskey` runs the whole ceremony — challenge,
   * navigator.credentials.get(), verification — and returns a session. It uses
   * discoverable credentials, so no email is collected first: the authenticator
   * resolves the account itself.
   *
   * The TOTP gate below deliberately mirrors the password path. A passkey is a
   * strong factor, but silently exempting it from a second factor the user
   * chose to enrol would turn this new button into a way around their own 2FA.
   */
  const handlePasskeySignIn = async () => {
    setIsLoading(true);
    const controller = new AbortController();

    try {
      const { data, error } = await signInWithPasskey(controller.signal);

      if (error) {
        const failure = getPasskeyFailure(error, "signin");
        // Dismissing the OS sheet is a choice, not a failure: no toast, no
        // shake, the form simply becomes usable again.
        if (!failure.cancelled) {
          toast.error(failure.message);
          shake(cardShake);
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
      // supabase-js throws rather than returning for non-AuthError faults, and
      // synchronously if the client lacks the experimental passkey flag.
      const failure = getPasskeyFailure(err, "signin");
      if (!failure.cancelled) {
        toast.error(failure.message);
        shake(cardShake);
      }
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
        {/* The panel's base layer: the `HeroBackdrop` Remotion composition
            running live on a seamless 6s loop, with the photograph as its
            fallback.

            Exactly one of the two renders. The photo is what a reduced-motion
            visitor sees, what shows while the player chunk is in flight, and
            what every viewport under 1024px would see if this panel were not
            already display:none there — so it keeps its `eager`/`high` fetch
            priority and its entrance.

            Scope is deliberate: this is the branded half of the page and the
            form opposite it is untouched. The plate carries no text of its
            own and never crosses into the form column.

            The scrims travel with the layer they exist for, and are inside
            this fallback rather than sitting above both. They are sized for a
            vivid daylight photograph — 85% black over the left third — and
            over the plate, whose base colour is already `--background`
            (160 22% 5%), they composite to flat black: the panel loses the
            photo and gains nothing, which is a worse page than either. Putting
            them in the fallback also means the loading and reduced-motion
            states are contrast-correct rather than momentarily under-scrimmed
            while the chunk lands. */}
        <RemotionScene
          name="HeroBackdrop"
          enabled={brandPanelVisible}
          fit="cover"
          className="absolute inset-0"
          fallback={
            <>
              {/* Background Image. The one element that scales: a photograph
                  settling into its frame, not a block of text sliding in. */}
              <motion.img
                src={authHero}
                alt="Athletes playing sports" loading="eager" fetchPriority="high" decoding="async"
                className="absolute inset-0 w-full h-full object-cover"
                {...(prefersReduced
                  ? {}
                  : {
                      initial: { opacity: 0, scale: 1.04 },
                      animate: { opacity: 1, scale: 1 },
                      transition: { duration: 0.5, ease: EASE },
                    })}
              />
              {/* Two-axis scrim. A uniform top-to-bottom veil (80/50/30)
                  covered the whole frame — including the middle, where the
                  photo is most legible — so a vivid sports shot read as flat
                  brown. All the text on this panel is left-aligned, so the
                  weight moves horizontally: the left third carries the copy
                  and stays dark, the right third keeps the image. The mild
                  bottom pass is only for the copyright. */}
              <div
                aria-hidden="true"
                className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/45 to-black/10"
              />
              <div
                aria-hidden="true"
                className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/25"
              />
            </>
          }
        />
        {/* The plate's counterpart to the two scrims above, and much lighter
            because it is doing much less work: the composition already carries
            an internal readability scrim and caps its own additive light, so
            this only has to hold the left column — where all the copy is —
            against the brightest thing that can drift through it. Weighted
            left for the same reason the photo's was, and transparent by the
            right edge so the plate stays visible where nothing is written over
            it. Rendered unconditionally: over the fallback it lands on top of
            an already-scrimmed photograph, which costs a shade of depth and
            never costs contrast.

            Measured on the built page rather than reasoned about — six samples
            across the 6s loop, each text weight scored against the *brightest*
            pixel anywhere under it (a court stroke at full primary green),
            which is the worst frame and the worst pixel of that frame:

              headline  white      7.14:1
              body      white/80   6.95:1
              copyright white/50   5.29:1

            All clear of the 4.5:1 AA floor for body text; the headline is
            large-scale and only needs 3:1. The copyright lands on exactly the
            5.29:1 recorded for it below, because nothing in the plate reaches
            that corner. */}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-r from-black/45 via-black/15 to-transparent"
        />
        
        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between p-10 lg:p-14 w-full">
          {/* Logo */}
          <motion.div {...enter(0)}>
            <Link to="/" aria-label="Sportsbnb home" className="inline-flex items-center group">
              <img
                src="/favicon.png"
                alt="Sportsbnb"
                className="h-10 w-10 object-contain transition-transform group-hover:scale-105 drop-shadow-[0_4px_24px_rgba(22,163,74,0.45)]"
              />
              <span className="ml-3 font-display text-xl font-bold text-white tracking-tight">Sportsbnb</span>
            </Link>
          </motion.div>

          {/* Hero Text */}
          <div className="max-w-lg">
            <motion.h1 className="auth-hero-title text-white" {...enter(1)}>
              Find your game.<br />Join your people.
            </motion.h1>
            <motion.p className="text-lg text-white/80 leading-relaxed" {...enter(2)}>
              Sportsbnb helps you discover venues, join open games, and stay active with your community.
            </motion.p>

            {/* Trust Indicators */}
            <div className="flex items-center gap-6 mt-8">
              <motion.div className="flex items-center gap-2" {...enter(3)}>
                <Users className="h-5 w-5 text-primary" />
                <span className="text-white/70 text-sm">Free to join</span>
              </motion.div>
              <motion.div className="flex items-center gap-2" {...enter(4)}>
                <Shield className="h-5 w-5 text-primary" />
                <span className="text-white/70 text-sm">Verified venues</span>
              </motion.div>
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
          <motion.div className="text-sm text-white/50" {...enter(5)}>
            © {new Date().getFullYear()} Sportsbnb. All rights reserved.
          </motion.div>
        </div>
      </div>

      {/* Right Panel - Form Side */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10 lg:p-16 bg-background">
        {/* The hand-off. On success the column eases back and lifts a little
            instead of sitting frozen until the route changes; it never fades
            out entirely, so a slow profile fetch cannot leave a blank panel. */}
        <motion.div
          className="w-full max-w-md"
          initial={false}
          animate={handingOff && !prefersReduced ? { opacity: 0.4, y: -8, scale: 0.99 } : { opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: FEEDBACK, ease: EASE }}
        >
        <AnimatePresence mode="wait">
          {/* Magic Link Sent State */}
          {magicLinkSent ? (
            <motion.div key="magic-sent" {...swap}>
              <button
                onClick={handleBackToLogin}
                className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors mb-10"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to login
              </button>

              <div className="text-center">
                {/* The one place a spring is earned: a confirmation landing. */}
                <motion.div
                  className="w-16 h-16 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-6"
                  {...(prefersReduced
                    ? {}
                    : {
                        initial: { opacity: 0, scale: 0.82 },
                        animate: { opacity: 1, scale: 1 },
                        transition: { duration: 0.36, ease: EASE_SPRING, delay: 0.08 },
                      })}
                >
                  <CheckCircle className="h-8 w-8 text-emerald-600" />
                </motion.div>
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
            </motion.div>
          ) : mfaRequired ? (
            <motion.div key="mfa" {...swap}>
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
                <motion.div className="flex justify-center" animate={otpShake}>
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
                </motion.div>

                <Button
                  onClick={handleMfaVerify}
                  className="w-full h-12 text-base font-medium shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all motion-safe:active:scale-[0.99]"
                  size="lg"
                  disabled={totpCode.length !== 6 || isVerifyingMfa}
                >
                  {isVerifyingMfa ? "Verifying..." : "Verify & Continue"}
                </Button>

                <p className="text-center text-sm text-muted-foreground">
                  Open your authenticator app to view your verification code
                </p>
              </div>
            </motion.div>
          ) : (
            <motion.div key="form" {...swapOut}>
              {/* Mobile Logo */}
              <motion.div className="lg:hidden mb-8" {...enter(0)}>
                <Link to="/" aria-label="Sportsbnb home" className="inline-flex items-center">
                  <Logo variant="full" className="h-8 w-auto" />
                </Link>
              </motion.div>

              {/* `lg:flex` on the wrapper rather than `lg:block`: a flex
                  container takes the link's exact height, where a block one
                  would add line-box leading and shift the header down. */}
              <motion.div className="hidden lg:flex mb-10" {...enter(0)}>
                <Link
                  to="/"
                  className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to home
                </Link>
              </motion.div>

              {/* Welcome Header */}
              <motion.div className="mb-8" {...enter(1)}>
                <h2 className="auth-form-title">Welcome back</h2>
                <p className="text-muted-foreground">
                  Sign in to continue your sports journey
                </p>
              </motion.div>

              {/* Form Card. Two layers on purpose: the outer one carries the
                  entrance, the inner one the failure shake, so neither has to
                  own an `animate` the other also wants. */}
              <motion.div {...enter(2)}>
              <motion.div
                className="bg-card rounded-2xl border border-border/50 shadow-xl shadow-black/5 p-8"
                animate={cardShake}
              >
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

                {/* Passkey Button — gated on usePasskeySupport, which requires
                    both a WebAuthn-capable secure context and the project's
                    own Passkeys toggle. Same shape as the OAuth buttons above
                    so the column reads as one set of choices. */}
                {passkeys.available && (
                <Button
                  type="button"
                  variant="outline"
                  className={`w-full h-12 text-base font-medium border-2 hover:bg-accent transition-all ${providers.anyOAuth ? "mt-3" : ""}`}
                  onClick={handlePasskeySignIn}
                  disabled={isLoading}
                >
                  <KeyRound className="h-5 w-5 mr-3" />
                  Sign in with a passkey
                </Button>
                )}

                {/* Magic Link Button — signInWithOtp only needs the email
                    provider, which is always on, so this is never gated. */}
                <Button
                  type="button"
                  variant="outline"
                  className={`w-full h-12 text-base font-medium border-2 hover:bg-accent transition-all ${providers.anyOAuth || passkeys.available ? "mt-3" : ""}`}
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
                      <div className="relative group">
                        <Mail className={FIELD_ICON} />
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
                      className="w-full h-12 text-base font-medium shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all motion-safe:active:scale-[0.99]"
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
                      <div className="relative group">
                        <Mail className={FIELD_ICON} />
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
                      <div className="relative group">
                        <Lock className={FIELD_ICON} />
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
                      className="w-full h-12 text-base font-medium shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all motion-safe:active:scale-[0.99]"
                      size="lg"
                      disabled={isLoading}
                    >
                      {isLoading ? "Signing in..." : "Sign in"}
                    </Button>
                  </form>
                )}
              </motion.div>
              </motion.div>

              {/* Sign Up Link */}
              <motion.p className="text-center text-muted-foreground mt-8" {...enter(3)}>
                Don't have an account?{" "}
                {/* Carries the destination across the hop. Someone who
                    followed a team invite and does not have an account yet
                    would otherwise lose the code right here, one click after
                    the login page was careful to keep it. */}
                <Link
                  to={redirectTo ? `/signup?redirect=${encodeURIComponent(redirectTo)}` : "/signup"}
                  className="text-primary hover:underline font-semibold"
                >
                  Create one
                </Link>
              </motion.p>
            </motion.div>
          )}
        </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
};

export default LoginPage;
