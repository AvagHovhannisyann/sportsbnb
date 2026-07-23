import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "npm:stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: userData } = await supabaseClient.auth.getUser(token);
    const user = userData.user;
    if (!user) throw new Error("User not authenticated");

    const { sessionId } = await req.json();

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Retrieve the checkout session with payment intent
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["payment_intent"],
    });

    if (session.payment_status !== "paid") {
      throw new Error("Payment not completed");
    }

    // Get payment intent ID for refunds
    const paymentIntent = session.payment_intent as Stripe.PaymentIntent;
    const paymentIntentId = typeof session.payment_intent === "string" 
      ? session.payment_intent 
      : paymentIntent?.id;

    // Check if booking already exists for this session
    const { data: existingBooking } = await supabaseClient
      .from("bookings")
      .select("*")
      .eq("user_id", user.id)
      .eq("venue_id", session.metadata?.venueId)
      .eq("booking_date", session.metadata?.bookingDate)
      .eq("booking_time", session.metadata?.bookingTime)
      .single();

    if (existingBooking) {
      return new Response(JSON.stringify({ booking: existingBooking }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const totalPrice = parseFloat(session.metadata?.price || "0");

    // Create the booking with payment_intent_id
    const { data: booking, error: bookingError } = await supabaseClient
      .from("bookings")
      .insert({
        user_id: user.id,
        venue_id: session.metadata?.venueId || "",
        venue_name: session.metadata?.venueName || "",
        booking_date: session.metadata?.bookingDate || "",
        booking_time: session.metadata?.bookingTime || "",
        duration_hours: 1,
        total_price: totalPrice,
        status: "confirmed",
        payment_intent_id: paymentIntentId,
      })
      .select()
      .single();

    if (bookingError) {
      console.error("Booking insert error:", bookingError);
      // Handle unique constraint violation (race condition - slot just booked)
      if (bookingError.code === '23505') {
        // Refund the payment since the slot is taken
        try {
          await stripe.refunds.create({
            payment_intent: paymentIntentId,
            reason: 'duplicate',
          });
        } catch (refundErr) {
          console.error("Refund failed after duplicate booking:", refundErr);
        }
        throw new Error("This time slot was just booked by another customer. Your payment has been refunded.");
      }
      throw new Error("Failed to create booking");
    }

    // Create in-app notification for the user
    const formattedDate = new Date(session.metadata?.bookingDate || "").toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
    
    try {
      await supabaseClient.from("notifications").insert({
        user_id: user.id,
        type: "booking",
        title: "Booking Confirmed! 🎉",
        message: `Your booking at ${session.metadata?.venueName} on ${formattedDate} at ${session.metadata?.bookingTime} has been confirmed.`,
        link: `/dashboard`,
      });
      console.log("Notification created for booking");
    } catch (notifError) {
      console.error("Failed to create notification:", notifError);
      // Don't throw - booking is still successful
    }

    // Send confirmation email
    const userEmail = session.metadata?.userEmail || user.email;
    if (userEmail) {
      try {
        const emailResponse = await fetch(
          `${Deno.env.get("SUPABASE_URL")}/functions/v1/send-booking-confirmation`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
            },
            body: JSON.stringify({
              email: userEmail,
              venueName: session.metadata?.venueName,
              bookingDate: session.metadata?.bookingDate,
              bookingTime: session.metadata?.bookingTime,
              totalPrice: totalPrice,
              bookingId: booking.id,
            }),
          }
        );
        console.log("Email confirmation sent:", await emailResponse.json());
      } catch (emailError) {
        console.error("Failed to send confirmation email:", emailError);
        // Don't throw - booking is still successful
      }
    }

    return new Response(JSON.stringify({ booking }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Verification error:", error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
