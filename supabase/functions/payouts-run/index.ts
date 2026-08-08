import { handlePreflight } from "../_shared/cors.ts";
import { json, errorResponse, makeLogger } from "../_shared/http.ts";
import { requireAdmin, requireCronSecret, HttpError } from "../_shared/auth.ts";
import { adminClient } from "../_shared/supabase.ts";

const log = makeLogger("payouts-run");

const MIN_PAYOUT_MINOR = 10_000 * 100; // ֏10,000 — Armenian dram, not ₸ (tenge)

/**
 * Payout operations. Callable by admins or cron.
 * Actions:
 *  - run:        create pending payouts for owners above the minimum balance
 *                (payout ledger debit written in the same step, so balances
 *                 immediately reflect the reservation)
 *  - export:     list pending payouts as CSV rows for the bank transfer batch
 *  - mark-paid:  { payoutId, reference } after the manual bank transfer clears
 *  - mark-failed:{ payoutId } reverses the ledger debit
 */
Deno.serve(async (req) => {
  const preflight = handlePreflight(req);
  if (preflight) return preflight;

  try {
    // Admin JWT or cron secret both work
    try {
      requireCronSecret(req);
    } catch {
      await requireAdmin(req);
    }

    const { action = "run", payoutId, reference } = await req.json().catch(() => ({}));
    const admin = adminClient();

    if (action === "run") {
      const { data: balances } = await admin.from("owner_balances").select("*");
      const eligible = (balances ?? []).filter((b) => b.balance_minor >= MIN_PAYOUT_MINOR);
      const created: string[] = [];

      for (const bal of eligible) {
        const { data: account } = await admin
          .from("owner_payout_accounts")
          .select("*")
          .eq("owner_id", bal.owner_id)
          .maybeSingle();

        const { data: payout, error } = await admin
          .from("payouts")
          .insert({
            owner_id: bal.owner_id,
            amount_minor: bal.balance_minor,
            currency: bal.currency,
            status: "pending",
            method: account?.method ?? "bank_transfer",
            destination_snapshot: account?.details ?? null,
            period_end: new Date().toISOString().slice(0, 10),
          })
          .select()
          .single();
        if (error || !payout) {
          log("payout insert failed", { owner: bal.owner_id, error: error?.message });
          continue;
        }

        const { error: ledgerErr } = await admin.from("ledger_entries").insert({
          entry_type: "payout",
          payout_id: payout.id,
          owner_id: bal.owner_id,
          amount_minor: -bal.balance_minor,
          currency: bal.currency,
          memo: `Payout ${payout.id}`,
        });
        if (ledgerErr) {
          // Roll the payout back rather than leave the ledger inconsistent
          await admin.from("payouts").delete().eq("id", payout.id);
          log("ledger debit failed, payout rolled back", { payoutId: payout.id });
          continue;
        }
        created.push(payout.id);
      }

      log("run complete", { created: created.length });
      return json(req, { created });
    }

    if (action === "export") {
      const { data: pending } = await admin
        .from("payouts")
        .select("id, owner_id, amount_minor, currency, method, destination_snapshot, created_at")
        .eq("status", "pending")
        .order("created_at");
      const rows = (pending ?? []).map((p) => ({
        payout_id: p.id,
        owner_id: p.owner_id,
        amount: (p.amount_minor / 100).toFixed(2),
        currency: p.currency,
        method: p.method,
        destination: JSON.stringify(p.destination_snapshot ?? {}),
      }));
      return json(req, { payouts: rows });
    }

    if (action === "mark-paid") {
      if (!payoutId) return errorResponse(req, "payoutId required", 400);
      const { data: updated } = await admin
        .from("payouts")
        .update({ status: "paid", reference: reference ?? null, paid_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq("id", payoutId)
        .in("status", ["pending", "processing"])
        .select("id, owner_id, amount_minor");
      if (!updated || updated.length === 0) return errorResponse(req, "payout not in a payable state", 409);

      await admin.from("notifications").insert({
        user_id: updated[0].owner_id,
        type: "booking",
        title: "Payout sent 💸",
        message: `${(updated[0].amount_minor / 100).toLocaleString()} AMD has been transferred to your account.`,
        link: `/owner/earnings`,
      });
      return json(req, { ok: true });
    }

    if (action === "mark-failed") {
      if (!payoutId) return errorResponse(req, "payoutId required", 400);
      const { data: payout } = await admin.from("payouts").select("*").eq("id", payoutId).maybeSingle();
      if (!payout || payout.status === "paid") return errorResponse(req, "payout not reversible", 409);

      await admin.from("payouts")
        .update({ status: "failed", updated_at: new Date().toISOString() })
        .eq("id", payoutId);
      // Reverse the reservation so the balance becomes available again
      await admin.from("ledger_entries").insert({
        entry_type: "adjustment",
        payout_id: payout.id,
        owner_id: payout.owner_id,
        amount_minor: payout.amount_minor,
        currency: payout.currency,
        memo: `Reversal of failed payout ${payout.id}`,
      });
      return json(req, { ok: true });
    }

    return errorResponse(req, "unknown action", 400);
  } catch (error) {
    if (error instanceof HttpError) return errorResponse(req, error.message, error.status);
    log("ERROR", { message: error instanceof Error ? error.message : String(error) });
    return errorResponse(req, "payout operation failed", 500);
  }
});
