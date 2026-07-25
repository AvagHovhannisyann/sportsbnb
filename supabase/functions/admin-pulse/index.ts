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

    // Verify admin role
    const { data: roleRow } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleRow) {
      return new Response(JSON.stringify({ error: "Not authorized" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const week = new Date().toISOString().slice(0, 10);
    const { data: cached } = await supabase
      .from("ai_insights_cache")
      .select("payload, expires_at")
      .eq("insight_type", "admin_pulse")
      .eq("scope_key", week)
      .is("user_id", null)
      .maybeSingle();

    if (cached && new Date(cached.expires_at) > new Date()) {
      return new Response(JSON.stringify(cached.payload), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();

    const [{ count: venuesActive }, { count: usersTotal }, { data: leads7d }, { data: leads14d }, { data: signups7d }, { data: topVenues }] = await Promise.all([
      supabase.from("venues").select("*", { count: "exact", head: true }).eq("is_active", true),
      supabase.from("profiles").select("*", { count: "exact", head: true }),
      supabase.from("booking_intents").select("venue_name, channel_used, lead_outcome, created_at").gte("created_at", sevenDaysAgo),
      supabase.from("booking_intents").select("id, created_at").gte("created_at", fourteenDaysAgo).lt("created_at", sevenDaysAgo),
      supabase.from("profiles").select("user_type, created_at").gte("created_at", sevenDaysAgo),
      supabase.from("venues").select("name, city, sports, rating").order("rating", { ascending: false }).limit(5),
    ]);

    const leadsThisWeek = (leads7d || []).length;
    const leadsLastWeek = (leads14d || []).length;
    const conversionRate = leadsThisWeek
      ? Math.round(
          ((leads7d || []).filter((l: any) => l.lead_outcome === "confirmed").length / leadsThisWeek) * 100
        )
      : 0;

    const ctx = {
      active_venues: venuesActive || 0,
      total_users: usersTotal || 0,
      leads_this_week: leadsThisWeek,
      leads_last_week: leadsLastWeek,
      week_over_week_change: leadsLastWeek
        ? Math.round(((leadsThisWeek - leadsLastWeek) / leadsLastWeek) * 100)
        : 0,
      conversion_rate_pct: conversionRate,
      new_signups_7d: (signups7d || []).length,
      signup_breakdown: {
        players: (signups7d || []).filter((s: any) => s.user_type === "player").length,
        owners: (signups7d || []).filter((s: any) => s.user_type === "owner").length,
      },
      top_venues: topVenues || [],
    };

    const response = await chatCompletion({
      model: AI_MODELS.chat,
      messages: [
        {
          role: "system",
          content:
            "You are SportsBnb's marketplace analyst. Given weekly KPIs, write a sharp executive brief: one headline insight, 2-3 trend observations, 1-2 strategic actions. Specific numbers only. No fluff. Use tool calling.",
        },
        { role: "user", content: `Marketplace metrics:\n${JSON.stringify(ctx, null, 2)}` },
      ],
      tools: [
          {
            type: "function",
            function: {
              name: "marketplace_brief",
              description: "Return weekly marketplace executive brief.",
              parameters: {
                type: "object",
                properties: {
                  headline: { type: "string", description: "One-sentence top insight (max 18 words)" },
                  trends: {
                    type: "array",
                    items: { type: "string", description: "One observation with numbers (max 22 words)" },
                  },
                  actions: {
                    type: "array",
                    items: { type: "string", description: "One action recommendation (max 22 words)" },
                  },
                  health: { type: "string", enum: ["healthy", "watch", "concern"] },
                },
                required: ["headline", "trends", "actions", "health"],
                additionalProperties: false,
              },
            },
          },
        ],
      tool_choice: { type: "function", function: { name: "marketplace_brief" } },
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
    const brief = tc?.function?.arguments
      ? JSON.parse(tc.function.arguments)
      : { headline: "No data yet", trends: [], actions: [], health: "watch" };

    const payload = { brief, kpis: ctx };

    await supabase.from("ai_insights_cache").upsert(
      {
        user_id: null,
        insight_type: "admin_pulse",
        scope_key: week,
        payload,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      },
      { onConflict: "insight_type,scope_key" }
    );

    return new Response(JSON.stringify(payload), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("admin-pulse error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
