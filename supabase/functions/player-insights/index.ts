import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { AI_MODELS, chatCompletion } from "../_shared/ai.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
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

    // Cache check (1h)
    const today = new Date().toISOString().slice(0, 13); // hourly key
    const { data: cached } = await supabase
      .from("ai_insights_cache")
      .select("payload, expires_at")
      .eq("user_id", user.id)
      .eq("insight_type", "player_next_move")
      .eq("scope_key", today)
      .maybeSingle();

    if (cached && new Date(cached.expires_at) > new Date()) {
      return new Response(JSON.stringify(cached.payload), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, preferred_sports, skill_level, city, level, xp")
      .eq("user_id", user.id)
      .maybeSingle();

    const { data: intents } = await supabase
      .from("booking_intents")
      .select("venue_name, channel_used, lead_outcome, booking_date, booking_time, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10);

    const { data: gameRsvps } = await supabase
      .from("game_participants")
      .select("game_id, status, games!inner(title, sport, game_date, game_time, location, status)")
      .eq("user_id", user.id)
      .gte("games.game_date", new Date().toISOString().slice(0, 10))
      .limit(5);

    const ctx = {
      profile: profile || {},
      pending_inquiries: (intents || []).filter((i) => i.lead_outcome === "pending").length,
      recent_inquiries: intents || [],
      upcoming_games: gameRsvps || [],
      now: new Date().toISOString(),
    };

    const response = await chatCompletion({
      model: AI_MODELS.chat,
      messages: [
        {
          role: "system",
          content:
            "You are a sports concierge. Given a player's profile, pending venue bookings, and upcoming game RSVPs, decide the SINGLE most relevant 'Next Move' for them right now. Be specific, friendly, and action-oriented (under 18 words). Prefer urgent items: a game today/tomorrow, an unpaid booking hold about to expire, or a clear next step. Use tool calling.",
        },
        {
          role: "user",
          content: `Player context:\n${JSON.stringify(ctx, null, 2)}`,
        },
      ],
      tools: [
          {
            type: "function",
            function: {
              name: "next_move",
              description: "Return the player's next best action.",
              parameters: {
                type: "object",
                properties: {
                  headline: { type: "string", description: "Short bold statement (max 8 words)" },
                  detail: { type: "string", description: "Helpful one-liner (max 18 words)" },
                  cta_label: { type: "string", description: "Button text (max 3 words)" },
                  cta_link: {
                    type: "string",
                    description: "Internal route: /games, /discover, /messages, /dashboard, /profile",
                  },
                  vibe: { type: "string", enum: ["urgent", "positive", "neutral", "discovery"] },
                },
                required: ["headline", "detail", "cta_label", "cta_link", "vibe"],
                additionalProperties: false,
              },
            },
          },
        ],
      tool_choice: { type: "function", function: { name: "next_move" } },
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
    const payload = tc?.function?.arguments ? JSON.parse(tc.function.arguments) : {
      headline: "Find your next game",
      detail: "Browse open games near you and join one in seconds.",
      cta_label: "Explore",
      cta_link: "/games",
      vibe: "discovery",
    };

    // Cache 1h
    await supabase.from("ai_insights_cache").upsert(
      {
        user_id: user.id,
        insight_type: "player_next_move",
        scope_key: today,
        payload,
        expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      },
      { onConflict: "user_id,insight_type,scope_key" }
    );

    return new Response(JSON.stringify(payload), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("player-insights error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
