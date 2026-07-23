import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireCronSecret, HttpError } from "../_shared/auth.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  type: "booking_created" | "booking_cancelled" | "booking_reminder";
  bookingId: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    requireCronSecret(req);

    const { type, bookingId }: NotificationRequest = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get booking details
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select("*")
      .eq("id", bookingId)
      .single();

    if (bookingError || !booking) {
      console.error("Booking not found:", bookingId);
      return new Response(JSON.stringify({ error: "Booking not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get venue owner info
    const { data: venue } = await supabase
      .from("venues")
      .select("owner_id, name")
      .eq("id", booking.venue_id)
      .single();

    // Get owner email
    let ownerEmail: string | null = null;
    if (venue?.owner_id) {
      const { data: ownerProfile } = await supabase
        .from("profiles")
        .select("email")
        .eq("user_id", venue.owner_id)
        .single();
      ownerEmail = ownerProfile?.email || null;
    }

    // Get customer email
    const customerEmail = booking.customer_email;

    const formattedDate = new Date(booking.booking_date).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const emails: Promise<any>[] = [];

    if (type === "booking_created") {
      // Email to customer
      if (customerEmail) {
        const customerHtml = generateCustomerConfirmationEmail(booking, formattedDate);
        emails.push(sendEmail(customerEmail, `Booking Confirmed - ${booking.venue_name}`, customerHtml));
      }

      // Email to owner
      if (ownerEmail) {
        const ownerHtml = generateOwnerNotificationEmail(booking, formattedDate, "New Booking");
        emails.push(sendEmail(ownerEmail, `New Booking - ${booking.venue_name}`, ownerHtml));
      }
    } else if (type === "booking_cancelled") {
      // Email to customer
      if (customerEmail) {
        const customerHtml = generateCancellationEmail(booking, formattedDate);
        emails.push(sendEmail(customerEmail, `Booking Cancelled - ${booking.venue_name}`, customerHtml));
      }

      // Email to owner
      if (ownerEmail) {
        const ownerHtml = generateOwnerNotificationEmail(booking, formattedDate, "Booking Cancelled");
        emails.push(sendEmail(ownerEmail, `Booking Cancelled - ${booking.venue_name}`, ownerHtml));
      }
    } else if (type === "booking_reminder") {
      if (customerEmail) {
        const reminderHtml = generateReminderEmail(booking, formattedDate);
        emails.push(sendEmail(customerEmail, `Reminder: Booking Tomorrow - ${booking.venue_name}`, reminderHtml));
      }
    }

    const results = await Promise.allSettled(emails);
    const successCount = results.filter(r => r.status === "fulfilled").length;

    console.log(`Sent ${successCount}/${results.length} notification emails for booking ${bookingId}`);

    return new Response(JSON.stringify({ success: true, emailsSent: successCount }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    if (error instanceof HttpError) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: error.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    console.error("Notification error:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function sendEmail(to: string, subject: string, html: string) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: "SportsBnB <onboarding@resend.dev>",
      to: [to],
      subject,
      html,
    }),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || "Failed to send email");
  }

  return res.json();
}

function generateCustomerConfirmationEmail(booking: any, formattedDate: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
        .booking-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
        .detail-row { padding: 12px 0; border-bottom: 1px solid #e5e7eb; display: flex; justify-content: space-between; }
        .detail-row:last-child { border-bottom: none; }
        .label { color: #6b7280; }
        .value { font-weight: 600; color: #111827; }
        .total { font-size: 1.25rem; color: #10b981; }
        .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 0.875rem; }
        .button { display: inline-block; background: #10b981; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin: 0; font-size: 24px;">🎉 Booking Confirmed!</h1>
          <p style="margin: 10px 0 0; opacity: 0.9;">Your venue has been successfully booked</p>
        </div>
        <div class="content">
          <p>Hi ${booking.customer_name || "there"},</p>
          <p>Great news! Your booking at <strong>${booking.venue_name}</strong> has been confirmed.</p>
          
          <div class="booking-details">
            <div class="detail-row">
              <span class="label">Venue</span>
              <span class="value">${booking.venue_name}</span>
            </div>
            <div class="detail-row">
              <span class="label">Date</span>
              <span class="value">${formattedDate}</span>
            </div>
            <div class="detail-row">
              <span class="label">Time</span>
              <span class="value">${booking.booking_time}</span>
            </div>
            <div class="detail-row">
              <span class="label">Duration</span>
              <span class="value">${booking.duration_hours} hour${booking.duration_hours > 1 ? 's' : ''}</span>
            </div>
            <div class="detail-row">
              <span class="label">Booking ID</span>
              <span class="value">${booking.id.substring(0, 8).toUpperCase()}</span>
            </div>
            <div class="detail-row">
              <span class="label">Total</span>
              <span class="value total">$${booking.total_price.toFixed(2)}</span>
            </div>
          </div>
          
          <p>We can't wait to see you there! Please arrive a few minutes early.</p>
          
          <div class="footer">
            <p>Thank you for choosing SportsBnB!</p>
            <p>If you need to make changes, please visit your dashboard or contact us.</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}

function generateOwnerNotificationEmail(booking: any, formattedDate: string, title: string): string {
  const statusColor = title === "New Booking" ? "#10b981" : "#ef4444";
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: ${statusColor}; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
        .booking-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
        .detail-row { padding: 12px 0; border-bottom: 1px solid #e5e7eb; display: flex; justify-content: space-between; }
        .detail-row:last-child { border-bottom: none; }
        .label { color: #6b7280; }
        .value { font-weight: 600; color: #111827; }
        .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 0.875rem; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin: 0; font-size: 24px;">${title === "New Booking" ? "📅" : "❌"} ${title}</h1>
          <p style="margin: 10px 0 0; opacity: 0.9;">${booking.venue_name}</p>
        </div>
        <div class="content">
          <p>Hi there,</p>
          <p>You have a ${title.toLowerCase()} for <strong>${booking.venue_name}</strong>.</p>
          
          <div class="booking-details">
            <div class="detail-row">
              <span class="label">Customer</span>
              <span class="value">${booking.customer_name || "N/A"}</span>
            </div>
            <div class="detail-row">
              <span class="label">Email</span>
              <span class="value">${booking.customer_email || "N/A"}</span>
            </div>
            <div class="detail-row">
              <span class="label">Phone</span>
              <span class="value">${booking.customer_phone || "N/A"}</span>
            </div>
            <div class="detail-row">
              <span class="label">Date</span>
              <span class="value">${formattedDate}</span>
            </div>
            <div class="detail-row">
              <span class="label">Time</span>
              <span class="value">${booking.booking_time} (${booking.duration_hours}h)</span>
            </div>
            <div class="detail-row">
              <span class="label">Total</span>
              <span class="value">$${booking.total_price.toFixed(2)}</span>
            </div>
            ${booking.notes ? `
            <div class="detail-row">
              <span class="label">Notes</span>
              <span class="value">${booking.notes}</span>
            </div>
            ` : ''}
          </div>
          
          <div class="footer">
            <p>Log in to your dashboard for more details.</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}

function generateCancellationEmail(booking: any, formattedDate: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #ef4444; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
        .booking-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
        .detail-row { padding: 12px 0; border-bottom: 1px solid #e5e7eb; display: flex; justify-content: space-between; }
        .detail-row:last-child { border-bottom: none; }
        .label { color: #6b7280; }
        .value { font-weight: 600; color: #111827; text-decoration: line-through; }
        .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 0.875rem; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin: 0; font-size: 24px;">❌ Booking Cancelled</h1>
          <p style="margin: 10px 0 0; opacity: 0.9;">Your booking has been cancelled</p>
        </div>
        <div class="content">
          <p>Hi ${booking.customer_name || "there"},</p>
          <p>Your booking at <strong>${booking.venue_name}</strong> has been cancelled.</p>
          
          <div class="booking-details">
            <div class="detail-row">
              <span class="label">Venue</span>
              <span class="value">${booking.venue_name}</span>
            </div>
            <div class="detail-row">
              <span class="label">Date</span>
              <span class="value">${formattedDate}</span>
            </div>
            <div class="detail-row">
              <span class="label">Time</span>
              <span class="value">${booking.booking_time}</span>
            </div>
          </div>
          
          <p>If you didn't request this cancellation or have any questions, please contact us.</p>
          
          <div class="footer">
            <p>We hope to see you again soon!</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}

function generateReminderEmail(booking: any, formattedDate: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #3b82f6, #2563eb); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
        .booking-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
        .detail-row { padding: 12px 0; border-bottom: 1px solid #e5e7eb; display: flex; justify-content: space-between; }
        .detail-row:last-child { border-bottom: none; }
        .label { color: #6b7280; }
        .value { font-weight: 600; color: #111827; }
        .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 0.875rem; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin: 0; font-size: 24px;">⏰ Reminder: Booking Tomorrow</h1>
          <p style="margin: 10px 0 0; opacity: 0.9;">Don't forget your upcoming booking!</p>
        </div>
        <div class="content">
          <p>Hi ${booking.customer_name || "there"},</p>
          <p>This is a friendly reminder that you have a booking tomorrow at <strong>${booking.venue_name}</strong>.</p>
          
          <div class="booking-details">
            <div class="detail-row">
              <span class="label">Venue</span>
              <span class="value">${booking.venue_name}</span>
            </div>
            <div class="detail-row">
              <span class="label">Date</span>
              <span class="value">${formattedDate}</span>
            </div>
            <div class="detail-row">
              <span class="label">Time</span>
              <span class="value">${booking.booking_time}</span>
            </div>
            <div class="detail-row">
              <span class="label">Duration</span>
              <span class="value">${booking.duration_hours} hour${booking.duration_hours > 1 ? 's' : ''}</span>
            </div>
          </div>
          
          <p>Please arrive a few minutes early. We look forward to seeing you!</p>
          
          <div class="footer">
            <p>SportsBnB Team</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}