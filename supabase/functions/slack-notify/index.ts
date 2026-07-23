import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { requireCronSecret, HttpError } from "../_shared/auth.ts";

const GATEWAY_URL = 'https://connector-gateway.lovable.dev/slack/api';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    requireCronSecret(req);
  } catch (e) {
    const status = e instanceof HttpError ? e.status : 401;
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  if (!LOVABLE_API_KEY) {
    return new Response(JSON.stringify({ error: 'LOVABLE_API_KEY is not configured' }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const SLACK_API_KEY = Deno.env.get('SLACK_API_KEY');
  if (!SLACK_API_KEY) {
    return new Response(JSON.stringify({ error: 'SLACK_API_KEY is not configured' }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { type, data, channel } = await req.json();

    let text = '';
    let blocks: any[] = [];

    switch (type) {
      case 'booking_created': {
        text = `🏟️ New Booking at ${data.venue_name}`;
        blocks = [
          {
            type: "header",
            text: { type: "plain_text", text: "🏟️ New Booking", emoji: true }
          },
          {
            type: "section",
            fields: [
              { type: "mrkdwn", text: `*Venue:*\n${data.venue_name}` },
              { type: "mrkdwn", text: `*Date:*\n${data.booking_date}` },
              { type: "mrkdwn", text: `*Time:*\n${data.booking_time}` },
              { type: "mrkdwn", text: `*Price:*\n֏${data.total_price?.toLocaleString()}` },
            ]
          }
        ];
        break;
      }
      case 'booking_cancelled': {
        text = `❌ Booking Cancelled at ${data.venue_name}`;
        blocks = [
          {
            type: "header",
            text: { type: "plain_text", text: "❌ Booking Cancelled", emoji: true }
          },
          {
            type: "section",
            fields: [
              { type: "mrkdwn", text: `*Venue:*\n${data.venue_name}` },
              { type: "mrkdwn", text: `*Date:*\n${data.booking_date}` },
            ]
          }
        ];
        break;
      }
      case 'game_created': {
        text = `⚽ New Game: ${data.title}`;
        blocks = [
          {
            type: "header",
            text: { type: "plain_text", text: "⚽ New Game Created", emoji: true }
          },
          {
            type: "section",
            fields: [
              { type: "mrkdwn", text: `*Game:*\n${data.title}` },
              { type: "mrkdwn", text: `*Sport:*\n${data.sport}` },
              { type: "mrkdwn", text: `*Date:*\n${data.game_date}` },
              { type: "mrkdwn", text: `*Location:*\n${data.location}` },
              { type: "mrkdwn", text: `*Players:*\n${data.max_players} max` },
              { type: "mrkdwn", text: `*Skill:*\n${data.skill_level}` },
            ]
          }
        ];
        break;
      }
      case 'game_joined': {
        text = `🎮 Player joined: ${data.title}`;
        blocks = [
          {
            type: "header",
            text: { type: "plain_text", text: "🎮 Player Joined Game", emoji: true }
          },
          {
            type: "section",
            text: { type: "mrkdwn", text: `*${data.player_name}* joined *${data.title}*` }
          }
        ];
        break;
      }
      default:
        text = data.message || 'SportsBnB notification';
    }

    const response = await fetch(`${GATEWAY_URL}/chat.postMessage`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'X-Connection-Api-Key': SLACK_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        channel: channel || 'general',
        text,
        blocks: blocks.length > 0 ? blocks : undefined,
        username: 'SportsBnB',
        icon_emoji: ':stadium:',
      }),
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(`Slack API call failed [${response.status}]: ${JSON.stringify(result)}`);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error sending Slack notification:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
