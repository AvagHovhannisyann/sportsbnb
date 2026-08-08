import React, { useState } from "react";
import { Check, Loader2, Eye, EyeOff, AlertTriangle } from "lucide-react";
import TwoFactorAuth from "@/components/security/TwoFactorAuth";
import PasskeyManager from "@/components/security/PasskeyManager";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useProfileSettings } from "./hooks/useProfileSettings";

const SecurityTab = () => {
  const { changePassword, isSavingPassword, signOutAllDevices, deleteAccount } = useProfileSettings();

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Password form state
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({});

  // Password strength calculation
  const passwordStrength = React.useMemo(() => {
    const password = passwordData.newPassword;
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
  }, [passwordData.newPassword]);

  const handleUpdatePassword = async () => {
    // Validate passwords
    const errors: Record<string, string> = {};

    if (!passwordData.currentPassword) {
      errors.currentPassword = "Current password is required";
    }
    if (passwordData.newPassword.length < 8) {
      errors.newPassword = "Password must be at least 8 characters";
    }
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      errors.confirmPassword = "Passwords don't match";
    }

    if (Object.keys(errors).length > 0) {
      setPasswordErrors(errors);
      return;
    }

    setPasswordErrors({});

    const result = await changePassword(passwordData.currentPassword, passwordData.newPassword);
    if (result.ok) {
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } else if (result.fieldErrors) {
      setPasswordErrors(result.fieldErrors);
    }
  };

  return (
    <>
      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle as="h2">Password</CardTitle>
          <CardDescription>
            Change your password to keep your account secure.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="currentPassword">Current Password</Label>
            <div className="relative">
              <Input
                id="currentPassword"
                type={showCurrentPassword ? "text" : "password"}
                placeholder="••••••••"
                value={passwordData.currentPassword}
                onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                aria-invalid={!!passwordErrors.currentPassword}
                aria-describedby={passwordErrors.currentPassword ? "current-password-error" : undefined}
                className={passwordErrors.currentPassword ? "border-destructive pr-10" : "pr-10"}
              />
              <button
                aria-label={showCurrentPassword ? "Hide current password" : "Show current password"}
                aria-pressed={showCurrentPassword}
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="focus-ring absolute right-0 top-0 flex h-11 w-11 items-center justify-center rounded-lg text-muted-foreground transition-colors duration-150 hover:text-foreground motion-reduce:transition-none"
              >
                {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {passwordErrors.currentPassword && (
              <p id="current-password-error" className="text-sm text-destructive" role="alert">{passwordErrors.currentPassword}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="newPassword">New Password</Label>
            <div className="relative">
              <Input
                id="newPassword"
                type={showNewPassword ? "text" : "password"}
                placeholder="••••••••"
                value={passwordData.newPassword}
                onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                aria-invalid={!!passwordErrors.newPassword}
                aria-describedby={passwordErrors.newPassword ? "new-password-error" : passwordData.newPassword ? "password-strength" : undefined}
                className={passwordErrors.newPassword ? "border-destructive pr-10" : "pr-10"}
              />
              <button
                aria-label={showNewPassword ? "Hide new password" : "Show new password"}
                aria-pressed={showNewPassword}
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="focus-ring absolute right-0 top-0 flex h-11 w-11 items-center justify-center rounded-lg text-muted-foreground transition-colors duration-150 hover:text-foreground motion-reduce:transition-none"
              >
                {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {passwordData.newPassword && (
              <div id="password-strength" className="space-y-2" aria-live="polite">
                <div className="flex items-center gap-2">
                  <Progress value={passwordStrength.score} className="h-2 flex-1" />
                  <span className={`text-xs font-medium ${passwordStrength.score >= 80 ? "text-primary" : passwordStrength.score >= 60 ? "text-warning" : "text-destructive"}`}>
                    {passwordStrength.score <= 20 ? "Very Weak" : passwordStrength.score <= 40 ? "Weak" : passwordStrength.score <= 60 ? "Fair" : passwordStrength.score <= 80 ? "Good" : "Strong"}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-1 text-xs">
                  {[
                    { key: "length", label: "8+ characters" },
                    { key: "lowercase", label: "Lowercase" },
                    { key: "uppercase", label: "Uppercase" },
                    { key: "number", label: "Number" },
                    { key: "special", label: "Special char" },
                  ].map(({ key, label }) => (
                    <div key={key} className="flex items-center gap-1">
                      {passwordStrength.checks[key as keyof typeof passwordStrength.checks] ? (
                        <Check className="h-3 w-3 text-primary" aria-hidden="true" />
                      ) : (
                        <span className="h-3 w-3 rounded-full border border-muted-foreground/30" />
                      )}
                      <span className={passwordStrength.checks[key as keyof typeof passwordStrength.checks] ? "text-foreground" : "text-muted-foreground"}>
                        {label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {passwordErrors.newPassword && (
              <p id="new-password-error" className="text-sm text-destructive" role="alert">{passwordErrors.newPassword}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm New Password</Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                placeholder="••••••••"
                value={passwordData.confirmPassword}
                onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                aria-invalid={!!passwordErrors.confirmPassword}
                aria-describedby={passwordErrors.confirmPassword ? "confirm-password-error" : undefined}
                className={passwordErrors.confirmPassword ? "border-destructive pr-10" : "pr-10"}
              />
              <button
                aria-label={showConfirmPassword ? "Hide confirmation password" : "Show confirmation password"}
                aria-pressed={showConfirmPassword}
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="focus-ring absolute right-0 top-0 flex h-11 w-11 items-center justify-center rounded-lg text-muted-foreground transition-colors duration-150 hover:text-foreground motion-reduce:transition-none"
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {passwordErrors.confirmPassword && (
              <p id="confirm-password-error" className="text-sm text-destructive" role="alert">{passwordErrors.confirmPassword}</p>
            )}
            {passwordData.confirmPassword && passwordData.newPassword === passwordData.confirmPassword && !passwordErrors.confirmPassword && (
              <p className="text-sm text-primary flex items-center gap-1">
                <Check className="h-4 w-4" aria-hidden="true" /> Passwords match
              </p>
            )}
          </div>
          <Button onClick={handleUpdatePassword} disabled={isSavingPassword}>
            {isSavingPassword ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
                Updating...
              </>
            ) : (
              "Update Password"
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Passkeys. Renders nothing when the project has them switched off. */}
      <PasskeyManager />

      {/* Two-Factor Authentication */}
      <TwoFactorAuth />

      <Card className="overflow-hidden border-destructive/25">
        <CardHeader>
          <CardTitle as="h2" className="text-destructive">Danger zone</CardTitle>
          <CardDescription>
            Irreversible and destructive actions.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <div className="font-medium text-foreground">Sign out of all devices</div>
              <div className="text-sm text-muted-foreground">
                This will sign you out from all devices including this one.
              </div>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline">Sign out all</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Sign out of all devices?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will sign you out from all devices, including this one. You'll need to sign in again.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={signOutAllDevices}>
                    Sign out all
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
          <Separator />
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <div className="font-medium text-foreground">Delete account</div>
              <div className="text-sm text-muted-foreground">
                Permanently delete your account and all data.
              </div>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">Delete account</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-destructive" aria-hidden="true" />
                    Delete your account?
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete your account and remove all your data from our servers.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={deleteAccount}
                    className="bg-destructive-solid text-destructive-foreground hover:bg-destructive-solid/90"
                  >
                    Yes, delete my account
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>
    </>
  );
};

export default SecurityTab;
