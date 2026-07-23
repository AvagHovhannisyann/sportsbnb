import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const venueId = url.searchParams.get("venueId");
    const date = url.searchParams.get("date");

    if (!venueId) {
      return new Response(JSON.stringify({ error: "venueId required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Get venue details
    const { data: venue, error: venueError } = await supabase
      .from("venues")
      .select("id, name, address, city, sports, price_per_hour, image_url, description")
      .eq("id", venueId)
      .eq("is_active", true)
      .single();

    if (venueError || !venue) {
      return new Response(JSON.stringify({ error: "Venue not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get venue hours
    const { data: hours } = await supabase
      .from("venue_hours")
      .select("*")
      .eq("venue_id", venueId);

    // Get venue policies
    const { data: policies } = await supabase
      .from("venue_policies")
      .select("*")
      .eq("venue_id", venueId)
      .single();

    // If date provided, get availability for that date
    const availability: any[] = [];
    if (date) {
      const dayOfWeek = new Date(date).getDay();
      const venueHoursForDay = hours?.find(h => h.day_of_week === dayOfWeek);

      if (venueHoursForDay && !venueHoursForDay.is_closed) {
        // Get existing bookings for that date
        const { data: bookings } = await supabase
          .from("bookings")
          .select("booking_time, duration_hours")
          .eq("venue_id", venueId)
          .eq("booking_date", date)
          .in("status", ["confirmed", "pending"]);

        // Check blocked dates
        const { data: blockedDates } = await supabase
          .from("blocked_dates")
          .select("*")
          .eq("venue_id", venueId)
          .eq("blocked_date", date);

        if (!blockedDates || blockedDates.length === 0) {
          // Generate available time slots
          const increment = policies?.time_slot_increment || 60;
          const minDuration = policies?.min_duration_hours || 1;
          const openTime = venueHoursForDay.open_time;
          const closeTime = venueHoursForDay.close_time;

          const [openHour, openMin] = openTime.split(":").map(Number);
          const [closeHour, closeMin] = closeTime.split(":").map(Number);

          const openMinutes = openHour * 60 + openMin;
          const closeMinutes = closeHour * 60 + closeMin;

          for (let time = openMinutes; time < closeMinutes - minDuration * 60; time += increment) {
            const hours = Math.floor(time / 60);
            const mins = time % 60;
            const slotTime = `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`;

            // Check if slot is booked
            const isBooked = bookings?.some(b => {
              const [bHour, bMin] = b.booking_time.split(":").map(Number);
              const bookingStart = bHour * 60 + bMin;
              const bookingEnd = bookingStart + b.duration_hours * 60;
              return time >= bookingStart && time < bookingEnd;
            });

            availability.push({
              time: slotTime,
              available: !isBooked,
            });
          }
        }
      }
    }

    return new Response(JSON.stringify({
      venue: {
        id: venue.id,
        name: venue.name,
        address: venue.address,
        city: venue.city,
        sports: venue.sports,
        pricePerHour: venue.price_per_hour,
        imageUrl: venue.image_url,
        description: venue.description,
      },
      hours: hours?.map(h => ({
        dayOfWeek: h.day_of_week,
        openTime: h.open_time,
        closeTime: h.close_time,
        isClosed: h.is_closed,
      })),
      policies: policies ? {
        minDuration: policies.min_duration_hours,
        maxDuration: policies.max_duration_hours,
        timeSlotIncrement: policies.time_slot_increment,
        cancellationHours: policies.cancellation_hours,
      } : null,
      availability,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Widget data error:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});