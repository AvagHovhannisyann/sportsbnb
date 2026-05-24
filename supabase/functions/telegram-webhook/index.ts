// Telegram bot webhook — handles /start, /pause, /resume, /status, /digest commands.
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')!;
const TELEGRAM_API_KEY = Deno.env.get('TELEGRAM_API_KEY')!;

const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

async function deriveSecret(): Promise<string> {
  const data = new TextEncoder().encode(`telegram-webhook:${TELEGRAM_API_KEY}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return btoa(String.fromCharCode(...new Uint8Array(digest))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

async function reply(chatId: number, text: string) {
  await fetch('https://connector-gateway.lovable.dev/telegram/sendMessage', {
    method: 'POST',
    headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, 'X-Connection-Api-Key': TELEGRAM_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const expected = await deriveSecret();
  const actual = req.headers.get('X-Telegram-Bot-Api-Secret-Token');
  if (actual !== expected) return new Response('Unauthorized', { status: 401 });

  const update = await req.json();
  const msg = update.message ?? update.edited_message;
  if (!msg?.chat?.id) return new Response(JSON.stringify({ ok: true }));

  const chatId = msg.chat.id;
  const text: string = (msg.text || '').trim();
  const cmd = text.split(/\s+/)[0].toLowerCase();

  try {
    if (cmd === '/start') {
      await admin.from('autopilot_config').update({ telegram_chat_id: String(chatId) }).eq('id', 1);
      await reply(chatId, '👋 <b>Sportsbnb Autopilot</b> linked.\n\nYou will receive realtime updates here.\n\nCommands:\n/status — current stats\n/pause — stop autopilot\n/resume — start autopilot\n/digest — send today\'s summary');
    } else if (cmd === '/pause') {
      await admin.from('autopilot_config').update({ is_paused: true }).eq('id', 1);
      await reply(chatId, '⏸ Autopilot <b>paused</b>. Use /resume to start again.');
    } else if (cmd === '/resume') {
      await admin.from('autopilot_config').update({ is_paused: false }).eq('id', 1);
      await reply(chatId, '▶️ Autopilot <b>resumed</b>.');
    } else if (cmd === '/status') {
      const { data: cfg } = await admin.from('autopilot_config').select('*').eq('id', 1).single();
      const since = new Date(Date.now() - 24 * 3600_000).toISOString();
      const { count: sentCount } = await admin.from('outreach_events').select('*', { count: 'exact', head: true }).in('kind', ['sent','followup_1','followup_2']).gte('created_at', since);
      const { count: discoveredCount } = await admin.from('outreach_events').select('*', { count: 'exact', head: true }).eq('kind', 'discovered').gte('created_at', since);
      const { count: repliedCount } = await admin.from('outreach_events').select('*', { count: 'exact', head: true }).eq('kind', 'replied').gte('created_at', since);
      const { count: targetCount } = await admin.from('outreach_targets').select('*', { count: 'exact', head: true });
      await reply(chatId, `<b>📊 Last 24h</b>\n🔍 Discovered: ${discoveredCount ?? 0}\n📨 Sent: ${sentCount ?? 0} / ${cfg?.daily_send_cap}\n💬 Replies: ${repliedCount ?? 0}\n📁 Total targets: ${targetCount ?? 0}\n\nStatus: ${cfg?.is_paused ? '⏸ paused' : '▶️ running'}`);
    } else if (cmd === '/digest') {
      await fetch(`${SUPABASE_URL}/functions/v1/daily-digest`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${SERVICE_ROLE}` },
      });
      await reply(chatId, '📧 Digest sent.');
    } else if (text) {
      await reply(chatId, 'Unknown command. Try /status, /pause, /resume, /digest.');
    }
  } catch (e) {
    console.error('telegram-webhook error', e);
    await reply(chatId, `❌ Error: ${String(e).slice(0, 200)}`);
  }

  return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' } });
});
