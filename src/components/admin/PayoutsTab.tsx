import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Banknote, Download, Landmark, Loader2, Play, ReceiptText } from "lucide-react";
import { ErrorPanel, StatusPanel } from "@/components/common/StatusPanel";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatAmd } from "@/features/booking/hooks/useBookingFlow";
import { payoutStatusDescriptor } from "@/features/booking/payout";
import { supabase } from "@/integrations/supabase/client";
import { TONE_CHIP } from "@/lib/chips";
import { toast } from "sonner";

interface PayoutRow {
  id: string;
  owner_id: string;
  amount_minor: number;
  currency: string;
  status: string;
  method: string | null;
  destination_snapshot: Record<string, string> | null;
  reference: string | null;
  created_at: string;
}

type PayoutConfirmation =
  | { kind: "run" }
  | { kind: "mark-paid"; payout: PayoutRow }
  | { kind: "mark-failed"; payout: PayoutRow }
  | null;

const TONE_CLASS: Record<string, string> = {
  positive: TONE_CHIP.positive,
  warning: TONE_CHIP.warning,
  danger: TONE_CHIP.danger,
  neutral: TONE_CHIP.neutral,
};

const payoutDestination = (payout: PayoutRow) => ({
  method: payout.method === "idram" ? "Idram" : "IBAN",
  destination: payout.destination_snapshot?.destination ?? "Not available",
  holder: payout.destination_snapshot?.holder ?? payout.owner_id.slice(0, 8),
});

const PayoutStatus = ({ payout }: { payout: PayoutRow }) => {
  const descriptor = payoutStatusDescriptor(payout.status);
  return (
    <div>
      <Badge
        variant="outline"
        className={TONE_CLASS[descriptor.tone] ?? TONE_CHIP.neutral}
        title={descriptor.hint}
      >
        {descriptor.label}
      </Badge>
      {payout.reference && (
        <p className="mt-1 break-all text-xs text-muted-foreground">Reference: {payout.reference}</p>
      )}
    </div>
  );
};

const SummaryCard = ({
  label,
  value,
  detail,
  loading,
}: {
  label: string;
  value: string;
  detail: string;
  loading: boolean;
}) => (
  <Card className="min-w-0">
    <CardContent className="p-4 sm:p-5">
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      {loading ? (
        <Skeleton className="mt-2 h-7 w-36" />
      ) : (
        <p className="stat-numeral mt-2 break-words text-2xl font-semibold leading-tight text-foreground">
          {value}
        </p>
      )}
      <p className="mt-1 text-xs leading-4 text-muted-foreground">{detail}</p>
    </CardContent>
  </Card>
);

/** Admin payout operations: run batches, export for the bank, confirm transfers. */
const PayoutsTab = () => {
  const queryClient = useQueryClient();
  const [references, setReferences] = useState<Record<string, string>>({});
  const [confirmation, setConfirmation] = useState<PayoutConfirmation>(null);

  const payoutsQuery = useQuery({
    queryKey: ["admin-payouts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payouts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data as PayoutRow[];
    },
  });

  const balancesQuery = useQuery({
    queryKey: ["admin-owner-balances"],
    queryFn: async () => {
      const { data, error } = await supabase.from("owner_balances").select("*");
      if (error) throw error;
      return data;
    },
  });

  const runAction = useMutation({
    mutationFn: async (body: { action: string; payoutId?: string; reference?: string }) => {
      const { data, error } = await supabase.functions.invoke("payouts-run", { body });
      if (error) throw error;
      return data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["admin-payouts"] });
      queryClient.invalidateQueries({ queryKey: ["admin-owner-balances"] });
      if (variables.action === "run") {
        toast.success(`${data.created?.length ?? 0} payout(s) created`);
      } else {
        toast.success("Payout updated");
      }
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Payout operation failed"),
  });

  const exportCsv = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("payouts-run", {
        body: { action: "export" },
      });
      if (error) throw error;
      const rows: Array<Record<string, string>> = data.payouts ?? [];
      if (rows.length === 0) {
        toast.info("No pending payouts to export");
        return;
      }
      const header = Object.keys(rows[0]).join(",");
      const csv = [
        header,
        ...rows.map((row) =>
          Object.values(row)
            .map((value) => `"${String(value).replace(/"/g, '""')}"`)
            .join(","),
        ),
      ].join("\n");
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `payouts-${format(new Date(), "yyyy-MM-dd")}.csv`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Export failed");
    }
  };

  const payouts = payoutsQuery.data ?? [];
  const balances = balancesQuery.data ?? [];
  const totalOwed = balances.reduce(
    (sum, balance) => sum + Math.max(0, balance.balance_minor ?? 0),
    0,
  );
  const pendingTotal = payouts
    .filter((payout) => payout.status === "pending")
    .reduce((sum, payout) => sum + payout.amount_minor, 0);

  const confirmPayoutAction = () => {
    if (!confirmation) return;

    if (confirmation.kind === "run") {
      runAction.mutate(
        { action: "run" },
        { onSuccess: () => setConfirmation(null) },
      );
      return;
    }

    const body =
      confirmation.kind === "mark-paid"
        ? {
            action: "mark-paid",
            payoutId: confirmation.payout.id,
            reference: references[confirmation.payout.id]?.trim() || undefined,
          }
        : { action: "mark-failed", payoutId: confirmation.payout.id };

    runAction.mutate(body, { onSuccess: () => setConfirmation(null) });
  };

  const confirmationContent = (() => {
    if (!confirmation) return null;
    if (confirmation.kind === "run") {
      return {
        title: "Create a payout batch?",
        description:
          "This requests payout records for every currently eligible owner balance. Review the balance total before continuing.",
        action: "Create batch",
        destructive: false,
      };
    }

    const destination = payoutDestination(confirmation.payout);
    if (confirmation.kind === "mark-paid") {
      const reference = references[confirmation.payout.id]?.trim();
      return {
        title: "Mark this payout as paid?",
        description: `${formatAmd(confirmation.payout.amount_minor)} to ${destination.holder} will be recorded as paid${reference ? ` with reference ${reference}` : " without a transfer reference"}. Confirm only after the transfer has completed.`,
        action: "Mark paid",
        destructive: false,
      };
    }

    return {
      title: "Mark this payout as failed?",
      description: `${formatAmd(confirmation.payout.amount_minor)} to ${destination.holder} will be recorded as failed. Confirm that the transfer did not complete.`,
      action: "Mark failed",
      destructive: true,
    };
  })();

  return (
    <div className="space-y-5">
      <section aria-label="Payout summary" className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1fr_1fr_1.2fr]">
        <SummaryCard
          label="Owed to owners"
          value={balancesQuery.isError ? "Unavailable" : formatAmd(totalOwed)}
          detail={balancesQuery.isError ? "The owner balance request failed." : "Positive owner balances"}
          loading={balancesQuery.isLoading}
        />
        <SummaryCard
          label="Pending payout batches"
          value={payoutsQuery.isError ? "Unavailable" : formatAmd(pendingTotal)}
          detail={payoutsQuery.isError ? "The payout request failed." : "Transfers awaiting resolution"}
          loading={payoutsQuery.isLoading}
        />
        <Card className="min-w-0 md:col-span-2 xl:col-span-1">
          <CardContent className="flex h-full flex-col justify-center gap-2 p-4 sm:flex-row sm:items-center sm:p-5 xl:flex-col xl:items-stretch 2xl:flex-row">
            <Button
              size="sm"
              className="w-full"
              onClick={() => setConfirmation({ kind: "run" })}
              disabled={
                runAction.isPending ||
                balancesQuery.isLoading ||
                payoutsQuery.isLoading ||
                balancesQuery.isError ||
                payoutsQuery.isError
              }
            >
              {runAction.isPending ? (
                <Loader2 aria-hidden="true" className="animate-spin motion-reduce:animate-none" />
              ) : (
                <Play aria-hidden="true" />
              )}
              Run payout batch
            </Button>
            <Button size="sm" variant="outline" className="w-full" onClick={exportCsv}>
              <Download aria-hidden="true" />
              Export CSV
            </Button>
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader className="p-5 pb-4 sm:p-6 sm:pb-4">
          <CardTitle as="h2" className="flex items-center gap-2 text-lg">
            <Banknote aria-hidden="true" className="h-5 w-5 text-primary" />
            Payout ledger
          </CardTitle>
          <CardDescription>
            Export pending transfers, complete them in the payment provider, then record the result here.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-5 pt-0 sm:p-6 sm:pt-0">
          {payoutsQuery.isLoading ? (
            <div className="space-y-3" role="status" aria-label="Loading payouts">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : payoutsQuery.isError ? (
            <ErrorPanel
              what="payouts"
              description="No transfer status has been inferred from the failed request."
              onRetry={() => payoutsQuery.refetch()}
              isRetrying={payoutsQuery.isFetching}
              className="py-8"
            />
          ) : payouts.length === 0 ? (
            <StatusPanel
              icon={ReceiptText}
              title="No payouts yet"
              description="Payout records will appear here after an eligible batch is created."
              className="py-8"
            />
          ) : (
            <>
              <ul className="space-y-3 lg:hidden" aria-label="Payout ledger">
                {payouts.map((payout) => {
                  const destination = payoutDestination(payout);
                  return (
                    <li key={payout.id} className="rounded-lg border border-border bg-surface-1 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="stat-numeral text-lg font-semibold leading-tight text-foreground">
                            {formatAmd(payout.amount_minor)}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            Created {format(new Date(payout.created_at), "MMM d, yyyy")}
                          </p>
                        </div>
                        <PayoutStatus payout={payout} />
                      </div>

                      <dl className="mt-3 border-t border-border pt-3 text-sm">
                        <div>
                          <dt className="text-xs text-muted-foreground">Destination</dt>
                          <dd className="mt-0.5 break-all text-foreground">
                            {destination.method}: {destination.destination}
                          </dd>
                          <dd className="mt-0.5 break-words text-xs text-muted-foreground">
                            {destination.holder}
                          </dd>
                        </div>
                      </dl>

                      {payout.status === "pending" && (
                        <div className="mt-4 space-y-3 border-t border-border pt-4">
                          <div className="space-y-1.5">
                            <Label htmlFor={`payout-reference-mobile-${payout.id}`}>Transfer reference</Label>
                            <Input
                              id={`payout-reference-mobile-${payout.id}`}
                              placeholder="Bank or provider reference"
                              value={references[payout.id] ?? ""}
                              onChange={(event) =>
                                setReferences((previous) => ({
                                  ...previous,
                                  [payout.id]: event.target.value,
                                }))
                              }
                            />
                          </div>
                          <div className="grid gap-2 sm:grid-cols-2">
                            <Button
                              size="sm"
                              onClick={() => setConfirmation({ kind: "mark-paid", payout })}
                              disabled={runAction.isPending}
                              aria-label={`Mark payout to ${destination.holder} as paid`}
                            >
                              Mark paid
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-destructive hover:text-destructive"
                              onClick={() => setConfirmation({ kind: "mark-failed", payout })}
                              disabled={runAction.isPending}
                              aria-label={`Mark payout to ${destination.holder} as failed`}
                            >
                              Mark failed
                            </Button>
                          </div>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>

              <div className="hidden lg:block">
                <Table>
                  <caption className="sr-only">
                    Owner payouts with destinations, transfer amounts, statuses, and administrator actions.
                  </caption>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Created</TableHead>
                      <TableHead>Destination</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payouts.map((payout) => {
                      const destination = payoutDestination(payout);
                      return (
                        <TableRow key={payout.id}>
                          <TableCell className="whitespace-nowrap text-muted-foreground">
                            {format(new Date(payout.created_at), "MMM d, yyyy")}
                          </TableCell>
                          <TableCell className="max-w-64">
                            <p className="break-all text-sm text-foreground">
                              {destination.method}: {destination.destination}
                            </p>
                            <p className="break-words text-xs text-muted-foreground">{destination.holder}</p>
                          </TableCell>
                          <TableCell className="stat-numeral whitespace-nowrap text-right font-semibold">
                            {formatAmd(payout.amount_minor)}
                          </TableCell>
                          <TableCell><PayoutStatus payout={payout} /></TableCell>
                          <TableCell className="text-right">
                            {payout.status === "pending" && (
                              <div className="flex items-end justify-end gap-2">
                                <div className="space-y-1 text-left">
                                  <Label className="sr-only" htmlFor={`payout-reference-desktop-${payout.id}`}>
                                    Transfer reference for {destination.holder}
                                  </Label>
                                  <Input
                                    id={`payout-reference-desktop-${payout.id}`}
                                    placeholder="Transfer ref"
                                    className="h-10 w-36"
                                    value={references[payout.id] ?? ""}
                                    onChange={(event) =>
                                      setReferences((previous) => ({
                                        ...previous,
                                        [payout.id]: event.target.value,
                                      }))
                                    }
                                  />
                                </div>
                                <Button
                                  size="sm"
                                  onClick={() => setConfirmation({ kind: "mark-paid", payout })}
                                  disabled={runAction.isPending}
                                  aria-label={`Mark payout to ${destination.holder} as paid`}
                                >
                                  Mark paid
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-destructive hover:text-destructive"
                                  onClick={() => setConfirmation({ kind: "mark-failed", payout })}
                                  disabled={runAction.isPending}
                                  aria-label={`Mark payout to ${destination.holder} as failed`}
                                >
                                  Failed
                                </Button>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!confirmation} onOpenChange={(open) => !open && setConfirmation(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="mb-1 flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-surface-1 text-muted-foreground">
              {confirmation?.kind === "run" ? (
                <Landmark aria-hidden="true" className="h-5 w-5" />
              ) : (
                <Banknote aria-hidden="true" className="h-5 w-5" />
              )}
            </div>
            <AlertDialogTitle>{confirmationContent?.title}</AlertDialogTitle>
            <AlertDialogDescription className="break-words">
              {confirmationContent?.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={runAction.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                confirmPayoutAction();
              }}
              disabled={runAction.isPending}
              className={
                confirmationContent?.destructive
                  ? "bg-destructive-solid text-destructive-foreground hover:bg-destructive-solid/90"
                  : undefined
              }
            >
              {runAction.isPending ? (
                <>
                  <Loader2 aria-hidden="true" className="animate-spin motion-reduce:animate-none" />
                  Updating…
                </>
              ) : (
                confirmationContent?.action
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default PayoutsTab;
