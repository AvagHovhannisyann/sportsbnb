import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Shield, ShieldCheck, ShieldOff, Loader2, Copy, Check, Smartphone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

interface MFAFactor {
  id: string;
  friendly_name?: string;
  factor_type: string;
  status: string;
  created_at: string;
}

const TwoFactorAuth = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [factors, setFactors] = useState<MFAFactor[]>([]);
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [enrollmentData, setEnrollmentData] = useState<{
    id: string;
    qr_code: string;
    secret: string;
    uri: string;
  } | null>(null);
  const [verifyCode, setVerifyCode] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [showEnrollDialog, setShowEnrollDialog] = useState(false);
  const [showDisableDialog, setShowDisableDialog] = useState(false);
  const [factorToDisable, setFactorToDisable] = useState<string | null>(null);
  const [isDisabling, setIsDisabling] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchFactors();
  }, []);

  const fetchFactors = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (error) throw error;
      
      // Filter to only show verified TOTP factors
      const totpFactors = data.totp.filter(f => f.status === 'verified');
      setFactors(totpFactors as MFAFactor[]);
    } catch (error) {
      console.error("Error fetching MFA factors:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartEnrollment = async () => {
    setIsEnrolling(true);
    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: 'Authenticator App',
      });

      if (error) throw error;

      setEnrollmentData({
        id: data.id,
        qr_code: data.totp.qr_code,
        secret: data.totp.secret,
        uri: data.totp.uri,
      });
      setShowEnrollDialog(true);
    } catch (error: any) {
      console.error("Error starting MFA enrollment:", error);
      toast.error(error.message || "Failed to start 2FA setup");
    } finally {
      setIsEnrolling(false);
    }
  };

  const handleVerifyEnrollment = async () => {
    if (!enrollmentData || verifyCode.length !== 6) return;

    setIsVerifying(true);
    try {
      // First, create a challenge
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId: enrollmentData.id,
      });

      if (challengeError) throw challengeError;

      // Then verify the challenge
      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId: enrollmentData.id,
        challengeId: challengeData.id,
        code: verifyCode,
      });

      if (verifyError) throw verifyError;

      toast.success("Two-factor authentication enabled successfully!");
      setShowEnrollDialog(false);
      setEnrollmentData(null);
      setVerifyCode("");
      fetchFactors();
    } catch (error: any) {
      console.error("Error verifying MFA:", error);
      toast.error(error.message || "Invalid verification code. Please try again.");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleDisable2FA = async () => {
    if (!factorToDisable) return;

    setIsDisabling(true);
    try {
      const { error } = await supabase.auth.mfa.unenroll({
        factorId: factorToDisable,
      });

      if (error) throw error;

      toast.success("Two-factor authentication disabled");
      setShowDisableDialog(false);
      setFactorToDisable(null);
      fetchFactors();
    } catch (error: any) {
      console.error("Error disabling MFA:", error);
      toast.error(error.message || "Failed to disable 2FA");
    } finally {
      setIsDisabling(false);
    }
  };

  const copySecret = () => {
    if (enrollmentData?.secret) {
      navigator.clipboard.writeText(enrollmentData.secret);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success("Secret copied to clipboard");
    }
  };

  const handleCloseEnrollDialog = () => {
    // If we have enrollment data but haven't verified, we need to unenroll the pending factor
    if (enrollmentData) {
      supabase.auth.mfa.unenroll({ factorId: enrollmentData.id }).catch(console.error);
    }
    setShowEnrollDialog(false);
    setEnrollmentData(null);
    setVerifyCode("");
  };

  const is2FAEnabled = factors.length > 0;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle as="h2" className="flex items-center gap-2">
            <Shield className="h-5 w-5" aria-hidden="true" />
            Two-Factor Authentication
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8" role="status" aria-label="Loading">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground motion-reduce:animate-none" aria-hidden="true" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle as="h2" className="flex items-center gap-2">
                {is2FAEnabled ? (
                  <ShieldCheck className="h-5 w-5 text-primary" />
                ) : (
                  <Shield className="h-5 w-5" />
                )}
                Two-Factor Authentication
              </CardTitle>
              <CardDescription>
                Add an extra layer of security to your account using an authenticator app.
              </CardDescription>
            </div>
            {is2FAEnabled && (
              <Badge variant="default" className="bg-primary">
                Enabled
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {is2FAEnabled ? (
            <>
              <div className="rounded-lg border border-border bg-card p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Smartphone className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <div className="font-medium text-foreground">Authenticator App</div>
                      <div className="text-sm text-muted-foreground">
                        Added {new Date(factors[0].created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      setFactorToDisable(factors[0].id);
                      setShowDisableDialog(true);
                    }}
                  >
                    <ShieldOff className="h-4 w-4 mr-2" />
                    Disable
                  </Button>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Your account is protected with two-factor authentication. You'll need to enter a code from your authenticator app when signing in.
              </p>
            </>
          ) : (
            <>
              <div className="rounded-lg border border-dashed border-border p-6 text-center">
                <Shield className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
                <h3 className="font-medium text-foreground mb-1">Secure your account</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Two-factor authentication adds an extra layer of security by requiring a code from your phone in addition to your password.
                </p>
                <Button onClick={handleStartEnrollment} disabled={isEnrolling}>
                  {isEnrolling ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
                      Setting up...
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="h-4 w-4 mr-2" />
                      Enable 2FA
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Enrollment Dialog */}
      <Dialog open={showEnrollDialog} onOpenChange={(open) => !open && handleCloseEnrollDialog()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Set up Two-Factor Authentication</DialogTitle>
            <DialogDescription>
              Scan the QR code below with your authenticator app (like Google Authenticator, Authy, or 1Password).
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {/* QR Code */}
            {enrollmentData?.qr_code && (
              <div className="flex justify-center">
                <div className="p-4 bg-card rounded-lg border border-border">
                  <img 
                    src={enrollmentData.qr_code} 
                    alt="2FA QR Code" 
                    className="w-48 h-48"
                  />
                </div>
              </div>
            )}

            {/* Manual Entry */}
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">
                Or enter this code manually:
              </Label>
              <div className="flex items-center gap-2">
                <code className="flex-1 px-3 py-2 bg-muted rounded-md text-sm font-mono break-all">
                  {enrollmentData?.secret}
                </code>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={copySecret}
                  aria-label={copied ? "Authenticator secret copied" : "Copy authenticator secret"}
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-primary" aria-hidden="true" />
                  ) : (
                    <Copy className="h-4 w-4" aria-hidden="true" />
                  )}
                </Button>
              </div>
            </div>

            {/* Verification Code Input */}
            <div className="space-y-2">
              <Label>Enter the 6-digit code from your app:</Label>
              <div className="flex justify-center">
                <InputOTP 
                  maxLength={6} 
                  value={verifyCode}
                  onChange={setVerifyCode}
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
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseEnrollDialog}>
              Cancel
            </Button>
            <Button 
              onClick={handleVerifyEnrollment} 
              disabled={verifyCode.length !== 6 || isVerifying}
            >
              {isVerifying ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
                  Verifying...
                </>
              ) : (
                "Verify & Enable"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Disable 2FA Confirmation */}
      <AlertDialog open={showDisableDialog} onOpenChange={setShowDisableDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <ShieldOff className="h-5 w-5 text-destructive" />
              Disable Two-Factor Authentication?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the extra layer of security from your account. You'll only need your password to sign in. Are you sure you want to continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDisabling}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDisable2FA}
              disabled={isDisabling}
              className="bg-destructive-solid text-destructive-foreground hover:bg-destructive-solid/90"
            >
              {isDisabling ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
                  Disabling...
                </>
              ) : (
                "Yes, disable 2FA"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default TwoFactorAuth;
