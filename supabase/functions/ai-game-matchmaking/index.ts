import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { AI_MODELS, chatCompletion } from "../_shared/ai.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { userId } = await req.json();
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("preferred_sports, skill_level, city")
      .eq("user_id", userId)
      .single();

    // NOTE: this used to fetch the caller's past games "for pattern
    // matching" and then never reference them — a full round trip per
    // invocation for a value that was discarded. Kept as `_pastGames` so the
    // intent is visible to whoever wires the matching up.
    const { data: _pastGames } = await supabase
      .from("game_participants")
      .select("game_id, games(sport, skill_level, location)")
      .eq("user_id", userId)
      .limit(20);

    // Get open games
    const today = new Date().toISOString().split("T")[0];
    const { data: openGames } = await supabase
      .from("games")
      .select("*")
      .eq("status", "open")
      .eq("is_public", true)
      .gte("game_date", today)
      .order("game_date", { ascending: true })
      .limit(50);

    if (!openGames || openGames.length === 0) {
      return new Response(JSON.stringify({ matches: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Score each game
    const preferredSports = profile?.preferred_sports || [];
    const userSkill = profile?.skill_level || "all";
    const userCity = profile?.city?.toLowerCase() || "";

    const scored = openGames
      .filter((g) => g.host_id !== userId) // Don't recommend own games
      .map((game) => {
        let score = 0;
        // Sport match
        if (preferredSports.includes(game.sport)) score += 30;
        // Skill match
        if (game.skill_level === "all" || game.skill_level === userSkill) score += 20;
        // Location match
        if (game.location?.toLowerCase().includes(userCity)) score += 25;
        // Recency bonus (sooner = better)
        const daysAway = Math.ceil((new Date(game.game_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        if (daysAway <= 2) score += 15;
        else if (daysAway <= 7) score += 10;
        // Not full
        score += 10;

        return { ...game, matchScore: score };
      })
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 5);

    // Use AI to generate personalized reason
    let aiReasons: Record<string, string> = {};

    if (Deno.env.get("OPENROUTER_API_KEY") && scored.length > 0) {
      try {
        const gameList = scored.map((g, i) => `${i + 1}. ${g.title} - ${g.sport} on ${g.game_date} at ${g.location} (${g.skill_level})`).join("\n");

        const aiResp = await chatCompletion({
          model: AI_MODELS.chatLite,
          messages: [
            { role: "system", content: "Generate a one-line personalized reason for each game match. Return JSON: {\"1\": \"reason\", \"2\": \"reason\", ...}. Be concise and friendly." },
            { role: "user", content: `User likes: ${preferredSports.join(", ") || "various sports"}, skill: ${userSkill}, city: ${userCity}.\n\nGames:\n${gameList}` },
          ],
        });

        if (aiResp.ok) {
          const aiData = await aiResp.json();
          const content = aiData.choices?.[0]?.message?.content || "";
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            aiReasons = JSON.parse(jsonMatch[0]);
          }
        }
      } catch (e) {
        console.error("AI reason generation failed:", e);
      }
    }

    const matches = scored.map((game, i) => ({
      ...game,
      matchReason: aiReasons[String(i + 1)] || (game.matchScore >= 50 ? "Great match for your preferences!" : "Recommended for you"),
    }));

    return new Response(JSON.stringify({ matches }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("matchmaking error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
