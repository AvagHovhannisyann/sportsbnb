import { handlePreflight } from "../_shared/cors.ts";
import { json, errorResponse, makeLogger } from "../_shared/http.ts";
import { requireUser, HttpError } from "../_shared/auth.ts";
import { adminClient } from "../_shared/supabase.ts";
import { getProvider } from "../_shared/providers/registry.ts";

const log = makeLogger("payments-init");

/**
 * Starts payment for a booking hold or a paid game.
 * The amount ALWAYS comes from the database row — never from the client.
 * Body: { bookingId?, gameId?, provider: 'ameria'|'idram'|'mock', lang? }
 */
Deno.serve(async (req) => {
  const preflight = handlePreflight(req);
  if (preflight) return preflight;

  try {
    const { user } = await requireUser(req);
    const { bookingId, gameId, provider: providerKey, lang } = await req.json();

    if ((!bookingId && !gameId) || (bookingId && gameId)) {
      return errorResponse(req, "provide exactly one of bookingId or gameId", 400);
    }
    if (!["ameria", "idram", "mock"].includes(providerKey)) {
      return errorResponse(req, "invalid provider", 400);
    }

    const admin = adminClient();
    let amountMinor: number;
    let currency: string;
    let description: string;

    if (bookingId) {
      const { data: booking } = await admin.from("bookings").select("*").eq("id", bookingId).single();
      if (!booking) return errorResponse(req, "booking not found", 404);
      if (booking.user_id !== user.id) return errorResponse(req, "forbidden", 403);
      if (booking.status !== "pending_payment") {
        return errorResponse(req, `booking is ${booking.status}, not payable`, 409);
      }
      if (booking.expires_at && new Date(booking.expires_at) < new Date()) {
        return errorResponse(req, "booking hold expired", 409);
      }
      if (!booking.amount_minor || booking.amount_minor <= 0) {
        return errorResponse(req, "booking has no amount", 409);
      }
      amountMinor = booking.amount_minor;
      currency = booking.currency ?? "AMD";
      description = `SportsBnB booking — ${booking.venue_name}`;
    } else {
      const { data: game } = await admin.from("games").select("*").eq("id", gameId).single();
      if (!game) return errorResponse(req, "game not found", 404);
      if (game.status !== "open") return errorResponse(req, "game is not open", 409);
      const pricePerPlayer = Number(game.price_per_player ?? 0);
      if (pricePerPlayer <= 0) return errorResponse(req, "game is free — join directly", 400);

      const { data: existing } = await admin
        .from("game_participants")
        .select("id")
        .eq("game_id", gameId)
        .eq("user_id", user.id)
        .maybeSingle();
      if (existing) return errorResponse(req, "already joined", 409);

      amountMinor = Math.round(pricePerPlayer * 100);
      currency = "AMD";
      description = `SportsBnB game — ${game.title}`;
    }

    // Reuse an in-flight payment for the same subject+user if one exists
    const idempotencyKey = `${bookingId ?? gameId}:${user.id}:${providerKey}`;
    const { data: existingPayment } = await admin
      .from("payments")
      .select("*")
      .eq("idempotency_key", idempotencyKey)
      .in("status", ["created", "redirected"])
      .maybeSingle();

    let payment = existingPayment;
    if (!payment) {
      const { data: created, error: insertErr } = await admin
        .from("payments")
        .insert({
          user_id: user.id,
          booking_id: bookingId ?? null,
          game_id: gameId ?? null,
          provider: providerKey,
          amount_minor: amountMinor,
          currency,
          status: "created",
          idempotency_key: idempotencyKey,
        })
        .select()
        .single();
      if (insertErr || !created) {
        log("payment insert failed", { error: insertErr?.message });
        return errorResponse(req, "failed to create payment", 500);
      }
      payment = created;
    }

    const provider = getProvider(providerKey);
    const backUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/payments-callback-ameria?paymentId=${payment.id}`;
    const initResult = await provider.init({
      orderRef: payment.order_ref,
      paymentId: payment.id,
      amountMinor,
      currency,
      description,
      backUrl,
      lang: lang === "am" || lang === "ru" ? lang : "en",
    });

    await admin
      .from("payments")
      .update({
        status: "redirected",
        provider_payment_id: initResult.providerPaymentId ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", payment.id);

    log("payment initialized", { paymentId: payment.id, provider: providerKey });
    return json(req, {
      paymentId: payment.id,
      redirectUrl: initResult.redirectUrl,
      formAction: initResult.formAction ?? null,
      formFields: initResult.formFields ?? null,
      amountMinor,
      currency,
    });
  } catch (error) {
    if (error instanceof HttpError) return errorResponse(req, error.message, error.status);
    log("ERROR", { message: error instanceof Error ? error.message : String(error) });
    return errorResponse(req, "payment initialization failed", 500);
  }
});
