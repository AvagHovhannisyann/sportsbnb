import { SupabaseClient } from "npm:@supabase/supabase-js@2";
import { adminClient } from "./supabase.ts";

/**
 * Marks a payment paid and applies all downstream effects exactly once:
 * booking confirmed (or game joined), ledger triple written, notifications sent.
 *
 * Idempotency:
 *  - payment row is re-read and skipped if already 'paid'
 *  - the ledger has a partial unique index on (payment_id, entry_type) for the
 *    confirmation triple, so concurrent/replayed callbacks can't double-write.
 */
export async function settlePaidPayment(paymentId: string, providerPayload: unknown): Promise<{
  ok: boolean;
  alreadySettled?: boolean;
  bookingId?: string;
  gameId?: string;
  error?: string;
}> {
  const admin = adminClient();

  const { data: payment, error: payErr } = await admin
    .from("payments")
    .select("*")
    .eq("id", paymentId)
    .single();
  if (payErr || !payment) return { ok: false, error: "payment not found" };

  if (payment.status === "paid") {
    return { ok: true, alreadySettled: true, bookingId: payment.booking_id, gameId: payment.game_id };
  }

  // Flip to paid only from a non-terminal state (acts as a soft lock: the
  // update matches 0 rows if another callback got here first).
  const { data: flipped } = await admin
    .from("payments")
    .update({
      status: "paid",
      paid_at: new Date().toISOString(),
      provider_payload: providerPayload ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", paymentId)
    .in("status", ["created", "redirected"])
    .select("id");

  if (!flipped || flipped.length === 0) {
    // Someone else settled (or it was cancelled/expired mid-flight) — re-read.
    const { data: current } = await admin.from("payments").select("status, booking_id, game_id").eq("id", paymentId).single();
    if (current?.status === "paid") {
      return { ok: true, alreadySettled: true, bookingId: current.booking_id, gameId: current.game_id };
    }
    return { ok: false, error: `payment in state ${current?.status ?? "unknown"} cannot be settled` };
  }

  if (payment.booking_id) {
    await settleBooking(admin, payment);
    return { ok: true, bookingId: payment.booking_id };
  }
  if (payment.game_id) {
    await settleGame(admin, payment);
    return { ok: true, gameId: payment.game_id };
  }
  return { ok: false, error: "payment has no subject" };
}

async function settleBooking(admin: SupabaseClient, payment: Record<string, any>) {
  const { data: booking } = await admin
    .from("bookings")
    .select("*, venues:venue_uuid (owner_id, name)")
    .eq("id", payment.booking_id)
    .single();
  if (!booking) throw new Error("booking not found for paid payment");

  await admin
    .from("bookings")
    .update({ status: "confirmed", payment_intent_id: `pay_${payment.id}`, updated_at: new Date().toISOString() })
    .eq("id", payment.booking_id)
    .eq("status", "pending_payment");

  const ownerId = booking.venues?.owner_id ?? null;
  const currency = payment.currency ?? "AMD";
  const ownerMinor = booking.owner_amount_minor ?? 0;
  const feeMinor = booking.platform_fee_minor ?? 0;

  // Confirmation triple — the partial unique index makes replays no-ops.
  const entries = [
    { entry_type: "payment_received", payment_id: payment.id, booking_id: booking.id, owner_id: null, amount_minor: payment.amount_minor, currency, memo: `Payment for booking ${booking.id}` },
    { entry_type: "owner_earning", payment_id: payment.id, booking_id: booking.id, owner_id: ownerId, amount_minor: ownerMinor, currency, memo: `Earning for booking ${booking.id}` },
    { entry_type: "platform_commission", payment_id: payment.id, booking_id: booking.id, owner_id: null, amount_minor: feeMinor, currency, memo: `Commission for booking ${booking.id}` },
  ];
  for (const entry of entries) {
    const { error } = await admin.from("ledger_entries").insert(entry);
    if (error && !String(error.message).includes("duplicate key")) {
      console.error("ledger insert failed", entry.entry_type, error.message);
    }
  }

  // Notifications — best-effort
  try {
    await admin.from("notifications").insert({
      user_id: booking.user_id,
      type: "booking",
      title: "Booking confirmed ✅",
      message: `Your booking at ${booking.venue_name} is confirmed.`,
      link: `/booking/${booking.id}/status`,
    });
    if (ownerId) {
      await admin.from("notifications").insert({
        user_id: ownerId,
        type: "booking",
        title: "New paid booking 💰",
        message: `New confirmed booking at ${booking.venue_name}.`,
        link: `/owner/bookings`,
      });
    }
  } catch (e) {
    console.error("notification insert failed", e);
  }

  // Confirmation email — best-effort, internal call authorized by service role
  try {
    const { data: profile } = await admin.from("profiles").select("email").eq("user_id", booking.user_id).single();
    const email = booking.customer_email || profile?.email;
    if (email) {
      await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-booking-confirmation`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
        },
        body: JSON.stringify({
          email,
          venueName: booking.venue_name,
          bookingDate: booking.booking_date,
          bookingTime: booking.booking_time,
          totalPrice: (payment.amount_minor ?? 0) / 100,
          bookingId: booking.id,
        }),
      });
    }
  } catch (e) {
    console.error("confirmation email failed", e);
  }
}

async function settleGame(admin: SupabaseClient, payment: Record<string, any>) {
  // Row-locked capacity check + join, on behalf of the payer
  const { error } = await admin.rpc("join_game_paid", {
    p_game_id: payment.game_id,
    p_user_id: payment.user_id,
  });
  if (error) {
    // Game filled between checkout and payment — flag for refund, don't join.
    console.error("join_game_paid failed after payment", error.message);
    await admin
      .from("payments")
      .update({ status: "refund_pending", error_code: "game_full_after_payment", updated_at: new Date().toISOString() })
      .eq("id", payment.id);
    return;
  }

  await admin.from("ledger_entries").insert({
    entry_type: "payment_received",
    payment_id: payment.id,
    owner_id: null,
    amount_minor: payment.amount_minor,
    currency: payment.currency ?? "AMD",
    memo: `Game payment ${payment.game_id}`,
  });

  try {
    const { data: game } = await admin.from("games").select("host_id, title").eq("id", payment.game_id).single();
    await admin.from("notifications").insert({
      user_id: payment.user_id,
      type: "game",
      title: "Successfully joined game! 🎉",
      message: `Your payment was successful and you've joined "${game?.title}".`,
      link: `/game/${payment.game_id}`,
    });
    if (game && game.host_id !== payment.user_id) {
      await admin.from("notifications").insert({
        user_id: game.host_id,
        type: "game",
        title: "New player joined! 🎮",
        message: `A player has paid and joined your game "${game.title}".`,
        link: `/game/${payment.game_id}`,
      });
    }
  } catch (e) {
    console.error("game notifications failed", e);
  }
}
