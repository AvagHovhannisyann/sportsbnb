import { useState } from "react";
import { format } from "date-fns";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Banknote,
  CircleAlert,
  Landmark,
  Loader2,
  PiggyBank,
  ReceiptText,
  Save,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import { ErrorPanel } from "@/components/common/StatusPanel";
import { OwnerLayout } from "@/components/owner/OwnerLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatAmd } from "@/features/booking/hooks/useBookingFlow";
import { ledgerEntryLabel } from "@/features/booking/ledger";
import { payoutStatusDescriptor } from "@/features/booking/payout";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { TONE_CHIP } from "@/lib/chips";
import { toast } from "sonner";

const LEDGER_DATE = "d MMM, HH:mm";
const PAYOUT_DATE = "d MMM yyyy";

const PAYOUT_TONE: Record<string, string> = {
  positive: TONE_CHIP.positive,
  warning: TONE_CHIP.warning,
  danger: TONE_CHIP.danger,
  neutral: TONE_CHIP.neutral,
};

export default function OwnerEarningsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [method, setMethod] = useState<"bank_transfer" | "idram">("bank_transfer");
  const [iban, setIban] = useState("");
  const [holder, setHolder] = useState("");

  const {
    data: balance,
    isLoading: balanceLoading,
    isError: balanceError,
    isFetching: balanceFetching,
    refetch: refetchBalance,
  } = useQuery({
    queryKey: ["owner-balance", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("owner_balances")
        .select("*")
        .eq("owner_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const {
    data: ledger,
    isLoading: ledgerLoading,
    isError: ledgerError,
    isFetching: ledgerFetching,
    refetch: refetchLedger,
  } = useQuery({
    queryKey: ["owner-ledger", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ledger_entries")
        .select("*")
        .eq("owner_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });

  const {
    data: payouts,
    isLoading: payoutsLoading,
    isError: payoutsError,
    isFetching: payoutsFetching,
    refetch: refetchPayouts,
  } = useQuery({
    queryKey: ["owner-payouts", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payouts")
        .select("*")
        .eq("owner_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
  });

  const {
    data: account,
    isLoading: accountLoading,
    isError: accountError,
    isFetching: accountFetching,
    refetch: refetchAccount,
  } = useQuery({
    queryKey: ["owner-payout-account", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("owner_payout_accounts")
        .select("*")
        .eq("owner_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      if (data) {
        const details = (data.details ?? {}) as Record<string, string>;
        setMethod((data.method as "bank_transfer" | "idram") ?? "bank_transfer");
        setIban(details.destination ?? "");
        setHolder(details.holder ?? "");
      }
      return data;
    },
  });

  const saveAccount = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("owner_payout_accounts").upsert({
        owner_id: user!.id,
        method,
        details: { destination: iban.trim(), holder: holder.trim() },
        updated_at: new Date().toISOString(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Payout details saved");
      queryClient.invalidateQueries({ queryKey: ["owner-payout-account", user?.id] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Failed to save"),
  });

  return (
    <OwnerLayout title="Earnings" subtitle="Review your ledger balance, payout destination, and transfer history.">
      <div className="max-w-6xl space-y-5">
        <div className="grid items-start gap-5 lg:grid-cols-[minmax(17rem,0.72fr)_minmax(0,1.6fr)]">
          <Card className="min-w-0">
            <CardHeader className="p-5 pb-3 sm:p-6 sm:pb-3">
              <CardDescription className="flex items-center gap-2">
                <PiggyBank aria-hidden="true" className="h-4 w-4" />
                Available ledger balance
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5 pt-0 sm:p-6 sm:pt-0">
              {balanceLoading ? (
                <div role="status" aria-label="Loading your balance">
                  <Skeleton className="h-10 w-40" />
                  <Skeleton className="mt-3 h-4 w-full" />
                </div>
              ) : balanceError ? (
                <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4">
                  <div className="flex items-start gap-2.5">
                    <CircleAlert aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
                    <div>
                      <p className="font-medium text-foreground">Balance unavailable</p>
                      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                        Your ledger has not been changed.
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    className="mt-4 w-full"
                    disabled={balanceFetching}
                    onClick={() => refetchBalance()}
                  >
                    {balanceFetching && (
                      <Loader2 aria-hidden="true" className="animate-spin motion-reduce:animate-none" />
                    )}
                    Try again
                  </Button>
                </div>
              ) : (
                <>
                  <p className="font-display text-3xl font-semibold tracking-extra-tight text-foreground tabular-nums sm:text-4xl">
                    {formatAmd(balance?.balance_minor ?? 0)}
                  </p>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                    Authorized payout runs may include balances of ֏10,000 or more. This screen does not promise a fixed run schedule.
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="min-w-0">
            <CardHeader className="p-5 pb-4 sm:p-6 sm:pb-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <CardTitle as="h2" className="flex items-center gap-2 text-lg">
                    {method === "idram" ? (
                      <Wallet aria-hidden="true" className="h-5 w-5 text-primary" />
                    ) : (
                      <Landmark aria-hidden="true" className="h-5 w-5 text-primary" />
                    )}
                    Payout destination
                  </CardTitle>
                  <CardDescription className="mt-1.5">
                    The destination snapshot used when an authorized payout is created.
                  </CardDescription>
                </div>
                {account?.verified ? (
                  <Badge variant="secondary" className={TONE_CHIP.positive}>
                    <ShieldCheck aria-hidden="true" className="mr-1 h-3.5 w-3.5" />
                    Verified
                  </Badge>
                ) : (
                  <Badge variant="secondary">Unverified</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-5 pt-0 sm:p-6 sm:pt-0">
              {accountLoading ? (
                <div className="grid gap-3 sm:grid-cols-3" role="status" aria-label="Loading your payout destination">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : accountError ? (
                <ErrorPanel
                  what="your payout destination"
                  description="Existing payout details are not being shown, so saving is paused to avoid overwriting them."
                  onRetry={() => refetchAccount()}
                  isRetrying={accountFetching}
                  className="py-8"
                />
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="payout-method">Method</Label>
                    <Select value={method} onValueChange={(value) => setMethod(value as "bank_transfer" | "idram")}>
                      <SelectTrigger id="payout-method">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bank_transfer">Bank transfer (IBAN)</SelectItem>
                        <SelectItem value="idram">Idram wallet</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="payout-destination">{method === "idram" ? "Idram ID" : "IBAN"}</Label>
                    <Input
                      id="payout-destination"
                      autoComplete="off"
                      value={iban}
                      onChange={(event) => setIban(event.target.value)}
                      placeholder={method === "idram" ? "1000…" : "AM…"}
                    />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2 lg:col-span-1">
                    <Label htmlFor="payout-holder">Account holder</Label>
                    <Input
                      id="payout-holder"
                      autoComplete="name"
                      value={holder}
                      onChange={(event) => setHolder(event.target.value)}
                      placeholder="Name Surname / LLC"
                    />
                  </div>

                  <div className="flex flex-col gap-3 border-t border-border pt-4 sm:col-span-2 sm:flex-row sm:items-center sm:justify-between lg:col-span-3">
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      Verification is recorded separately and may remain pending after you save details.
                    </p>
                    <Button
                      type="button"
                      className="w-full shrink-0 sm:w-auto"
                      onClick={() => saveAccount.mutate()}
                      disabled={saveAccount.isPending || !iban.trim()}
                      aria-busy={saveAccount.isPending}
                    >
                      {saveAccount.isPending ? (
                        <Loader2 aria-hidden="true" className="animate-spin motion-reduce:animate-none" />
                      ) : (
                        <Save aria-hidden="true" />
                      )}
                      {saveAccount.isPending ? "Saving…" : "Save destination"}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid items-start gap-5 lg:grid-cols-2">
          <Card className="min-w-0">
            <CardHeader className="p-5 pb-3 sm:p-6 sm:pb-3">
              <CardTitle as="h2" className="flex items-center gap-2 text-lg">
                <ReceiptText aria-hidden="true" className="h-5 w-5 text-primary" />
                Recent ledger activity
              </CardTitle>
              <CardDescription className="mt-1.5">The latest 50 balance entries.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {ledgerLoading ? (
                <div className="flex justify-center px-5 py-12" role="status" aria-label="Loading your transactions">
                  <Loader2
                    aria-hidden="true"
                    className="h-6 w-6 animate-spin text-primary motion-reduce:animate-none"
                  />
                </div>
              ) : ledgerError ? (
                <ErrorPanel
                  what="your transactions"
                  description="No ledger totals are inferred while the activity request is unavailable."
                  onRetry={() => refetchLedger()}
                  isRetrying={ledgerFetching}
                  className="py-10"
                />
              ) : !ledger || ledger.length === 0 ? (
                <div className="px-5 py-10 text-center">
                  <Banknote aria-hidden="true" className="mx-auto h-6 w-6 text-foreground-soft" />
                  <p className="mt-3 font-medium text-foreground">No ledger activity yet</p>
                  <p className="mx-auto mt-1 max-w-sm text-sm leading-relaxed text-muted-foreground">
                    Earnings appear after your first paid booking.
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="pl-5 sm:pl-6">Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="pr-5 text-right sm:pr-6">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ledger.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell className="whitespace-nowrap pl-5 text-muted-foreground sm:pl-6">
                          {format(new Date(entry.created_at), LEDGER_DATE)}
                        </TableCell>
                        <TableCell className="min-w-36">{ledgerEntryLabel(entry.entry_type)}</TableCell>
                        <TableCell
                          className={`whitespace-nowrap pr-5 text-right font-mono tabular-nums sm:pr-6 ${
                            entry.amount_minor < 0 ? "text-destructive" : "text-success"
                          }`}
                        >
                          {entry.amount_minor < 0 ? "−" : "+"}
                          {formatAmd(Math.abs(entry.amount_minor))}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card className="min-w-0">
            <CardHeader className="p-5 pb-3 sm:p-6 sm:pb-3">
              <CardTitle as="h2" className="flex items-center gap-2 text-lg">
                <Banknote aria-hidden="true" className="h-5 w-5 text-primary" />
                Payout history
              </CardTitle>
              <CardDescription className="mt-1.5">The latest 20 payout records.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {payoutsLoading ? (
                <div className="flex justify-center px-5 py-12" role="status" aria-label="Loading your payouts">
                  <Loader2
                    aria-hidden="true"
                    className="h-6 w-6 animate-spin text-primary motion-reduce:animate-none"
                  />
                </div>
              ) : payoutsError ? (
                <ErrorPanel
                  what="your payouts"
                  description="No transfer status is being inferred while payout history is unavailable."
                  onRetry={() => refetchPayouts()}
                  isRetrying={payoutsFetching}
                  className="py-10"
                />
              ) : !payouts || payouts.length === 0 ? (
                <div className="px-5 py-10 text-center">
                  <PiggyBank aria-hidden="true" className="mx-auto h-6 w-6 text-foreground-soft" />
                  <p className="mt-3 font-medium text-foreground">No payouts yet</p>
                  <p className="mx-auto mt-1 max-w-sm text-sm leading-relaxed text-muted-foreground">
                    Created payout records and their transfer status will appear here.
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="pl-5 sm:pl-6">Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="pr-5 text-right sm:pr-6">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payouts.map((payout) => {
                      const descriptor = payoutStatusDescriptor(payout.status);
                      return (
                        <TableRow key={payout.id}>
                          <TableCell className="whitespace-nowrap pl-5 text-muted-foreground sm:pl-6">
                            {format(new Date(payout.created_at), PAYOUT_DATE)}
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={PAYOUT_TONE[descriptor.tone]}
                              aria-label={descriptor.hint ? `${descriptor.label}. ${descriptor.hint}` : descriptor.label}
                            >
                              {descriptor.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="whitespace-nowrap pr-5 text-right font-mono tabular-nums sm:pr-6">
                            {formatAmd(payout.amount_minor)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </OwnerLayout>
  );
}
