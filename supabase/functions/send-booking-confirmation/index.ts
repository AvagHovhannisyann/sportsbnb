import { requireCronSecret, HttpError } from "../_shared/auth.ts";
import { handlePreflight } from "../_shared/cors.ts";
import { json, errorResponse, makeLogger } from "../_shared/http.ts";
import { sendEmail, escapeHtml } from "../_shared/email.ts";

const log = makeLogger("send-booking-confirmation");

interface BookingConfirmationRequest {
  email: string;
  venueName: string;
  bookingDate: string;
  bookingTime: string;
  totalPrice: number;
  bookingId: string;
}

/** Internal-only: called by payment settlement, never by browsers. */
Deno.serve(async (req) => {
  const preflight = handlePreflight(req);
  if (preflight) return preflight;

  try {
    requireCronSecret(req);

    const { email, venueName, bookingDate, bookingTime, totalPrice, bookingId }: BookingConfirmationRequest =
      await req.json();

    if (!email || !venueName || !bookingId) {
      return errorResponse(req, "email, venueName, bookingId required", 400);
    }

    const formattedDate = new Date(bookingDate).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const appUrl = Deno.env.get("APP_BASE_URL") ?? "https://sportsbnb.org";

    const result = await sendEmail({
      to: email,
      subject: `Booking confirmed — ${venueName}`,
      content: {
        heading: "Your court is booked ✅",
        bodyHtml: `<p>Great news — your booking at <strong>${escapeHtml(venueName)}</strong> is confirmed and paid. Show up and play!</p>`,
        details: [
          ["Venue", venueName],
          ["Date", formattedDate],
          ["Time", bookingTime],
          ["Total paid", `֏${Number(totalPrice).toLocaleString()}`],
          ["Booking ID", bookingId.slice(0, 8).toUpperCase()],
        ],
        cta: { label: "View booking", url: `${appUrl}/booking/${bookingId}/status` },
        footerNote: "Please arrive a few minutes early. Cancellations follow the venue's policy.",
      },
    });

    if (!result.ok) {
      log("email failed", { error: result.error });
      return errorResponse(req, "Failed to send email", 502);
    }

    return json(req, { success: true });
  } catch (error) {
    if (error instanceof HttpError) return errorResponse(req, error.message, error.status);
    const message = error instanceof Error ? error.message : String(error);
    log("ERROR", { message });
    return errorResponse(req, message, 500);
  }
});
