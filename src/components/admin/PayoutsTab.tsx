import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Banknote, Download, Loader2, Play } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { formatAmd } from "@/features/booking/hooks/useBookingFlow";
import { payoutStatusDescriptor } from "@/features/booking/payout";
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

/**
 * Badge treatment per payout tone. The labels and tones themselves come from
 * `payoutStatusDescriptor`, not from here — this file used to carry its own
 * status map *and* print the raw column beside it, which made it the third
 * place payout statuses were described and the second that rendered them as
 * database spelling.
 */
const TONE_CLASS: Record<string, string> = {
  positive: "bg-primary text-primary-foreground",
  warning: "border-warning/20 bg-warning/10 text-warning",
  danger: "border-destructive/20 bg-destructive/10 text-destructive",
  neutral: "bg-muted text-muted-foreground",
};

/** Admin payout operations: run batches, export for the bank, confirm transfers. */
const PayoutsTab = () => {
  const queryClient = useQueryClient();
  const [references, setReferences] = useState<Record<string, string>>({});

  const { data: payouts, isLoading } = useQuery({
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

  const { data: balances } = useQuery({
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
    onSuccess: (data, vars) => {
      queryClient.invalidateQueries({ queryKey: ["admin-payouts"] });
      queryClient.invalidateQueries({ queryKey: ["admin-owner-balances"] });
      if (vars.action === "run") {
        toast.success(`${data.created?.length ?? 0} payout(s) created`);
      } else {
        toast.success("Payout updated");
      }
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Payout operation failed"),
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
      const csv = [header, ...rows.map((r) => Object.values(r).map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))].join("\n");
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `payouts-${format(new Date(), "yyyy-MM-dd")}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Export failed");
    }
  };

  const totalOwed = (balances ?? []).reduce((sum, b) => sum + Math.max(0, b.balance_minor ?? 0), 0);
  const pendingTotal = (payouts ?? [])
    .filter((p) => p.status === "pending")
    .reduce((sum, p) => sum + p.amount_minor, 0);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Owed to owners (balances)</CardDescription>
            <CardTitle className="stat-numeral text-2xl">{formatAmd(totalOwed)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Pending payout batches</CardDescription>
            <CardTitle className="stat-numeral text-2xl">{formatAmd(pendingTotal)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardContent className="flex h-full items-center gap-2 pt-6">
            <Button size="sm" onClick={() => runAction.mutate({ action: "run" })} disabled={runAction.isPending}>
              {runAction.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
              Run payout batch
            </Button>
            <Button size="sm" variant="outline" onClick={exportCsv}>
              <Download className="mr-2 h-4 w-4" /> Export CSV
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Banknote className="h-4 w-4" /> Payouts
          </CardTitle>
          <CardDescription>
            Run a batch, transfer via the bank / Idram cabinet, then mark each payout paid with its
            transfer reference.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8" role="status" aria-label="Loading payouts">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : !payouts || payouts.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No payouts yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Created</TableHead>
                  <TableHead>Destination</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payouts.map((payout) => (
                  <TableRow key={payout.id}>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(payout.created_at), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell className="max-w-[220px]">
                      <p className="truncate text-sm">
                        {payout.method === "idram" ? "Idram" : "IBAN"}:{" "}
                        {payout.destination_snapshot?.destination ?? "—"}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {payout.destination_snapshot?.holder ?? payout.owner_id.slice(0, 8)}
                      </p>
                    </TableCell>
                    <TableCell className="stat-numeral">{formatAmd(payout.amount_minor)}</TableCell>
                    <TableCell>
                      <Badge
                        className={TONE_CLASS[payoutStatusDescriptor(payout.status).tone]}
                        title={payoutStatusDescriptor(payout.status).hint}
                      >
                        {payoutStatusDescriptor(payout.status).label}
                      </Badge>
                      {payout.reference && (
                        <p className="mt-0.5 text-xs text-muted-foreground">ref: {payout.reference}</p>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {payout.status === "pending" && (
                        <div className="flex items-center justify-end gap-2">
                          <Input
                            placeholder="Bank ref"
                            className="h-8 w-28"
                            value={references[payout.id] ?? ""}
                            onChange={(e) =>
                              setReferences((prev) => ({ ...prev, [payout.id]: e.target.value }))
                            }
                          />
                          <Button
                            size="sm"
                            onClick={() =>
                              runAction.mutate({
                                action: "mark-paid",
                                payoutId: payout.id,
                                reference: references[payout.id] || undefined,
                              })
                            }
                            disabled={runAction.isPending}
                          >
                            Mark paid
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => runAction.mutate({ action: "mark-failed", payoutId: payout.id })}
                            disabled={runAction.isPending}
                          >
                            Failed
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PayoutsTab;
