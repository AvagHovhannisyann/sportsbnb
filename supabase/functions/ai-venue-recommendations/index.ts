import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { AI_MODELS, chatCompletion } from "../_shared/ai.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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

    // Get user profile
    const { data: profile } = await supabase.from("profiles").select("*").eq("user_id", user.id).single();

    // Get user's booking history
    const { data: bookings } = await supabase
      .from("bookings")
      .select("venue_id, venue_name, booking_date")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10);

    // Get all active venues
    const { data: venues } = await supabase
      .from("venues")
      .select("id, name, description, city, sports, price_per_hour, rating, review_count, is_indoor, amenities")
      .eq("is_active", true)
      .limit(50);

    const userContext = {
      preferred_sports: profile?.preferred_sports || [],
      skill_level: profile?.skill_level || "unknown",
      city: profile?.city || "unknown",
      recent_bookings: bookings?.map(b => b.venue_name) || [],
    };

    const response = await chatCompletion({
      model: AI_MODELS.chat,
      messages: [
        {
          role: "system",
          content: `You are a sports venue recommendation engine. Given a user's profile and available venues, recommend the top 3-5 venues. Use tool calling to return structured results.`,
        },
        {
          role: "user",
          content: `User profile: ${JSON.stringify(userContext)}\n\nAvailable venues: ${JSON.stringify(venues?.map(v => ({ id: v.id, name: v.name, sports: v.sports, city: v.city, rating: v.rating, price: v.price_per_hour, indoor: v.is_indoor })))}\n\nRecommend the best venues for this user with personalized reasons.`,
        },
      ],
      tools: [
          {
            type: "function",
            function: {
              name: "recommend_venues",
              description: "Return venue recommendations with reasons",
              parameters: {
                type: "object",
                properties: {
                  recommendations: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        venue_id: { type: "string" },
                        reason: { type: "string", description: "Short personalized reason (max 20 words)" },
                        match_score: { type: "number", description: "0-100 match percentage" },
                      },
                      required: ["venue_id", "reason", "match_score"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["recommendations"],
                additionalProperties: false,
              },
            },
          },
        ],
      tool_choice: { type: "function", function: { name: "recommend_venues" } },
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited, try again later" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiData = await response.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    
    let recommendations = [];
    if (toolCall?.function?.arguments) {
      const parsed = JSON.parse(toolCall.function.arguments);
      recommendations = parsed.recommendations || [];
    }

    // Enrich with full venue data
    const enriched = recommendations.map((rec: any) => {
      const venue = venues?.find(v => v.id === rec.venue_id);
      return { ...rec, venue };
    }).filter((r: any) => r.venue);

    return new Response(JSON.stringify({ recommendations: enriched }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("AI recommendation error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
