import { makeLogger } from "../_shared/http.ts";
import { adminClient } from "../_shared/supabase.ts";
import { verifyLemonSqueezySignature } from "../_shared/providers/lemonsqueezy.ts";
import { settlePaidPayment } from "../_shared/payments.ts";

const log = makeLogger("payments-callback-lemonsqueezy");

/**
 * Lemon Squeezy webhook (store 440378, webhook 122396), subscribed to
 * `order_created` and `order_refunded`.
 *
 * Order of operations matters: the raw body text is read and HMAC-verified
 * BEFORE anything is parsed. `X-Signature` is a hex HMAC-SHA256 of the exact
 * bytes Lemon Squeezy sent; re-serialising parsed JSON would produce different
 * bytes, and acting on a payload before verifying it is not verification at all.
 *
 * Everything after verification is idempotent — settlePaidPayment() re-reads
 * the payment and the ledger's partial unique index absorbs replays — so Lemon
 * Squeezy's retries are safe. Events we don't handle get 200 so they are not
 * retried forever.
 *
 * verify_jwt = false: this is an external caller with no Supabase JWT. The
 * signature IS the authentication.
 */
Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  // 1. Raw body first — never parse before verifying.
  const rawBody = await req.text();

  const secret = Deno.env.get("LEMONSQUEEZY_WEBHOOK_SECRET");
  if (!secret) {
    log("misconfigured", { reason: "LEMONSQUEEZY_WEBHOOK_SECRET not set" });
    return new Response(JSON.stringify({ error: "webhook not configured" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const signature = req.headers.get("X-Signature") ?? req.headers.get("x-signature");
  const valid = await verifyLemonSqueezySignature(rawBody, signature, secret);
  if (!valid) {
    log("signature rejected", { hasHeader: !!signature, bodyBytes: rawBody.length });
    return new Response(JSON.stringify({ error: "invalid signature" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  // 2. Only now is the payload trustworthy enough to parse.
  let payload: Record<string, any>;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    log("bad json after valid signature", {});
    return new Response(JSON.stringify({ error: "invalid json" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const eventName = String(payload?.meta?.event_name ?? "");
  const paymentId = payload?.meta?.custom_data?.payment_id;
  const orderId = payload?.data?.id ? String(payload.data.id) : null;
  const attrs = payload?.data?.attributes ?? {};

  if (eventName !== "order_created" && eventName !== "order_refunded") {
    // Subscribed-but-unhandled or newly added event types: acknowledge so Lemon
    // Squeezy stops retrying, but change nothing.
    log("ignored event", { eventName, orderId });
    return ok({ ignored: eventName });
  }

  if (!paymentId || typeof paymentId !== "string") {
    // Signed but unattributable — most likely an order created straight from the
    // storefront rather than one of our checkouts. Nothing to settle.
    log("no payment_id in custom_data", { eventName, orderId });
    return ok({ ignored: "no payment_id" });
  }

  const admin = adminClient();
  const { data: payment } = await admin
    .from("payments")
    .select("*")
    .eq("id", paymentId)
    .maybeSingle();

  if (!payment) {
    log("unknown payment", { eventName, paymentId, orderId });
    return ok({ ignored: "unknown payment" });
  }
  if (payment.provider !== "lemonsqueezy") {
    log("provider mismatch", { paymentId, provider: payment.provider });
    return ok({ ignored: "provider mismatch" });
  }

  // ---------------- order_refunded ----------------
  if (eventName === "order_refunded") {
    const refundedMinor = typeof attrs.refunded_amount === "number"
      ? attrs.refunded_amount
      : payment.amount_minor;
    const full = refundedMinor >= payment.amount_minor;

    await admin
      .from("payments")
      .update({
        status: full ? "refunded" : "partially_refunded",
        refunded_minor: refundedMinor,
        provider_payment_id: payment.provider_payment_id ?? orderId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", payment.id);

    // Ledger: payments-refund already writes the refund pair when WE initiate a
    // refund, and 'refund' has no unique index, so only write when nothing is
    // there — i.e. when the refund was issued from the Lemon Squeezy dashboard.
    const { data: existingRefundEntry } = await admin
      .from("ledger_entries")
      .select("id")
      .eq("payment_id", payment.id)
      .eq("entry_type", "refund")
      .maybeSingle();

    if (!existingRefundEntry) {
      let ownerId: string | null = null;
      let ownerShare = 0;
      if (payment.booking_id) {
        const { data: booking } = await admin
          .from("bookings")
          .select("owner_amount_minor, venues:venue_uuid (owner_id)")
          .eq("id", payment.booking_id)
          .single();
        ownerId = (booking?.venues as { owner_id?: string } | null)?.owner_id ?? null;
        const ownerAmount = booking?.owner_amount_minor ?? 0;
        ownerShare = Math.min(
          ownerAmount,
          Math.round(refundedMinor * (ownerAmount / (payment.amount_minor || 1))),
        );
      }
      const currency = payment.currency ?? "AMD";
      const { error: ledgerErr } = await admin.from("ledger_entries").insert([
        {
          entry_type: "refund",
          payment_id: payment.id,
          booking_id: payment.booking_id,
          owner_id: null,
          amount_minor: -refundedMinor,
          currency,
          memo: `Lemon Squeezy refund for order ${orderId}`,
        },
        {
          entry_type: "owner_refund_debit",
          payment_id: payment.id,
          booking_id: payment.booking_id,
          owner_id: ownerId,
          amount_minor: -ownerShare,
          currency,
          memo: `Earning reversal for refunded order ${orderId}`,
        },
      ]);
      if (ledgerErr) log("refund ledger insert failed", { paymentId, error: ledgerErr.message });
    }

    log("refunded", { paymentId, orderId, refundedMinor, full });
    return ok({ handled: "order_refunded", full });
  }

  // ---------------- order_created ----------------
  const orderStatus = String(attrs.status ?? "").toLowerCase();
  if (orderStatus !== "paid") {
    // 'pending' / 'failed' orders are not money in the bank. Acknowledge; the
    // paid state arrives as its own event (or never).
    log("order not paid", { paymentId, orderId, orderStatus });
    return ok({ ignored: `order status ${orderStatus}` });
  }

  // The webhook's own figure is never authoritative — it must agree with what
  // we asked to be charged. A mismatch is a failure, not a partial success.
  const total = typeof attrs.total === "number" ? attrs.total : null;
  if (total === null || total !== payment.amount_minor) {
    log("amount mismatch", { paymentId, orderId, got: total, expected: payment.amount_minor });
    await admin
      .from("payments")
      .update({
        error_code: "amount_mismatch",
        provider_payload: payload,
        updated_at: new Date().toISOString(),
      })
      .eq("id", payment.id);
    return new Response(JSON.stringify({ error: "amount mismatch" }), {
      status: 409,
      headers: { "Content-Type": "application/json" },
    });
  }

  const currency = String(attrs.currency ?? payment.currency ?? "AMD").toUpperCase();
  if (currency !== String(payment.currency ?? "AMD").toUpperCase()) {
    log("currency mismatch", { paymentId, orderId, got: currency, expected: payment.currency });
    await admin
      .from("payments")
      .update({
        error_code: "currency_mismatch",
        provider_payload: payload,
        updated_at: new Date().toISOString(),
      })
      .eq("id", payment.id);
    return new Response(JSON.stringify({ error: "currency mismatch" }), {
      status: 409,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Record the order id before settling: it is what verify() and refund() use.
  if (orderId && payment.provider_payment_id !== orderId) {
    await admin
      .from("payments")
      .update({ provider_payment_id: orderId, updated_at: new Date().toISOString() })
      .eq("id", payment.id);
  }

  const settled = await settlePaidPayment(payment.id, payload);
  log("order_created settled", {
    paymentId,
    orderId,
    ok: settled.ok,
    already: settled.alreadySettled ?? false,
    error: settled.error,
  });

  if (!settled.ok) {
    // 500 makes Lemon Squeezy retry, which is what we want for a transient
    // failure; settlePaidPayment is idempotent so the retry is safe.
    return new Response(JSON.stringify({ error: settled.error ?? "settle failed" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
  return ok({ handled: "order_created", already: settled.alreadySettled ?? false });
});

function ok(body: Record<string, unknown>): Response {
  return new Response(JSON.stringify({ received: true, ...body }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
