import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { requireCronSecret, HttpError } from "../_shared/auth.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface BookingConfirmationRequest {
  email: string;
  venueName: string;
  bookingDate: string;
  bookingTime: string;
  totalPrice: number;
  bookingId: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Internal-only: called by payment verification / booking flows, never by browsers.
    requireCronSecret(req);

    const { email, venueName, bookingDate, bookingTime, totalPrice, bookingId }: BookingConfirmationRequest = await req.json();

    console.log("Sending booking confirmation to:", email);

    const formattedDate = new Date(bookingDate).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
          .booking-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .detail-row { padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
          .detail-row:last-child { border-bottom: none; }
          .label { color: #6b7280; }
          .value { font-weight: 600; float: right; }
          .total { font-size: 1.25rem; color: #10b981; }
          .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 0.875rem; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0;">🎉 Booking Confirmed!</h1>
            <p style="margin: 10px 0 0;">Your venue has been successfully booked</p>
          </div>
          <div class="content">
            <p>Hi there,</p>
            <p>Great news! Your booking at <strong>${venueName}</strong> has been confirmed.</p>
            
            <div class="booking-details">
              <div class="detail-row">
                <span class="label">Venue</span>
                <span class="value">${venueName}</span>
              </div>
              <div class="detail-row">
                <span class="label">Date</span>
                <span class="value">${formattedDate}</span>
              </div>
              <div class="detail-row">
                <span class="label">Time</span>
                <span class="value">${bookingTime}</span>
              </div>
              <div class="detail-row">
                <span class="label">Booking ID</span>
                <span class="value">${bookingId.substring(0, 8)}...</span>
              </div>
              <div class="detail-row">
                <span class="label">Total Paid</span>
                <span class="value total">֏${Math.round(totalPrice).toLocaleString()}</span>
              </div>
            </div>
            
            <p>We can't wait to see you there! If you need to make any changes to your booking, please visit your dashboard.</p>
            
            <div class="footer">
              <p>Thank you for choosing SportsBnB!</p>
              <p>If you have any questions, feel free to contact us.</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "SportsBnB <onboarding@resend.dev>",
        to: [email],
        subject: `Booking Confirmed - ${venueName}`,
        html: htmlContent,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error("Resend API error:", data);
      throw new Error(data.message || "Failed to send email");
    }

    console.log("Email sent successfully:", data);

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: unknown) {
    if (error instanceof HttpError) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: error.status,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error sending confirmation email:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
