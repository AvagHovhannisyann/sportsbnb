// Daily digest — sends one summary email + Telegram message at 08:00 local.
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')!;
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!;
const TELEGRAM_API_KEY = Deno.env.get('TELEGRAM_API_KEY')!;

const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const { data: cfg } = await admin.from('autopilot_config').select('*').eq('id', 1).single();
  if (!cfg) return new Response(JSON.stringify({ error: 'no config' }), { status: 500 });

  const since = new Date(Date.now() - 24 * 3600_000).toISOString();
  const counts: Record<string, number> = {};
  for (const kind of ['discovered','researched','sent','followup_1','followup_2','replied','won','lost','send_failed']) {
    const { count } = await admin.from('outreach_events').select('*', { count: 'exact', head: true }).eq('kind', kind).gte('created_at', since);
    counts[kind] = count ?? 0;
  }
  const { data: replies } = await admin.from('outreach_events')
    .select('payload, created_at, outreach_targets(name, city)')
    .eq('kind', 'replied').gte('created_at', since).limit(10);

  const lines = [
    `<h2>Sportsbnb Autopilot — Daily digest</h2>`,
    `<p>Last 24 hours:</p>`,
    `<ul>`,
    `<li>🔍 Discovered: <b>${counts.discovered}</b></li>`,
    `<li>🧠 Researched: <b>${counts.researched}</b></li>`,
    `<li>📨 Sent: <b>${counts.sent}</b></li>`,
    `<li>🔁 Followup 1: <b>${counts.followup_1}</b> · Followup 2: <b>${counts.followup_2}</b></li>`,
    `<li>💬 Replies: <b>${counts.replied}</b></li>`,
    `<li>✅ Won: <b>${counts.won}</b> · ❌ Lost: <b>${counts.lost}</b></li>`,
    `<li>⚠️ Send failures: <b>${counts.send_failed}</b></li>`,
    `</ul>`,
  ];
  if (replies?.length) {
    lines.push(`<h3>Top replies</h3><ul>`);
    for (const r of replies) lines.push(`<li><b>${(r.outreach_targets as any)?.name || '?'}</b> (${(r.outreach_targets as any)?.city || '?'}) — ${(r.payload as any)?.snippet?.slice(0,140) || ''}</li>`);
    lines.push(`</ul>`);
  }
  const html = lines.join('\n');

  if (cfg.digest_email) {
    await fetch('https://connector-gateway.lovable.dev/resend/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, 'X-Connection-Api-Key': RESEND_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'Sportsbnb Autopilot <autopilot@sportsbnb.org>',
        to: [cfg.digest_email],
        subject: `🤖 Autopilot digest — ${counts.sent} sent, ${counts.replied} replies`,
        html,
      }),
    });
  }
  if (cfg.telegram_chat_id) {
    const tgText = `<b>🤖 Daily digest</b>\nSent: ${counts.sent}  Replies: ${counts.replied}\nDiscovered: ${counts.discovered}  Researched: ${counts.researched}\nFollowups: ${counts.followup_1 + counts.followup_2}\nWon: ${counts.won}  Lost: ${counts.lost}`;
    await fetch('https://connector-gateway.lovable.dev/telegram/sendMessage', {
      method: 'POST',
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, 'X-Connection-Api-Key': TELEGRAM_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: cfg.telegram_chat_id, text: tgText, parse_mode: 'HTML' }),
    });
  }
  await admin.from('autopilot_config').update({ last_digest_at: new Date().toISOString() }).eq('id', 1);
  return new Response(JSON.stringify({ ok: true, counts }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
});
