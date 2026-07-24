// Daily digest — sends one summary email + Telegram message at 08:00 local.
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { requireCronSecret, HttpError } from '../_shared/auth.ts';
import { sendRawEmail } from '../_shared/email.ts';
import { sendTelegramMessage } from '../_shared/telegram.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    requireCronSecret(req);
  } catch (e) {
    const status = e instanceof HttpError ? e.status : 401;
    return new Response(JSON.stringify({ error: 'unauthorized' }), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
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
    await sendRawEmail({
      from: 'Sportsbnb Autopilot <autopilot@sportsbnb.org>',
      to: cfg.digest_email,
      subject: `🤖 Autopilot digest — ${counts.sent} sent, ${counts.replied} replies`,
      html,
    });
  }
  if (cfg.telegram_chat_id) {
    const tgText = `<b>🤖 Daily digest</b>\nSent: ${counts.sent}  Replies: ${counts.replied}\nDiscovered: ${counts.discovered}  Researched: ${counts.researched}\nFollowups: ${counts.followup_1 + counts.followup_2}\nWon: ${counts.won}  Lost: ${counts.lost}`;
    await sendTelegramMessage({ chatId: cfg.telegram_chat_id, text: tgText });
  }
  await admin.from('autopilot_config').update({ last_digest_at: new Date().toISOString() }).eq('id', 1);
  return new Response(JSON.stringify({ ok: true, counts }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
});
