import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Not authenticated");
    const token = authHeader.replace("Bearer ", "");
    const { data: userData } = await supabase.auth.getUser(token);
    const user = userData.user;
    if (!user) throw new Error("User not found");

    const today = new Date().toISOString().slice(0, 10);
    const { data: cached } = await supabase
      .from("ai_insights_cache")
      .select("payload, expires_at")
      .eq("user_id", user.id)
      .eq("insight_type", "owner_coach")
      .eq("scope_key", today)
      .maybeSingle();

    if (cached && new Date(cached.expires_at) > new Date()) {
      return new Response(JSON.stringify(cached.payload), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: venues } = await supabase
      .from("venues")
      .select("id, name, description, sports, rating, review_count, image_url, is_active")
      .eq("owner_id", user.id);

    const venueIds = (venues || []).map((v) => v.id);

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: leads } = venueIds.length
      ? await supabase
          .from("booking_intents")
          .select("venue_id, channel_used, lead_outcome, created_at, outcome_updated_at")
          .in("venue_id", venueIds)
          .gte("created_at", sevenDaysAgo)
      : { data: [] as any[] };

    const { data: imageCounts } = venueIds.length
      ? await supabase.from("venue_images").select("venue_id").in("venue_id", venueIds)
      : { data: [] as any[] };

    const imgByVenue: Record<string, number> = {};
    (imageCounts || []).forEach((i: any) => {
      imgByVenue[i.venue_id] = (imgByVenue[i.venue_id] || 0) + 1;
    });

    const total = (leads || []).length;
    const responded = (leads || []).filter((l: any) => l.lead_outcome !== "pending").length;
    const confirmed = (leads || []).filter((l: any) => l.lead_outcome === "confirmed").length;

    const ctx = {
      venues: (venues || []).map((v) => ({
        id: v.id,
        name: v.name,
        rating: v.rating,
        review_count: v.review_count,
        photo_count: imgByVenue[v.id] || 0,
        description_length: v.description?.length || 0,
        has_image: !!v.image_url,
        is_active: v.is_active,
      })),
      leads_7d: total,
      response_rate: total ? Math.round((responded / total) * 100) : 0,
      confirmed_7d: confirmed,
      pending_count: total - responded,
    };

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content:
              "You are a venue growth coach for SportsBnb (WhatsApp-first marketplace, no in-app payments). Given an owner's portfolio + 7-day lead stats, generate 2-4 highly specific, actionable nudges to grow leads, improve response rate, or strengthen listings. Each tip must reference real numbers from the data. Friendly tone. Use tool calling.",
          },
          { role: "user", content: `Owner context:\n${JSON.stringify(ctx, null, 2)}` },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "owner_coach",
              description: "Return prioritized owner nudges.",
              parameters: {
                type: "object",
                properties: {
                  nudges: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string", description: "Short headline (max 10 words)" },
                        body: { type: "string", description: "Specific advice with a number (max 28 words)" },
                        priority: { type: "string", enum: ["high", "medium", "low"] },
                        category: {
                          type: "string",
                          enum: ["leads", "response", "listing", "reputation", "visibility"],
                        },
                      },
                      required: ["title", "body", "priority", "category"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["nudges"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "owner_coach" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429)
        return new Response(JSON.stringify({ error: "Rate limited" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      if (response.status === 402)
        return new Response(JSON.stringify({ error: "AI credits exhausted" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const ai = await response.json();
    const tc = ai.choices?.[0]?.message?.tool_calls?.[0];
    const payload = tc?.function?.arguments ? JSON.parse(tc.function.arguments) : { nudges: [] };

    await supabase.from("ai_insights_cache").upsert(
      {
        user_id: user.id,
        insight_type: "owner_coach",
        scope_key: today,
        payload,
        expires_at: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(),
      },
      { onConflict: "user_id,insight_type,scope_key" }
    );

    return new Response(JSON.stringify(payload), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("owner-coach error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
