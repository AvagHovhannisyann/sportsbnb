import { useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, Loader2, Mail } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { AuthHeading, AuthPanel, AuthShell } from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";

const emailSchema = z.string().email("Please enter a valid email address");

const ForgotPasswordPage = () => {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isEmailSent, setIsEmailSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validate email
    const result = emailSchema.safeParse(email);
    if (!result.success) {
      setError(result.error.errors[0].message);
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await resetPassword(email);

      if (error) {
        throw error;
      }

      setIsEmailSent(true);
      toast.success("Password reset email sent!");
    } catch (error: any) {
      console.error("Error sending reset email:", error);
      // Don't reveal if email exists or not for security
      setIsEmailSent(true);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthShell
      asideTitle="A quick reset, then back to your game."
      asideDescription="Use the email linked to your account. We keep the response private whether or not an account is found."
      backTo="/login"
      backLabel="Back to sign in"
    >
      {isEmailSent ? (
        <section aria-labelledby="forgot-sent-heading">
          <AuthHeading id="forgot-sent-heading" title="Check your email" description="Reset instructions are on their way if the account exists." />
          <AuthPanel className="text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary-soft text-primary">
              <CheckCircle2 aria-hidden="true" className="h-7 w-7" />
            </div>
            <p className="mt-5 text-sm leading-relaxed text-muted-foreground" role="status" aria-live="polite">
              If an account exists with
              <strong className="mx-1 break-all font-semibold text-foreground">{email}</strong>
              you will receive a password reset link shortly.
            </p>
            <p className="mt-5 text-sm leading-relaxed text-muted-foreground">
              Check your spam folder first. You can also{" "}
              <button
                type="button"
                onClick={() => setIsEmailSent(false)}
                className="inline-flex min-h-11 items-center rounded-md font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                try another email
              </button>
              .
            </p>
            <Button asChild variant="outline" className="mt-5 w-full">
              <Link to="/login">Return to sign in</Link>
            </Button>
          </AuthPanel>
        </section>
      ) : (
        <section aria-labelledby="forgot-heading">
          <AuthHeading id="forgot-heading" title="Forgot your password?" description="Enter your email and we will send reset instructions." />
          <AuthPanel>
            <div className="mb-6 flex items-center gap-3 rounded-lg bg-surface-1 p-3 text-sm leading-relaxed text-muted-foreground">
              <Mail aria-hidden="true" className="h-5 w-5 shrink-0 text-primary" />
              The link expires for your security. You can request another if needed.
            </div>
            <form onSubmit={handleSubmit} className="space-y-5" aria-labelledby="forgot-heading">
              <div className="space-y-2">
                <Label htmlFor="email">Email address</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError("");
                  }}
                  className="h-12"
                  aria-invalid={Boolean(error)}
                  aria-describedby={error ? "forgot-email-error" : undefined}
                  required
                />
                {error && (
                  <p id="forgot-email-error" role="alert" className="text-sm text-destructive">
                    {error}
                  </p>
                )}
              </div>

              <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 aria-hidden="true" className="animate-spin motion-reduce:animate-none" />
                    Sending…
                  </>
                ) : (
                  "Send reset link"
                )}
              </Button>
            </form>
          </AuthPanel>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Remember your password?{" "}
            <Link
              to="/login"
              className="inline-flex min-h-11 items-center rounded-md px-1 font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Sign in
            </Link>
          </p>
        </section>
      )}
    </AuthShell>
  );
};

export default ForgotPasswordPage;
