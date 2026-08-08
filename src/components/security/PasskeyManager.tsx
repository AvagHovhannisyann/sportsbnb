import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { KeyRound, Loader2, Trash2, Fingerprint, Info } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { usePasskeySupport } from "@/hooks/usePasskeySupport";
import { getPasskeyFailure, passkeyLabel } from "@/lib/passkeys";

interface Passkey {
  id: string;
  friendly_name?: string;
  created_at: string;
  last_used_at?: string;
}

const formatDate = (value?: string) => {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString();
};

/**
 * Passkey enrolment and management for a signed-in user.
 *
 * Renders nothing at all when the project has passkeys switched off — the
 * feature does not exist for this deployment, so advertising it would only
 * raise a question the user cannot act on. When the project has them on but
 * *this browser* cannot run a ceremony, the card explains why and shows no
 * button, rather than offering a control that is guaranteed to fail.
 */
const PasskeyManager = () => {
  const { registerPasskey, listPasskeys, deletePasskey } = useAuth();
  const { available, browserCapable, serverEnabled, platformAuthenticator } = usePasskeySupport();

  const [passkeys, setPasskeys] = useState<Passkey[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRegistering, setIsRegistering] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Passkey | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  /* One ceremony at a time, and none that outlives the component. A passkey
     prompt left pending after unmount would resolve into setState on a dead
     tree, and supabase-js would keep the shared abort signal held open. */
  const ceremony = useRef<AbortController | null>(null);
  useEffect(() => () => ceremony.current?.abort(), []);

  const refresh = useCallback(async () => {
    if (!available) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    const { data, error } = await listPasskeys();
    if (error) {
      // Not surfaced as a toast: an empty list and a failed list look the same
      // to the user here, and the card's own empty state already invites the
      // only useful next action.
      console.error("Could not list passkeys:", error.message);
      setPasskeys([]);
    } else {
      setPasskeys(data ?? []);
    }
    setIsLoading(false);
  }, [available, listPasskeys]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const handleRegister = async () => {
    setIsRegistering(true);
    ceremony.current?.abort();
    const controller = new AbortController();
    ceremony.current = controller;

    try {
      const { data, error } = await registerPasskey(controller.signal);

      if (error) {
        const failure = getPasskeyFailure(error, "register");
        // A dismissed prompt is a decision, not a fault. Say nothing.
        if (!failure.cancelled) toast.error(failure.message);
        return;
      }

      toast.success(`${passkeyLabel(data?.friendly_name)} added.`);
      await refresh();
    } catch (err) {
      // supabase-js throws (rather than returning) when the client was built
      // without experimental.passkey, and for anything non-AuthError.
      const failure = getPasskeyFailure(err, "register");
      if (!failure.cancelled) toast.error(failure.message);
    } finally {
      if (ceremony.current === controller) ceremony.current = null;
      setIsRegistering(false);
    }
  };

  const handleDelete = async () => {
    if (!pendingDelete) return;
    setIsDeleting(true);
    const { error } = await deletePasskey(pendingDelete.id);
    setIsDeleting(false);

    if (error) {
      toast.error("Could not remove that passkey. Please try again.");
      return;
    }
    toast.success("Passkey removed.");
    setPendingDelete(null);
    await refresh();
  };

  // The project does not have passkeys enabled — the feature is not available
  // to anyone here, so the card does not exist.
  if (!serverEnabled) return null;

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2">
                <KeyRound className={`h-5 w-5 ${passkeys.length > 0 ? "text-primary" : ""}`} />
                Passkeys
              </CardTitle>
              <CardDescription>
                Sign in with your fingerprint, face, screen lock, or a security key — no password to
                remember or leak.
              </CardDescription>
            </div>
            {passkeys.length > 0 && (
              <Badge variant="default" className="bg-primary">
                {passkeys.length} active
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Passkeys are on for the project, but this browser cannot run a
              ceremony. Explain, and offer no button that would only fail. */}
          {!browserCapable ? (
            <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/40 p-4">
              <Info className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                This browser cannot use passkeys. They need a current browser on a secure (HTTPS)
                connection — open Sportsbnb in Safari, Chrome, Edge, or Firefox to add one.
              </p>
            </div>
          ) : isLoading ? (
            <div className="flex items-center justify-center py-8" role="status" aria-label="Loading passkeys">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground motion-reduce:animate-none" aria-hidden="true" />
            </div>
          ) : passkeys.length > 0 ? (
            <>
              <ul className="divide-y divide-border rounded-lg border border-border bg-card">
                {passkeys.map((passkey) => {
                  const added = formatDate(passkey.created_at);
                  const used = formatDate(passkey.last_used_at);
                  return (
                    <li
                      key={passkey.id}
                      className="p-4"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                            <Fingerprint className="h-5 w-5 text-primary" />
                          </div>
                          <div className="min-w-0">
                            <div className="truncate font-medium text-foreground">
                              {passkeyLabel(passkey.friendly_name)}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {added ? `Added ${added}` : "Added recently"}
                              {used ? ` · Last used ${used}` : " · Not used yet"}
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="shrink-0"
                          onClick={() => setPendingDelete(passkey)}
                          aria-label={`Remove ${passkeyLabel(passkey.friendly_name)}`}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Remove
                        </Button>
                      </div>
                    </li>
                  );
                })}
              </ul>

              <Button variant="outline" onClick={handleRegister} disabled={isRegistering}>
                {isRegistering ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
                    Waiting for your device...
                  </>
                ) : (
                  <>
                    <KeyRound className="mr-2 h-4 w-4" />
                    Add another passkey
                  </>
                )}
              </Button>
            </>
          ) : (
            <div className="rounded-lg border border-dashed border-border p-6 text-center">
              <KeyRound className="mx-auto mb-3 h-12 w-12 text-muted-foreground/50" />
              <h3 className="mb-1 font-medium text-foreground">Add a passkey</h3>
              <p className="mb-4 text-sm text-muted-foreground">
                {platformAuthenticator
                  ? "Use this device's fingerprint, face, or screen lock to sign in — faster than a password and impossible to phish."
                  : "Use a security key, or your phone, to sign in — faster than a password and impossible to phish."}
              </p>
              <Button onClick={handleRegister} disabled={isRegistering}>
                {isRegistering ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
                    Waiting for your device...
                  </>
                ) : (
                  <>
                    <KeyRound className="mr-2 h-4 w-4" />
                    Add a passkey
                  </>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={pendingDelete !== null} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-destructive" />
              Remove this passkey?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete ? passkeyLabel(pendingDelete.friendly_name) : "This passkey"} will no
              longer sign you in. You can add it again at any time, and your other sign-in methods
              are unaffected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                // Keep the dialog up while the request is in flight; it closes
                // on success so a failure leaves the user where they were.
                e.preventDefault();
                void handleDelete();
              }}
              disabled={isDeleting}
              className="bg-destructive-solid text-destructive-foreground hover:bg-destructive-solid/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
                  Removing...
                </>
              ) : (
                "Yes, remove it"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default PasskeyManager;
