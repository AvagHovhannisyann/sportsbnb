import { useState, useMemo, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { MotionProps, Variants } from "framer-motion";
import { transitionBase, transitionFast, transitionSlow } from "@/lib/motion";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, User, Building, Eye, EyeOff, Check, X, Mail, Lock, UserCircle, Users, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { useAuth } from "@/hooks/useAuth";
import { useAuthProviders } from "@/hooks/useAuthProviders";
import { getGenericAuthError } from "@/lib/authErrors";
import { safeRedirect } from "@/lib/redirect";
import authHero from "@/assets/auth-hero.jpg";

const signupSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(100, "Name is too long"),
  email: z.string().trim().email("Please enter a valid email address").max(255, "Email is too long"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

/* ──────────────────────────────────────────────────────────────────────
   Motion
   ─────
   Three jobs only, in the order a person meets them: the form arrives in
   reading order, each field answers as it is filled, and the two moments
   worth marking — the password reaching strength, and the confirmation
   matching — are the only places anything overshoots.

   Everything is opacity and transform. Nothing here animates a box's
   size, so no keystroke costs a layout pass, and the whole set is
   withheld outright under `prefers-reduced-motion` rather than
   shortened: `prefersReduced` collapses each props object to `{}`, and
   the element renders in its final state. The two things CSS drives
   from shared components — the strength bar's fill and the Button's
   press scale — are unreachable from here, so they are covered by the
   scoped stylesheet below.
────────────────────────────────────────────────────────────────────── */

/** 50ms between field entrances: enough to read as a sequence, not a queue. */
const FIELD_STAGGER_STEP = 0.05;
/**
 * Where the sequence stops lengthening. The form is eleven blocks tall,
 * and an uncapped stagger would still be introducing the legal line
 * three-quarters of a second after the heading landed — by which point
 * it reads as the page being slow rather than as an order to follow.
 * Capped, the tail arrives together and the whole entrance costs 400ms
 * no matter how many providers `useAuthProviders` turns on.
 */
const FIELD_STAGGER_CAP = 8;

/**
 * The brand link on the left panel animates as itself rather than inside a
 * wrapper. It is a flex item of a `justify-between` column, so a wrapping
 * div would take its place in that column and leave the anchor sized to its
 * own content instead of stretched — shrinking the hit area from the full
 * panel width to the wordmark. Nothing else animated here is a flex item,
 * so this is the only element that needs it.
 */
const MotionLink = motion.create(Link);

const blockVariants: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: (index: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      ...transitionSlow,
      delay: Math.min(index, FIELD_STAGGER_CAP) * FIELD_STAGGER_STEP,
    },
  }),
};

/**
 * Slight overshoot, reserved for the two confirmations. Mirrors
 * `--ease-spring` in index.css so the JS- and CSS-driven versions of
 * "this is now satisfied" settle identically.
 */
const easeSpring = [0.34, 1.56, 0.64, 1] as const;

/**
 * The reduced-motion answer to the two animations this page inherits
 * rather than declares.
 *
 * `Progress` transitions its indicator's translateX, and the shared
 * `Button` carries `active:scale-[0.98]`; neither takes a
 * `prefers-reduced-motion` escape, and neither file is this page's to
 * change. Scoped to the attributes below rather than written as a
 * blanket `button:active { transform: none }` — that would also flatten
 * the `-translate-y-1/2` centring the two password-visibility toggles
 * depend on, and drop them to the bottom of their inputs while pressed.
 */
const SIGNUP_MOTION_CSS = `
@media (prefers-reduced-motion: reduce) {
  [data-signup] [data-strength-meter] > * { transition: none; }
  [data-signup] [data-press]:active { transform: none; }
}
`;

const SignupPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  // Passed on from the login page's "Create one" link, so the venue or invite
  // someone was heading for survives the detour through account creation.
  // Validated, because it arrives in a URL — see src/lib/redirect.ts.
  const redirectTo = safeRedirect(searchParams.get("redirect"));
  const { user, isLoading: authLoading, signUp, signInWithOAuth } = useAuth();
  const providers = useAuthProviders();
  // Read before the `authLoading` early return, because that return is a
  // second exit from this component and hooks may not sit behind one.
  const prefersReduced = useReducedMotion();
  const [isLoading, setIsLoading] = useState(false);
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [userType, setUserType] = useState<"player" | "owner">("player");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  // Redirect if already authenticated (but not if we just signed up)
  useEffect(() => {
    if (!authLoading && user && !isSigningUp) {
      navigate(redirectTo ?? "/dashboard", { replace: true });
    }
  }, [user, authLoading, navigate, isSigningUp, redirectTo]);

  // Password strength calculation
  const passwordStrength = useMemo(() => {
    const password = formData.password;
    let score = 0;
    const checks = {
      length: password.length >= 8,
      lowercase: /[a-z]/.test(password),
      uppercase: /[A-Z]/.test(password),
      number: /[0-9]/.test(password),
      special: /[^a-zA-Z0-9]/.test(password),
    };

    if (checks.length) score += 20;
    if (checks.lowercase) score += 20;
    if (checks.uppercase) score += 20;
    if (checks.number) score += 20;
    if (checks.special) score += 20;

    return { score, checks };
  }, [formData.password]);

  const getStrengthLabel = (score: number) => {
    if (score === 0) return { label: "", color: "" };
    if (score <= 20) return { label: "Very Weak", color: "text-destructive" };
    if (score <= 40) return { label: "Weak", color: "text-orange-500" };
    if (score <= 60) return { label: "Fair", color: "text-yellow-500" };
    if (score <= 80) return { label: "Good", color: "text-primary/70" };
    return { label: "Strong", color: "text-primary" };
  };

  const validateField = (name: string, value: string) => {
    const newErrors = { ...errors };
    
    switch (name) {
      case "name":
        if (value.length < 2) {
          newErrors.name = "Name must be at least 2 characters";
        } else {
          delete newErrors.name;
        }
        break;
      case "email":
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          newErrors.email = "Please enter a valid email address";
        } else {
          delete newErrors.email;
        }
        break;
      case "password":
        if (value.length < 8) {
          newErrors.password = "Password must be at least 8 characters";
        } else {
          delete newErrors.password;
        }
        if (formData.confirmPassword && value !== formData.confirmPassword) {
          newErrors.confirmPassword = "Passwords don't match";
        } else if (formData.confirmPassword) {
          delete newErrors.confirmPassword;
        }
        break;
      case "confirmPassword":
        if (value !== formData.password) {
          newErrors.confirmPassword = "Passwords don't match";
        } else {
          delete newErrors.confirmPassword;
        }
        break;
    }
    
    setErrors(newErrors);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    validateField(name, value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate all fields
    const result = signupSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach(err => {
        if (err.path[0]) {
          fieldErrors[err.path[0] as string] = err.message;
        }
      });
      setErrors(fieldErrors);
      toast.error("Please fix the errors in the form");
      return;
    }

    setIsLoading(true);
    setIsSigningUp(true);
    
    const { error } = await signUp({
      email: formData.email.trim(),
      password: formData.password,
      fullName: formData.name.trim(),
      userType,
    });

    if (error) {
      toast.error(getGenericAuthError(error, 'signup'));
      setIsLoading(false);
      setIsSigningUp(false);
      return;
    }

    toast.success("Account created successfully!");
    // Redirect to appropriate page with replace to prevent back navigation issues
    if (userType === "player") {
      // Onboarding wins over `redirectTo` deliberately: a brand-new player
      // dropped straight onto a checkout has no profile, no city and no sports
      // yet, which several of the pages they might be heading for read. The
      // cost is that a signed-out invite link followed all the way through
      // account creation still loses its destination at this step — see §5 of
      // docs/handover.md, because carrying it through onboarding is a product
      // decision about what that flow is allowed to interrupt.
      navigate("/onboarding/player", { replace: true });
    } else {
      // Owners have no onboarding step, so nothing is in the way of honouring
      // where they were trying to go.
      navigate(redirectTo ?? "/owner-dashboard", { replace: true });
    }
    setIsLoading(false);
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    const { error } = await signInWithOAuth("google");

    if (error) {
      toast.error(getGenericAuthError(error, 'signup'));
      setIsLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    setIsLoading(true);
    const { error } = await signInWithOAuth("apple");

    if (error) {
      toast.error(getGenericAuthError(error, 'signup'));
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

  const strengthInfo = getStrengthLabel(passwordStrength.score);

  /** A block's place in the entrance sequence. See FIELD_STAGGER_CAP. */
  const blockMotion = (index: number): MotionProps =>
    prefersReduced
      ? {}
      : { variants: blockVariants, custom: index, initial: "hidden", animate: "visible" };

  /**
   * A field's error line. Keyed by field rather than by message text, so
   * correcting an email from one invalid form to another updates the
   * sentence in place instead of playing an exit and an entrance for a
   * line that never left.
   */
  const errorMotion: MotionProps = prefersReduced
    ? {}
    : {
        initial: { opacity: 0, y: -4 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -2 },
        transition: transitionBase,
      };

  /** The strength panel, which mounts on the first keystroke into the field. */
  const strengthPanelMotion: MotionProps = prefersReduced
    ? {}
    : {
        initial: { opacity: 0, y: -6 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0 },
        transition: transitionBase,
      };

  /**
   * Text replaced by other text in the same slot — the strength verdict,
   * the name label following the account type, the submit CTA.
   *
   * Applied to a keyed element and deliberately *not* wrapped in
   * `<AnimatePresence>`. A keyed remount swaps old for new in a single
   * commit, so the slot is occupied on every frame; an exit animation
   * would instead leave it empty for its duration, and all three of these
   * slots are load-bearing. The strength label's neighbour is
   * `flex-1`, so an empty slot lets the bar stretch and snap back. The
   * name label is an inline `<label>` with `leading-none`, so an empty
   * slot collapses its line box and jumps the input beneath it. The CTA
   * sits inside a fixed-height button, which would survive it — but one
   * rule for the three is better than an exception to remember.
   *
   * The outgoing text is simply gone; only the arriving text animates.
   * For feedback this reads as more decisive than a cross-fade anyway.
   */
  const swapMotion: MotionProps = prefersReduced
    ? {}
    : {
        initial: { opacity: 0, y: 4 },
        animate: { opacity: 1, y: 0 },
        transition: transitionFast,
      };

  /**
   * A requirement flipping between unmet and met. The overshoot is the
   * point: this is the only feedback the checklist gives, and a straight
   * fade between two 12px glyphs is invisible at this size.
   *
   * Keyed remount again, not an exit — this fires on a keystroke, and
   * shrinking the old glyph out before popping the new one in costs 400ms
   * round-trip, which someone typing at speed would outrun. The arriving
   * glyph alone keeps it at 200ms. `scale` is safe to leave unreserved
   * because transforms do not affect layout, so the row's text never
   * moves however small the icon gets mid-animation.
   */
  const tickMotion: MotionProps = prefersReduced
    ? {}
    : {
        initial: { opacity: 0, scale: 0.55 },
        animate: { opacity: 1, scale: 1 },
        transition: { duration: 0.2, ease: easeSpring },
      };

  /** The completion moment: the confirmation field agreeing with the password. */
  const matchMotion: MotionProps = prefersReduced
    ? {}
    : {
        initial: { opacity: 0, y: -4 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -2 },
        transition: transitionBase,
      };

  const matchTickMotion: MotionProps = prefersReduced
    ? {}
    : {
        initial: { opacity: 0, scale: 0.4 },
        animate: { opacity: 1, scale: 1 },
        transition: { duration: 0.25, ease: easeSpring, delay: 0.04 },
      };

  /**
   * Hover and press affordances are composed here rather than undone with
   * `motion-reduce:` utilities — those have to out-specify the class they
   * are cancelling, and two utilities of equal specificity are settled by
   * stylesheet order, not class order. Withholding the class is unambiguous.
   */
  const brandMarkClass = `h-10 w-10 object-contain drop-shadow-[0_4px_24px_rgba(22,163,74,0.45)]${
    prefersReduced ? "" : " transition-transform group-hover:scale-105"
  }`;

  const choiceCardClass = `flex flex-col items-center justify-center rounded-xl border-2 border-border-interactive bg-background p-4 hover:bg-accent/50 hover:border-primary/50 peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-background cursor-pointer transition-all${
    prefersReduced ? "" : " active:scale-[0.99]"
  }`;

  /** The requirement label's colour settles with the tick, not before it. */
  const requirementTextClass = (met: boolean) =>
    `${met ? "text-foreground" : "text-muted-foreground"}${
      prefersReduced ? "" : " transition-colors duration-200"
    }`;

  return (
    <div data-signup className="min-h-screen flex">
      <style dangerouslySetInnerHTML={{ __html: SIGNUP_MOTION_CSS }} />
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
          <MotionLink
            to="/"
            aria-label="Sportsbnb home"
            className="inline-flex items-center group"
            {...blockMotion(0)}
          >
            <img
              src="/favicon.png"
              alt="Sportsbnb"
              className={brandMarkClass}
            />
            <span className="ml-3 font-display text-xl font-bold text-white tracking-tight">Sportsbnb</span>
          </MotionLink>

          {/* Hero Text */}
          <motion.div className="max-w-lg" {...blockMotion(1)}>
            <h1 className="auth-hero-title text-white">
              Your game is<br />waiting for you.
            </h1>
            <p className="text-lg text-white/80 leading-relaxed">
              Find a court near you, join an open game, and pay for it in the app. No phone calls, no waiting on a reply.
            </p>
            
            {/* Trust Indicators */}
            <div className="flex items-center gap-6 mt-8">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                <span className="text-white/70 text-sm">Free to join</span>
              </div>
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <span className="text-white/70 text-sm">No card until you book</span>
              </div>
            </div>
          </motion.div>

          {/* Footer */}
          {/* /40 composited to #6c706e on this near-black panel: 3.81:1,
              under the 4.5:1 body copy needs. /50 measures 5.29:1 and is
              still far quieter than the headline above it. The same defect on
              the forgot- and reset-password panels was found and fixed
              earlier; these two were invisible to every audit here, because
              /login and /signup redirect to /dashboard under the stubbed
              signed-in session. */}
          <motion.div className="text-sm text-white/50" {...blockMotion(2)}>
            © {new Date().getFullYear()} Sportsbnb. All rights reserved.
          </motion.div>
        </div>
      </div>

      {/* Right Panel - Form Side */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10 lg:p-12 bg-background overflow-y-auto">
        <div className="w-full max-w-md py-8">
          {/* Mobile Logo */}
          <motion.div className="lg:hidden mb-8" {...blockMotion(0)}>
            <Link to="/" aria-label="Sportsbnb home" className="inline-flex items-center">
              <Logo variant="full" className="h-8 w-auto" />
            </Link>
          </motion.div>

          {/* Shares index 0 with the mobile logo above it: the two never
              appear together, so they are the same first beat at either size. */}
          <motion.div className="hidden lg:block mb-8" {...blockMotion(0)}>
            <Link
              to="/"
              className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to home
            </Link>
          </motion.div>

          {/* Welcome Header */}
          <motion.div className="mb-6" {...blockMotion(1)}>
            <h2 className="auth-form-title">Create your account</h2>
            <p className="text-muted-foreground">
              Free to join — no card needed until you book
            </p>
          </motion.div>

          {/* Form Card */}
          <div className="bg-card rounded-2xl border border-border/50 shadow-xl shadow-black/5 p-6 lg:p-8">
            {/* Third-party buttons render only when the project actually has
                that provider enabled — see useAuthProviders. */}
            {providers.google && (
            <motion.div {...blockMotion(2)}>
            <Button
              type="button"
              variant="outline"
              data-press
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
            </motion.div>
            )}

                {providers.apple && (
                <motion.div className={providers.google ? "mt-3" : ""} {...blockMotion(3)}>
                <Button
                  type="button"
                  variant="outline"
                  data-press
                  className="w-full h-12 text-base font-medium border-2 hover:bg-accent transition-all"
                  onClick={handleAppleSignIn}
                  disabled={isLoading}
                >
                  <svg className="h-5 w-5 mr-3" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                  </svg>
                  Continue with Apple
                </Button>
                </motion.div>
                )}

            {/* Divider only earns its place when something sits above it. */}
            {providers.anyOAuth && (
            <motion.div className="relative my-6" {...blockMotion(4)}>
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-card px-4 text-xs text-muted-foreground uppercase tracking-wider">
                  or sign up with email
                </span>
              </div>
            </motion.div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* User Type Selection */}
              <motion.div className="space-y-2" {...blockMotion(5)}>
                <Label className="text-sm font-medium">I want to</Label>
                <RadioGroup
                  value={userType}
                  onValueChange={(value) => setUserType(value as "player" | "owner")}
                  className="grid grid-cols-2 gap-3"
                >
                  {/* The radios are `peer sr-only` and these labels are the
                      visible control, so the focus ring the radio paints is
                      behind an opaque card and changes nothing on screen —
                      measured at 0 pixels with `:focus-visible` matching and a
                      composed 4px green box-shadow on the input. The card
                      already reacts to `peer-data-[state=checked]`; it has to
                      react to focus too, or tabbing to the first choice on the
                      signup form shows the user nothing. */}
                  <div>
                    <RadioGroupItem
                      value="player"
                      id="player"
                      className="peer sr-only"
                    />
                    <Label
                      htmlFor="player"
                      className={choiceCardClass}
                    >
                      <User className="h-6 w-6 mb-2 text-muted-foreground peer-data-[state=checked]:text-primary" />
                      <span className="font-medium text-sm">Play Sports</span>
                    </Label>
                  </div>
                  <div>
                    <RadioGroupItem
                      value="owner"
                      id="owner"
                      className="peer sr-only"
                    />
                    <Label
                      htmlFor="owner"
                      className={choiceCardClass}
                    >
                      <Building className="h-6 w-6 mb-2 text-muted-foreground peer-data-[state=checked]:text-primary" />
                      <span className="font-medium text-sm">List Venues</span>
                    </Label>
                  </div>
                </RadioGroup>
              </motion.div>

              <motion.div className="space-y-2" {...blockMotion(6)}>
                {/* The label follows the account type above it. Swapped rather
                    than replaced, so the choice visibly reaches this field
                    instead of the word changing between two blinks. */}
                <Label htmlFor="name" className="text-sm font-medium">
                  <motion.span key={userType} className="inline-block" {...swapMotion}>
                    {userType === "player" ? "Full name" : "Business name"}
                  </motion.span>
                </Label>
                <div className="relative">
                  <UserCircle className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    id="name"
                    autoComplete="name"
                    name="name"
                    type="text"
                    placeholder={userType === "player" ? "John Doe" : "My Sports Center"}
                    value={formData.name}
                    onChange={handleChange}
                    className={`h-12 pl-11 text-base border-2 transition-colors ${errors.name ? "border-destructive focus:border-destructive" : "focus:border-primary"}`}
                    required
                  />
                </div>
                <AnimatePresence initial={false}>
                  {errors.name ? (
                    <motion.p key="name-error" className="text-sm text-destructive" {...errorMotion}>
                      {errors.name}
                    </motion.p>
                  ) : null}
                </AnimatePresence>
              </motion.div>

              <motion.div className="space-y-2" {...blockMotion(7)}>
                <Label htmlFor="email" className="text-sm font-medium">Email address</Label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    value={formData.email}
                    onChange={handleChange}
                    className={`h-12 pl-11 text-base border-2 transition-colors ${errors.email ? "border-destructive focus:border-destructive" : "focus:border-primary"}`}
                    required
                  />
                </div>
                <AnimatePresence initial={false}>
                  {errors.email ? (
                    <motion.p key="email-error" className="text-sm text-destructive" {...errorMotion}>
                      {errors.email}
                    </motion.p>
                  ) : null}
                </AnimatePresence>
              </motion.div>

              <motion.div className="space-y-2" {...blockMotion(8)}>
                <Label htmlFor="password" className="text-sm font-medium">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    id="password"
                    autoComplete="new-password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Create a strong password"
                    value={formData.password}
                    onChange={handleChange}
                    className={`h-12 pl-11 pr-11 text-base border-2 transition-colors ${errors.password ? "border-destructive focus:border-destructive" : "focus:border-primary"}`}
                    required
                  />
                  {/* Named, like the identical toggle on ResetPasswordPage.
                      Both are icon-only buttons; that one carried an aria-label
                      because a11y-names could reach the page it lives on, and
                      this one did not because /signup redirects to /dashboard
                      under the stubbed session every audit here uses. Same
                      component, same defect, fixed only where it was visible. */}
                  <button
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    aria-pressed={showPassword}
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                {/* The page's progress indicator. The bar itself is already
                    transform-driven inside `Progress`; what is added here is
                    the verdict swapping in place and each requirement
                    answering the keystroke that satisfied it. */}
                <AnimatePresence initial={false}>
                  {formData.password ? (
                    <motion.div key="strength" className="space-y-2 pt-1" {...strengthPanelMotion}>
                      <div className="flex items-center gap-2">
                        <Progress data-strength-meter value={passwordStrength.score} className="h-1.5 flex-1" />
                        {strengthInfo.label ? (
                          <motion.span
                            key={strengthInfo.label}
                            className={`inline-block text-xs font-medium ${strengthInfo.color}`}
                            {...swapMotion}
                          >
                            {strengthInfo.label}
                          </motion.span>
                        ) : null}
                      </div>
                      <div className="grid grid-cols-2 gap-1 text-xs">
                        {[
                          { key: "length", label: "8+ characters" },
                          { key: "lowercase", label: "Lowercase" },
                          { key: "uppercase", label: "Uppercase" },
                          { key: "number", label: "Number" },
                        ].map(({ key, label }) => {
                          const met = passwordStrength.checks[key as keyof typeof passwordStrength.checks];
                          return (
                            <div key={key} className="flex items-center gap-1">
                              {/* `mode="wait"` and a fixed-size box: the two
                                  glyphs are the same 12px, so the row's text
                                  never shifts as they trade places. */}
                              <span className="inline-flex h-3 w-3 items-center justify-center">
                                <AnimatePresence mode="wait" initial={false}>
                                  <motion.span
                                    key={met ? "met" : "unmet"}
                                    className="inline-flex"
                                    {...tickMotion}
                                  >
                                    {met ? (
                                      <Check className="h-3 w-3 text-primary" />
                                    ) : (
                                      <X className="h-3 w-3 text-muted-foreground" />
                                    )}
                                  </motion.span>
                                </AnimatePresence>
                              </span>
                              <span className={requirementTextClass(met)}>
                                {label}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
                <AnimatePresence initial={false}>
                  {errors.password ? (
                    <motion.p key="password-error" className="text-sm text-destructive" {...errorMotion}>
                      {errors.password}
                    </motion.p>
                  ) : null}
                </AnimatePresence>
              </motion.div>

              <motion.div className="space-y-2" {...blockMotion(9)}>
                <Label htmlFor="confirmPassword" className="text-sm font-medium">Confirm password</Label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    autoComplete="new-password"
                    name="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirm your password"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className={`h-12 pl-11 pr-11 text-base border-2 transition-colors ${errors.confirmPassword ? "border-destructive focus:border-destructive" : "focus:border-primary"}`}
                    required
                  />
                  <button
                    aria-label={
                      showConfirmPassword ? "Hide password confirmation" : "Show password confirmation"
                    }
                    aria-pressed={showConfirmPassword}
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                <AnimatePresence initial={false}>
                  {errors.confirmPassword ? (
                    <motion.p key="confirm-error" className="text-sm text-destructive" {...errorMotion}>
                      {errors.confirmPassword}
                    </motion.p>
                  ) : null}
                </AnimatePresence>
                {/* The completion moment. This is the last thing standing
                    between the form and the submit button, so the tick lands
                    just after the line does — read the sentence, then see it
                    confirmed — and it is the only mark on the page that
                    overshoots. */}
                <AnimatePresence initial={false}>
                  {formData.confirmPassword && formData.password === formData.confirmPassword && !errors.confirmPassword ? (
                    <motion.p key="match" className="text-sm text-primary flex items-center gap-1" {...matchMotion}>
                      <motion.span className="inline-flex" {...matchTickMotion}>
                        <Check className="h-4 w-4" />
                      </motion.span>{" "}
                      Passwords match
                    </motion.p>
                  ) : null}
                </AnimatePresence>
              </motion.div>

              {/* `mt-2` rides on the wrapper, not the Button. It sat on the
                  Button when the Button was the form's direct child, where
                  `space-y-4`'s own margin-top out-specified it and won; moved
                  inside a wrapper it would stop competing and start adding,
                  pushing the CTA 8px further down than it has ever been. */}
              <motion.div className="mt-2" {...blockMotion(10)}>
              <Button
                type="submit"
                data-press
                className="w-full h-12 text-base font-medium shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all"
                size="lg"
                disabled={isLoading}
              >
                {/* The label swaps rather than cutting, so the button reads as
                    one control changing state instead of two labels. */}
                <motion.span key={isLoading ? "loading" : "idle"} {...swapMotion}>
                  {isLoading ? "Creating account..." : "Create account"}
                </motion.span>
              </Button>
              </motion.div>

              <motion.p className="text-xs text-center text-muted-foreground pt-2" {...blockMotion(11)}>
                By signing up, you agree to our{" "}
                <Link to="/terms" className="text-primary hover:underline">Terms</Link>
                {" "}and{" "}
                <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link>
              </motion.p>
            </form>
          </div>

          {/* Sign In Link */}
          <motion.p className="text-center text-muted-foreground mt-6" {...blockMotion(12)}>
            Already have an account?{" "}
            <Link
              to={redirectTo ? `/login?redirect=${encodeURIComponent(redirectTo)}` : "/login"}
              className="text-primary hover:underline font-semibold"
            >
              Sign in
            </Link>
          </motion.p>
        </div>
      </div>
    </div>
  );
};

export default SignupPage;
