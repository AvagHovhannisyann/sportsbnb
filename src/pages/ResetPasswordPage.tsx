import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CheckCircle2, Eye, EyeOff, Loader2, Lock } from "lucide-react";
import { toast } from "sonner";

import { AuthHeading, AuthPanel, AuthShell } from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/hooks/useAuth";

const ResetPasswordPage = () => {
  const navigate = useNavigate();
  const { getSession, updatePassword, signOut } = useAuth();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Check if we have a valid session from the reset link
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await getSession();
      if (!session) {
        toast.error("Invalid or expired reset link");
        navigate("/forgot-password");
      }
    };
    checkSession();
    // getSession is intentionally omitted: this must run once on mount only.
    // Re-running after the post-success signOut would bounce the user to /forgot-password.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]);

  // Password strength calculation
  const passwordStrength = (() => {
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
  })();

  const getStrengthLabel = () => {
    if (passwordStrength.score <= 20) return "Very weak";
    if (passwordStrength.score <= 40) return "Weak";
    if (passwordStrength.score <= 60) return "Fair";
    if (passwordStrength.score <= 80) return "Good";
    return "Strong";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const newErrors: Record<string, string> = {};
    
    if (password.length < 8) {
      newErrors.password = "Password must be at least 8 characters";
    }
    if (password !== confirmPassword) {
      newErrors.confirmPassword = "Passwords don't match";
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      const { error } = await updatePassword(password);

      if (error) {
        throw error;
      }

      setIsSuccess(true);
      toast.success("Password updated successfully!");
      
      // Sign out and redirect to login after a delay
      setTimeout(async () => {
        await signOut();
        navigate("/login");
      }, 3000);
    } catch (error: any) {
      console.error("Error resetting password:", error);
      toast.error(error.message || "Failed to reset password");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthShell
      asideTitle="Set a strong password and get back on court."
      asideDescription="Your reset link establishes a temporary secure session. Sportsbnb keeps the account update focused and direct."
      backTo="/login"
      backLabel="Back to sign in"
    >
      {isSuccess ? (
        <section aria-labelledby="reset-success-heading">
          <AuthHeading id="reset-success-heading" title="Password updated" description="Your new password is ready to use." />
          <AuthPanel className="text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary-soft text-primary">
              <CheckCircle2 aria-hidden="true" className="h-7 w-7" />
            </div>
            <p className="mt-5 text-sm leading-relaxed text-muted-foreground" role="status" aria-live="polite">
              You will be signed out and redirected to sign in shortly.
            </p>
            <Button asChild className="mt-6 w-full">
              <Link to="/login">Go to sign in</Link>
            </Button>
          </AuthPanel>
        </section>
      ) : (
        <section aria-labelledby="reset-heading">
          <AuthHeading id="reset-heading" title="Set a new password" description="Use at least eight characters. A longer, unique phrase is easier to protect." />
          <AuthPanel>
            <div className="mb-6 flex items-center gap-3 rounded-lg bg-surface-1 p-3 text-sm leading-relaxed text-muted-foreground">
              <Lock aria-hidden="true" className="h-5 w-5 shrink-0 text-primary" />
              This change applies only to the account opened by your reset link.
            </div>

            <form onSubmit={handleSubmit} className="space-y-5" aria-labelledby="reset-heading">
              <div className="space-y-2">
                <Label htmlFor="password">New password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    autoComplete="new-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter new password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setErrors((prev) => ({ ...prev, password: "" }));
                    }}
                    className="h-12 pr-11"
                    aria-invalid={Boolean(errors.password)}
                    aria-describedby={
                      errors.password
                        ? password
                          ? "reset-password-error reset-password-strength"
                          : "reset-password-error"
                        : password
                          ? "reset-password-strength"
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
                {errors.password && (
                  <p id="reset-password-error" role="alert" className="text-sm text-destructive">{errors.password}</p>
                )}

                {password && (
                  <div id="reset-password-strength" className="rounded-lg bg-surface-1 p-3" aria-live="polite">
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="text-muted-foreground">Password strength</span>
                      <span className={passwordStrength.score >= 60 ? "font-medium text-primary" : "font-medium text-warning"}>
                        {getStrengthLabel()}
                      </span>
                    </div>
                    <Progress value={passwordStrength.score} className="mt-2 h-1.5" />
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm password</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    autoComplete="new-password"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Enter it again"
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      setErrors((prev) => ({ ...prev, confirmPassword: "" }));
                    }}
                    className="h-12 pr-11"
                    aria-invalid={Boolean(errors.confirmPassword)}
                    aria-describedby={errors.confirmPassword ? "reset-confirm-error" : undefined}
                    required
                  />
                  <button
                    aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                    aria-pressed={showConfirmPassword}
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-0.5 top-1/2 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none"
                  >
                    {showConfirmPassword ? <EyeOff aria-hidden="true" className="h-5 w-5" /> : <Eye aria-hidden="true" className="h-5 w-5" />}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p id="reset-confirm-error" role="alert" className="text-sm text-destructive">{errors.confirmPassword}</p>
                )}
              </div>

              <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 aria-hidden="true" className="animate-spin motion-reduce:animate-none" />
                    Updating…
                  </>
                ) : (
                  "Reset password"
                )}
              </Button>
            </form>
          </AuthPanel>
        </section>
      )}
    </AuthShell>
  );
};

export default ResetPasswordPage;
