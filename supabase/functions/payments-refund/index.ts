import { handlePreflight } from "../_shared/cors.ts";
import { json, errorResponse, makeLogger } from "../_shared/http.ts";
import { requireUser, HttpError } from "../_shared/auth.ts";
import { adminClient } from "../_shared/supabase.ts";
import { getProvider } from "../_shared/providers/registry.ts";
import { refundAmountMinor } from "../_shared/refund-policy.ts";

const log = makeLogger("payments-refund");

/**
 * Cancels a confirmed booking and refunds per the policy snapshot.
 * Callable by: the booking's player, the venue owner, or an admin.
 * Body: { bookingId, reason? }
 *
 * Ameria: API refund. Idram: no API — payment goes to refund_pending and an
 * admin completes it manually in the merchant cabinet, then confirms.
 */
Deno.serve(async (req) => {
  const preflight = handlePreflight(req);
  if (preflight) return preflight;

  try {
    const { user } = await requireUser(req);
    const { bookingId, reason } = await req.json();
    if (!bookingId) return errorResponse(req, "bookingId required", 400);

    const admin = adminClient();
    const { data: booking } = await admin
      .from("bookings")
      .select("*, venues:venue_uuid (owner_id, name)")
      .eq("id", bookingId)
      .single();
    if (!booking) return errorResponse(req, "booking not found", 404);

    const isPlayer = booking.user_id === user.id;
    const isOwner = booking.venues?.owner_id === user.id;
    const { data: adminRole } = await admin
      .from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
    const isAdmin = !!adminRole;
    if (!isPlayer && !isOwner && !isAdmin) return errorResponse(req, "forbidden", 403);

    if (booking.status !== "confirmed") {
      return errorResponse(req, `booking is ${booking.status}, not cancellable`, 409);
    }

    const { data: payment } = await admin
      .from("payments")
      .select("*")
      .eq("booking_id", bookingId)
      .eq("status", "paid")
      .maybeSingle();

    const cancelledBy: "player" | "owner" = isPlayer && !isOwner ? "player" : "owner";
    const newStatus = cancelledBy === "player" ? "cancelled_by_player" : "cancelled_by_owner";

    if (!payment) {
      // Nothing was paid (legacy/manual booking) — just cancel.
      await admin.from("bookings")
        .update({ status: newStatus, notes: reason ?? booking.notes, updated_at: new Date().toISOString() })
        .eq("id", bookingId);
      return json(req, { status: newStatus, refundMinor: 0 });
    }

    const refundMinor = refundAmountMinor(
      payment.amount_minor,
      booking.cancellation_policy,
      new Date(booking.starts_at),
      new Date(),
      cancelledBy,
    );

    // Cancel the booking first — frees the slot regardless of refund outcome.
    await admin.from("bookings")
      .update({ status: newStatus, notes: reason ?? booking.notes, updated_at: new Date().toISOString() })
      .eq("id", bookingId);

    if (refundMinor <= 0) {
      log("no refund due", { bookingId });
      return json(req, { status: newStatus, refundMinor: 0 });
    }

    const provider = getProvider(payment.provider);
    const result = await provider.refund({
      providerPaymentId: payment.provider_payment_id ?? "",
      amountMinor: refundMinor,
    });

    const ownerId = booking.venues?.owner_id ?? null;
    const currency = payment.currency ?? "AMD";

    if (result.manual) {
      // Idram: queue for manual refund in the merchant cabinet.
      await admin.from("payments")
        .update({ status: "refund_pending", updated_at: new Date().toISOString() })
        .eq("id", payment.id);
      await admin.from("notifications").insert({
        user_id: booking.user_id,
        type: "booking",
        title: "Refund in progress",
        message: `Your refund of ${(refundMinor / 100).toLocaleString()} AMD is being processed (1-3 business days).`,
        link: `/booking/${bookingId}/status`,
      });
      log("manual refund queued", { bookingId, refundMinor });
      return json(req, { status: newStatus, refundMinor, manual: true });
    }

    if (!result.ok) {
      log("provider refund failed", { bookingId, raw: result.raw });
      await admin.from("payments")
        .update({ status: "refund_pending", error_code: "provider_refund_failed", updated_at: new Date().toISOString() })
        .eq("id", payment.id);
      return errorResponse(req, "refund failed — queued for manual processing", 502);
    }

    const fullRefund = refundMinor >= payment.amount_minor;
    await admin.from("payments")
      .update({
        status: fullRefund ? "refunded" : "partially_refunded",
        refunded_minor: refundMinor,
        updated_at: new Date().toISOString(),
      })
      .eq("id", payment.id);

    // Ledger: money out of the platform, and the owner's earning share reversed.
    const ownerShareOfRefund = Math.min(
      booking.owner_amount_minor ?? 0,
      Math.round(refundMinor * ((booking.owner_amount_minor ?? 0) / payment.amount_minor)),
    );
    await admin.from("ledger_entries").insert([
      {
        entry_type: "refund",
        payment_id: payment.id,
        booking_id: bookingId,
        owner_id: null,
        amount_minor: -refundMinor,
        currency,
        memo: `Refund for booking ${bookingId} (${cancelledBy} cancelled)`,
      },
      {
        entry_type: "owner_refund_debit",
        payment_id: payment.id,
        booking_id: bookingId,
        owner_id: ownerId,
        amount_minor: -ownerShareOfRefund,
        currency,
        memo: `Earning reversal for refunded booking ${bookingId}`,
      },
    ]);

    await admin.from("notifications").insert({
      user_id: booking.user_id,
      type: "booking",
      title: "Booking cancelled — refund issued",
      message: `${(refundMinor / 100).toLocaleString()} AMD is on its way back to your card.`,
      link: `/booking/${bookingId}/status`,
    });

    log("refunded", { bookingId, refundMinor, fullRefund });
    return json(req, { status: newStatus, refundMinor, manual: false });
  } catch (error) {
    if (error instanceof HttpError) return errorResponse(req, error.message, error.status);
    log("ERROR", { message: error instanceof Error ? error.message : String(error) });
    return errorResponse(req, "refund failed", 500);
  }
});
