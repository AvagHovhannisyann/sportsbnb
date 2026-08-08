import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  Building,
  Check,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  User,
  UserCircle,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { AuthDivider, AuthHeading, AuthPanel, AuthShell } from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useAuth } from "@/hooks/useAuth";
import { useAuthProviders } from "@/hooks/useAuthProviders";
import { getGenericAuthError } from "@/lib/authErrors";
import { safeRedirect } from "@/lib/redirect";

const signupSchema = z
  .object({
    name: z.string().trim().min(2, "Name must be at least 2 characters").max(100, "Name is too long"),
    email: z.string().trim().email("Please enter a valid email address").max(255, "Email is too long"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

const FIELD_ICON =
  "pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground transition-colors duration-150 group-focus-within:text-primary motion-reduce:transition-none";

const SignupPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  // Passed on from the login page's "Create one" link, so the venue or invite
  // someone was heading for survives the detour through account creation.
  const redirectTo = safeRedirect(searchParams.get("redirect"));
  const { user, isLoading: authLoading, signUp, signInWithOAuth } = useAuth();
  const providers = useAuthProviders();
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
    if (score <= 20) return { label: "Very weak", color: "text-destructive" };
    if (score <= 40) return { label: "Weak", color: "text-warning" };
    if (score <= 60) return { label: "Fair", color: "text-warning" };
    if (score <= 80) return { label: "Good", color: "text-primary" };
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
    setFormData((prev) => ({ ...prev, [name]: value }));
    validateField(name, value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate all fields
    const result = signupSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
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
      toast.error(getGenericAuthError(error, "signup"));
      setIsLoading(false);
      setIsSigningUp(false);
      return;
    }

    toast.success("Account created successfully!");
    // Redirect to appropriate page with replace to prevent back navigation issues
    if (userType === "player") {
      // Onboarding deliberately wins over redirect for a brand-new player.
      navigate("/onboarding/player", { replace: true });
    } else {
      navigate(redirectTo ?? "/owner-dashboard", { replace: true });
    }
    setIsLoading(false);
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    const { error } = await signInWithOAuth("google");

    if (error) {
      toast.error(getGenericAuthError(error, "signup"));
      setIsLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    setIsLoading(true);
    const { error } = await signInWithOAuth("apple");

    if (error) {
      toast.error(getGenericAuthError(error, "signup"));
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

  const strengthInfo = getStrengthLabel(passwordStrength.score);
  const passwordMatches =
    Boolean(formData.confirmPassword) &&
    formData.password === formData.confirmPassword &&
    !errors.confirmPassword;
  const choiceClass =
    "flex min-h-[5.25rem] cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-border-interactive bg-background p-3 text-center text-muted-foreground transition-[background-color,border-color,color,box-shadow] duration-150 hover:border-foreground/40 hover:bg-accent peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary-soft peer-data-[state=checked]:text-primary peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-background motion-reduce:transition-none";
  /* The semantic Radix control owns the full 44px target while the pseudo
     element keeps the familiar radio mark at 20px. The adjacent label carries
     the focus ring around the entire option card. */
  const radioControlClass =
    "peer absolute right-0 top-0 z-10 !h-11 !w-11 !border-0 !bg-transparent !shadow-none before:absolute before:inset-3 before:rounded-full before:border before:border-border-interactive after:inset-0 hover:before:border-foreground/40 focus-visible:!ring-0 focus-visible:!ring-offset-0 data-[state=checked]:before:border-primary [&>span]:absolute [&>span]:inset-0 [&>span]:items-center [&>span]:justify-center";

  return (
    <AuthShell
      asideTitle="Make more room for the sports you love."
      asideDescription="Join local games as a player or bring your venue online as an owner—without changing how bookings work."
      contentClassName="max-w-lg py-2 lg:py-6"
    >
      <section aria-labelledby="signup-heading">
        <AuthHeading id="signup-heading" title="Create your account" description="Choose how you will use Sportsbnb, then add your details." />

        <AuthPanel>
          {providers.anyOAuth && (
            <>
              <div className="space-y-3" aria-label="Alternative sign-up methods">
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
              </div>
              <AuthDivider>Or sign up with email</AuthDivider>
            </>
          )}

          <form onSubmit={handleSubmit} className="space-y-5" aria-labelledby="signup-heading">
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium text-foreground">I want to</legend>
              <RadioGroup
                value={userType}
                onValueChange={(value) => setUserType(value as "player" | "owner")}
                className="grid grid-cols-2 gap-3"
              >
                <div className="relative">
                  <RadioGroupItem
                    value="player"
                    id="player"
                    className={radioControlClass}
                  />
                  <Label htmlFor="player" className={choiceClass}>
                    <User aria-hidden="true" className="h-6 w-6 shrink-0" />
                    <span className="text-sm font-semibold">Play sports</span>
                  </Label>
                </div>
                <div className="relative">
                  <RadioGroupItem
                    value="owner"
                    id="owner"
                    className={radioControlClass}
                  />
                  <Label htmlFor="owner" className={choiceClass}>
                    <Building aria-hidden="true" className="h-6 w-6 shrink-0" />
                    <span className="text-sm font-semibold">List venues</span>
                  </Label>
                </div>
              </RadioGroup>
            </fieldset>

            <div className="space-y-2">
              <Label htmlFor="name">{userType === "player" ? "Full name" : "Business name"}</Label>
              <div className="group relative">
                <UserCircle aria-hidden="true" className={FIELD_ICON} />
                <Input
                  id="name"
                  autoComplete="name"
                  name="name"
                  type="text"
                  placeholder={userType === "player" ? "John Doe" : "My Sports Center"}
                  value={formData.name}
                  onChange={handleChange}
                  className="h-12 pl-11"
                  aria-invalid={Boolean(errors.name)}
                  aria-describedby={errors.name ? "name-error" : undefined}
                  required
                />
              </div>
              {errors.name && <p id="name-error" role="alert" className="text-sm text-destructive">{errors.name}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email address</Label>
              <div className="group relative">
                <Mail aria-hidden="true" className={FIELD_ICON} />
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  placeholder="you@example.com"
                  value={formData.email}
                  onChange={handleChange}
                  className="h-12 pl-11"
                  aria-invalid={Boolean(errors.email)}
                  aria-describedby={errors.email ? "email-error" : undefined}
                  required
                />
              </div>
              {errors.email && <p id="email-error" role="alert" className="text-sm text-destructive">{errors.email}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="group relative">
                <Lock aria-hidden="true" className={FIELD_ICON} />
                <Input
                  id="password"
                  autoComplete="new-password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="At least 8 characters"
                  value={formData.password}
                  onChange={handleChange}
                  className="h-12 px-11"
                  aria-invalid={Boolean(errors.password)}
                  aria-describedby={
                    errors.password
                      ? formData.password
                        ? "password-error password-strength"
                        : "password-error"
                      : formData.password
                        ? "password-strength"
                        : undefined
                  }
                  required
                />
                <button
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-0.5 top-1/2 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none"
                >
                  {showPassword ? <EyeOff aria-hidden="true" className="h-5 w-5" /> : <Eye aria-hidden="true" className="h-5 w-5" />}
                </button>
              </div>

              {formData.password && (
                <div id="password-strength" className="rounded-lg bg-surface-1 p-3" aria-live="polite">
                  <div className="flex items-center gap-3 text-sm">
                    <Progress value={passwordStrength.score} className="h-1.5 flex-1" />
                    <span className={`min-w-16 text-right font-medium ${strengthInfo.color}`}>{strengthInfo.label}</span>
                  </div>
                  <ul className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-xs" aria-label="Password requirements">
                    {[
                      { key: "length", label: "8+ characters" },
                      { key: "lowercase", label: "Lowercase letter" },
                      { key: "uppercase", label: "Uppercase letter" },
                      { key: "number", label: "Number" },
                    ].map(({ key, label }) => {
                      const met = passwordStrength.checks[key as keyof typeof passwordStrength.checks];
                      return (
                        <li key={key} className={met ? "flex items-center gap-1.5 text-foreground" : "flex items-center gap-1.5 text-muted-foreground"}>
                          {met ? <Check aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-primary" /> : <X aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />}
                          {label}
                          <span className="sr-only">{met ? "met" : "not met"}</span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
              {errors.password && <p id="password-error" role="alert" className="text-sm text-destructive">{errors.password}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm password</Label>
              <div className="group relative">
                <Lock aria-hidden="true" className={FIELD_ICON} />
                <Input
                  id="confirmPassword"
                  autoComplete="new-password"
                  name="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Enter it again"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="h-12 px-11"
                  aria-invalid={Boolean(errors.confirmPassword)}
                  aria-describedby={errors.confirmPassword ? "confirm-error" : passwordMatches ? "password-match" : undefined}
                  required
                />
                <button
                  aria-label={showConfirmPassword ? "Hide password confirmation" : "Show password confirmation"}
                  aria-pressed={showConfirmPassword}
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-0.5 top-1/2 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none"
                >
                  {showConfirmPassword ? <EyeOff aria-hidden="true" className="h-5 w-5" /> : <Eye aria-hidden="true" className="h-5 w-5" />}
                </button>
              </div>
              {errors.confirmPassword && <p id="confirm-error" role="alert" className="text-sm text-destructive">{errors.confirmPassword}</p>}
              {passwordMatches && (
                <p id="password-match" className="flex items-center gap-1.5 text-sm font-medium text-primary" role="status">
                  <Check aria-hidden="true" className="h-4 w-4" />
                  Passwords match
                </p>
              )}
            </div>

            <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 aria-hidden="true" className="animate-spin motion-reduce:animate-none" />
                  Creating account…
                </>
              ) : (
                "Create account"
              )}
            </Button>

            <div className="text-center text-xs leading-relaxed text-muted-foreground">
              <p>By signing up, you agree to our policies.</p>
              <div className="mt-1 flex items-center justify-center gap-2">
                <Link to="/terms" className="inline-flex min-h-11 min-w-11 items-center justify-center whitespace-nowrap rounded-md px-2 font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Terms</Link>
                <span aria-hidden="true">•</span>
                <Link to="/privacy" className="inline-flex min-h-11 items-center whitespace-nowrap rounded-md px-2 font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Privacy Policy</Link>
              </div>
            </div>
          </form>
        </AuthPanel>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link
            to={redirectTo ? `/login?redirect=${encodeURIComponent(redirectTo)}` : "/login"}
            className="inline-flex min-h-11 items-center rounded-md px-1 font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            Sign in
          </Link>
        </p>
      </section>
    </AuthShell>
  );
};

export default SignupPage;
