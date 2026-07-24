import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireCronSecret, HttpError } from "../_shared/auth.ts";
import { handlePreflight } from "../_shared/cors.ts";
import { json, errorResponse, makeLogger } from "../_shared/http.ts";
import { sendEmail, escapeHtml, EmailContent } from "../_shared/email.ts";

const log = makeLogger("booking-notifications");

interface NotificationRequest {
  type: "booking_created" | "booking_cancelled" | "booking_reminder";
  bookingId: string;
}

/** Internal-only: emails customer + owner about booking lifecycle events. */
Deno.serve(async (req) => {
  const preflight = handlePreflight(req);
  if (preflight) return preflight;

  try {
    requireCronSecret(req);

    const { type, bookingId }: NotificationRequest = await req.json();
    if (!type || !bookingId) return errorResponse(req, "type and bookingId required", 400);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select("*")
      .eq("id", bookingId)
      .single();
    if (bookingError || !booking) return errorResponse(req, "Booking not found", 404);

    const { data: venue } = await supabase
      .from("venues")
      .select("owner_id, name")
      .eq("id", booking.venue_uuid ?? booking.venue_id)
      .single();

    let ownerEmail: string | null = null;
    if (venue?.owner_id) {
      const { data: ownerProfile } = await supabase
        .from("profiles")
        .select("email")
        .eq("user_id", venue.owner_id)
        .single();
      ownerEmail = ownerProfile?.email || null;
    }

    const customerEmail = booking.customer_email;
    const formattedDate = new Date(booking.booking_date).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const details: Array<[string, string]> = [
      ["Venue", booking.venue_name],
      ["Date", formattedDate],
      ["Time", booking.booking_time],
      ["Duration", `${booking.duration_hours} hour${booking.duration_hours > 1 ? "s" : ""}`],
    ];
    const appUrl = Deno.env.get("APP_BASE_URL") ?? "https://sportsbnb.org";

    const jobs: Promise<{ ok: boolean }>[] = [];
    const customerName = booking.customer_name ? escapeHtml(booking.customer_name) : "there";

    const push = (to: string | null, subject: string, content: EmailContent) => {
      if (to) jobs.push(sendEmail({ to, subject, content }));
    };

    if (type === "booking_created") {
      push(customerEmail, `Booking confirmed — ${booking.venue_name}`, {
        heading: "Your court is booked ✅",
        bodyHtml: `<p>Hi ${customerName} — your booking at <strong>${escapeHtml(booking.venue_name)}</strong> is confirmed.</p>`,
        details,
        cta: { label: "View booking", url: `${appUrl}/booking/${booking.id}/status` },
      });
      push(ownerEmail, `New booking — ${booking.venue_name}`, {
        heading: "New confirmed booking 💰",
        bodyHtml: `<p>You have a new paid booking at <strong>${escapeHtml(booking.venue_name)}</strong>.</p>`,
        details,
        cta: { label: "Open dashboard", url: `${appUrl}/owner/bookings` },
      });
    } else if (type === "booking_cancelled") {
      push(customerEmail, `Booking cancelled — ${booking.venue_name}`, {
        heading: "Your booking was cancelled",
        bodyHtml: `<p>Your booking at <strong>${escapeHtml(booking.venue_name)}</strong> has been cancelled. Any refund follows the venue's cancellation policy and will be confirmed separately.</p>`,
        details,
      });
      push(ownerEmail, `Booking cancelled — ${booking.venue_name}`, {
        heading: "A booking was cancelled",
        bodyHtml: `<p>A booking at <strong>${escapeHtml(booking.venue_name)}</strong> has been cancelled — the slot is open again.</p>`,
        details,
        cta: { label: "Open schedule", url: `${appUrl}/owner/schedule` },
      });
    } else if (type === "booking_reminder") {
      push(customerEmail, `Reminder: booking tomorrow — ${booking.venue_name}`, {
        heading: "See you on the court tomorrow 🏟",
        bodyHtml: `<p>Just a reminder about your booking at <strong>${escapeHtml(booking.venue_name)}</strong>. Please arrive a few minutes early.</p>`,
        details,
        cta: { label: "View booking", url: `${appUrl}/booking/${booking.id}/status` },
      });
    }

    const results = await Promise.allSettled(jobs);
    const successCount = results.filter((r) => r.status === "fulfilled" && (r.value as { ok: boolean }).ok).length;
    log("sent", { bookingId, type, successCount, total: results.length });

    return json(req, { success: true, emailsSent: successCount });
  } catch (error) {
    if (error instanceof HttpError) return errorResponse(req, error.message, error.status);
    const message = error instanceof Error ? error.message : String(error);
    log("ERROR", { message });
    return errorResponse(req, message, 500);
  }
});
