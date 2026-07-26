import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Banknote, Loader2, PiggyBank, Save, Wallet } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { OwnerLayout } from "@/components/owner/OwnerLayout";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatAmd } from "@/features/booking/hooks/useBookingFlow";
import { ledgerEntryLabel } from "@/features/booking/ledger";
import { payoutStatusDescriptor } from "@/features/booking/payout";

/**
 * The two tables on this page sit side by side and formatted the same column
 * two different ways — "Jan 1, 00:00" beside "Jan 1, 1970". A ledger entry is
 * a moment in a day, so it keeps the time; a payout is a day, so it keeps the
 * year. Both now say which month and day in the same words.
 */
const LEDGER_DATE = "d MMM, HH:mm";
const PAYOUT_DATE = "d MMM yyyy";

/** Badge treatment per payout tone, using the audited token pairs. */
const PAYOUT_TONE: Record<string, string> = {
  positive: "bg-primary text-primary-foreground",
  warning: "border-warning/20 bg-warning/10 text-warning",
  danger: "border-destructive/20 bg-destructive/10 text-destructive",
  neutral: "bg-muted text-muted-foreground",
};

export default function OwnerEarningsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [method, setMethod] = useState<"bank_transfer" | "idram">("bank_transfer");
  const [iban, setIban] = useState("");
  const [holder, setHolder] = useState("");

  const { data: balance } = useQuery({
    queryKey: ["owner-balance", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("owner_balances").select("*").eq("owner_id", user!.id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: ledger, isLoading: ledgerLoading } = useQuery({
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

  const { data: payouts } = useQuery({
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

  const { data: account } = useQuery({
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
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to save"),
  });

  return (
    <OwnerLayout title="Earnings" subtitle="Your balance, transactions, and payouts">
      <div className="grid gap-6 lg:grid-cols-3 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5">
              <PiggyBank className="h-4 w-4" /> Available balance
            </CardDescription>
            <CardTitle as="h2" className="text-3xl tabular-nums">{formatAmd(balance?.balance_minor ?? 0)}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Paid out automatically when it reaches ֏10,000 · weekly runs
            </p>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle as="h2" className="text-base flex items-center gap-2">
              {method === "idram" ? <Wallet className="h-4 w-4" /> : <Banknote className="h-4 w-4" />}
              Payout destination
            </CardTitle>
            <CardDescription>Where your earnings are transferred.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label>Method</Label>
              <Select value={method} onValueChange={(v) => setMethod(v as "bank_transfer" | "idram")}>
                <SelectTrigger aria-label="Payout method">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bank_transfer">Bank transfer (IBAN)</SelectItem>
                  <SelectItem value="idram">Idram wallet</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{method === "idram" ? "Idram ID" : "IBAN"}</Label>
              <Input value={iban} onChange={(e) => setIban(e.target.value)} placeholder={method === "idram" ? "1000…" : "AM…"} />
            </div>
            <div className="space-y-1.5">
              <Label>Account holder</Label>
              <Input value={holder} onChange={(e) => setHolder(e.target.value)} placeholder="Name Surname / LLC" />
            </div>
            <div className="sm:col-span-3 flex items-center justify-between">
              {account?.verified ? (
                <Badge variant="secondary">Verified</Badge>
              ) : (
                <span className="text-xs text-muted-foreground">Details are verified before the first payout.</span>
              )}
              <Button size="sm" onClick={() => saveAccount.mutate()} disabled={saveAccount.isPending || !iban.trim()}>
                {saveAccount.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle as="h2" className="text-base">Recent activity</CardTitle>
          </CardHeader>
          <CardContent>
            {ledgerLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : !ledger || ledger.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No transactions yet — earnings appear here after your first paid booking.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ledger.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(entry.created_at), LEDGER_DATE)}
                      </TableCell>
                      <TableCell>{ledgerEntryLabel(entry.entry_type)}</TableCell>
                      <TableCell
                        className={`text-right tabular-nums ${entry.amount_minor < 0 ? "text-destructive" : "text-emerald-600"}`}
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

        <Card>
          <CardHeader>
            <CardTitle as="h2" className="text-base">Payouts</CardTitle>
          </CardHeader>
          <CardContent>
            {!payouts || payouts.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No payouts yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payouts.map((payout) => (
                    <TableRow key={payout.id}>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(payout.created_at), PAYOUT_DATE)}
                      </TableCell>
                      <TableCell>
                        {/* Was `{payout.status}` in a badge whose only variant
                            test was `=== "paid"`, so a failed transfer and a
                            scheduled one rendered identically. */}
                        <Badge
                          className={PAYOUT_TONE[payoutStatusDescriptor(payout.status).tone]}
                          title={payoutStatusDescriptor(payout.status).hint}
                        >
                          {payoutStatusDescriptor(payout.status).label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{formatAmd(payout.amount_minor)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </OwnerLayout>
  );
}
