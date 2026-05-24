// Resend inbound webhook — captures replies and classifies sentiment with Gemini.
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')!;
const TELEGRAM_API_KEY = Deno.env.get('TELEGRAM_API_KEY')!;

const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

async function classify(text: string): Promise<{ sentiment: 'positive'|'neutral'|'negative'|'unsubscribe'; summary: string }> {
  const r = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: 'Classify a reply to a B2B outreach email. Return JSON {sentiment: "positive"|"neutral"|"negative"|"unsubscribe", summary: "1 sentence"}.\nPositive = interested, wants call, asking questions. Negative = not interested. Unsubscribe = remove/stop.' },
        { role: 'user', content: text.slice(0, 4000) },
      ],
      response_format: { type: 'json_object' },
    }),
  });
  const d = await r.json();
  try { return JSON.parse(d.choices?.[0]?.message?.content || '{}'); } catch { return { sentiment: 'neutral', summary: text.slice(0,140) }; }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const payload = await req.json().catch(() => ({}));
  // Resend webhook events: type=email.bounced|email.replied (Resend Inbound webhook delivers parsed message)
  // We handle both Resend Inbound (parsed email) and event webhooks.
  const fromEmail: string = (payload.from || payload.data?.from || payload.headers?.from || '').toLowerCase().match(/[\w._%+-]+@[\w.-]+/)?.[0] || '';
  const text: string = payload.text || payload.data?.text || payload.html || payload.data?.html || '';
  const subject: string = payload.subject || payload.data?.subject || '';

  if (!fromEmail) return new Response(JSON.stringify({ ok: true, ignored: 'no_from' }));

  const { data: target } = await admin.from('outreach_targets').select('*').eq('contact_email', fromEmail).maybeSingle();
  if (!target) return new Response(JSON.stringify({ ok: true, ignored: 'no_target' }));

  const cls = await classify(text);
  await admin.from('outreach_targets').update({
    status: cls.sentiment === 'positive' ? 'replied_positive' : cls.sentiment === 'unsubscribe' ? 'unsubscribed' : 'replied',
    replied_at: new Date().toISOString(),
    reply_sentiment: cls.sentiment,
  }).eq('id', target.id);
  await admin.from('outreach_events').insert({ target_id: target.id, kind: 'replied', payload: { sentiment: cls.sentiment, summary: cls.summary, subject, snippet: text.slice(0, 300) } });

  // Notify Telegram immediately
  const { data: cfg } = await admin.from('autopilot_config').select('telegram_chat_id').eq('id', 1).single();
  if (cfg?.telegram_chat_id) {
    const emoji = cls.sentiment === 'positive' ? '🟢' : cls.sentiment === 'negative' ? '🔴' : cls.sentiment === 'unsubscribe' ? '⛔' : '🟡';
    const tgText = `${emoji} <b>Reply from ${target.name}</b> (${target.city || '?'})\n<i>${cls.sentiment}</i> — ${cls.summary}\n\n<code>${text.slice(0, 300).replace(/[<>&]/g, '')}</code>`;
    await fetch('https://connector-gateway.lovable.dev/telegram/sendMessage', {
      method: 'POST',
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, 'X-Connection-Api-Key': TELEGRAM_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: cfg.telegram_chat_id, text: tgText, parse_mode: 'HTML' }),
    });
  }

  return new Response(JSON.stringify({ ok: true, sentiment: cls.sentiment }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
});
