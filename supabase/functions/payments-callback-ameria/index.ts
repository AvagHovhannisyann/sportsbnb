import { makeLogger } from "../_shared/http.ts";
import { adminClient } from "../_shared/supabase.ts";
import { getProvider } from "../_shared/providers/registry.ts";
import { settlePaidPayment } from "../_shared/payments.ts";

const log = makeLogger("payments-callback-ameria");

/**
 * BackURL target for the Ameria redirect flow. Query params from the bank are
 * NEVER trusted — we look the payment up by our own id/orderRef and re-verify
 * with GetPaymentDetails before settling. Safe to replay.
 */
Deno.serve(async (req) => {
  const url = new URL(req.url);
  const appUrl = Deno.env.get("APP_BASE_URL") ?? "https://sportsbnb.lovable.app";
  const paymentIdParam = url.searchParams.get("paymentId") ?? url.searchParams.get("Opaque");
  const orderIdParam = url.searchParams.get("orderID") ?? url.searchParams.get("OrderID");

  const admin = adminClient();

  let payment: Record<string, any> | null = null;
  if (paymentIdParam) {
    const { data } = await admin.from("payments").select("*").eq("id", paymentIdParam).maybeSingle();
    payment = data;
  }
  if (!payment && orderIdParam && /^\d+$/.test(orderIdParam)) {
    const { data } = await admin.from("payments").select("*").eq("order_ref", Number(orderIdParam)).maybeSingle();
    payment = data;
  }

  if (!payment) {
    log("payment not found", { paymentIdParam, orderIdParam });
    return Response.redirect(`${appUrl}/booking/error`, 302);
  }

  const resultUrl = payment.booking_id
    ? `${appUrl}/booking/${payment.booking_id}/status`
    : `${appUrl}/game/${payment.game_id}/join-status`;

  // Terminal already? Just bounce to the result page (idempotent replay).
  if (["paid", "failed", "cancelled", "refunded"].includes(payment.status)) {
    return Response.redirect(resultUrl, 302);
  }

  try {
    const provider = getProvider(payment.provider);
    const verdict = await provider.verify({
      providerPaymentId: payment.provider_payment_id ?? undefined,
      orderRef: payment.order_ref,
      expectedAmountMinor: payment.amount_minor,
    });

    if (verdict.status === "paid") {
      const settled = await settlePaidPayment(payment.id, verdict.raw);
      log("settled", { paymentId: payment.id, ok: settled.ok, already: settled.alreadySettled });
    } else if (verdict.status === "failed") {
      await admin
        .from("payments")
        .update({ status: "failed", provider_payload: verdict.raw ?? null, updated_at: new Date().toISOString() })
        .eq("id", payment.id)
        .in("status", ["created", "redirected"]);
      log("payment failed", { paymentId: payment.id });
    } else {
      log("payment still pending", { paymentId: payment.id });
    }
  } catch (e) {
    log("verify error", { message: e instanceof Error ? e.message : String(e) });
  }

  return Response.redirect(resultUrl, 302);
});
