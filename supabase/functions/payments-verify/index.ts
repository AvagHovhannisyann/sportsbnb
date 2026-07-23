import { handlePreflight } from "../_shared/cors.ts";
import { json, errorResponse, makeLogger } from "../_shared/http.ts";
import { requireUser, HttpError } from "../_shared/auth.ts";
import { adminClient } from "../_shared/supabase.ts";
import { getProvider } from "../_shared/providers/registry.ts";
import { mockEnabled } from "../_shared/providers/mock.ts";
import { settlePaidPayment } from "../_shared/payments.ts";

const log = makeLogger("payments-verify");

/**
 * Client polling endpoint after returning from a provider redirect.
 * Covers the user closing the bank tab before the BackURL fired.
 * Body: { paymentId, mockOutcome?: 'paid'|'failed' }  (mockOutcome only honored
 * for the mock provider with PAYMENTS_MOCK_ENABLED=true)
 */
Deno.serve(async (req) => {
  const preflight = handlePreflight(req);
  if (preflight) return preflight;

  try {
    const { user } = await requireUser(req);
    const { paymentId, mockOutcome } = await req.json();
    if (!paymentId) return errorResponse(req, "paymentId required", 400);

    const admin = adminClient();
    const { data: payment } = await admin.from("payments").select("*").eq("id", paymentId).maybeSingle();
    if (!payment) return errorResponse(req, "payment not found", 404);
    if (payment.user_id !== user.id) return errorResponse(req, "forbidden", 403);

    if (["paid", "refunded", "partially_refunded"].includes(payment.status)) {
      return json(req, { status: payment.status, bookingId: payment.booking_id, gameId: payment.game_id });
    }
    if (["failed", "cancelled"].includes(payment.status)) {
      return json(req, { status: payment.status });
    }

    // Mock flow: the tester's choice IS the bank's answer.
    if (payment.provider === "mock" && mockEnabled()) {
      if (mockOutcome === "failed") {
        await admin.from("payments").update({ status: "failed", updated_at: new Date().toISOString() })
          .eq("id", payment.id).in("status", ["created", "redirected"]);
        return json(req, { status: "failed" });
      }
      if (mockOutcome === "paid") {
        const settled = await settlePaidPayment(payment.id, { mock: true });
        return json(req, {
          status: settled.ok ? "paid" : "failed",
          bookingId: payment.booking_id,
          gameId: payment.game_id,
        });
      }
      return json(req, { status: "pending" });
    }

    // Idram is callback-driven — report current state only.
    if (payment.provider === "idram") {
      return json(req, { status: "pending" });
    }

    const provider = getProvider(payment.provider);
    const verdict = await provider.verify({
      providerPaymentId: payment.provider_payment_id ?? undefined,
      orderRef: payment.order_ref,
      expectedAmountMinor: payment.amount_minor,
    });

    if (verdict.status === "paid") {
      const settled = await settlePaidPayment(payment.id, verdict.raw);
      return json(req, {
        status: settled.ok ? "paid" : "failed",
        bookingId: payment.booking_id,
        gameId: payment.game_id,
      });
    }
    if (verdict.status === "failed") {
      await admin.from("payments").update({ status: "failed", provider_payload: verdict.raw ?? null, updated_at: new Date().toISOString() })
        .eq("id", payment.id).in("status", ["created", "redirected"]);
      return json(req, { status: "failed" });
    }
    return json(req, { status: "pending" });
  } catch (error) {
    if (error instanceof HttpError) return errorResponse(req, error.message, error.status);
    log("ERROR", { message: error instanceof Error ? error.message : String(error) });
    return errorResponse(req, "verification failed", 500);
  }
});
