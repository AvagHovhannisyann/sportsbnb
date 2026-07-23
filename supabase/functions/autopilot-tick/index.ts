// Autopilot tick — runs every 5 minutes via pg_cron.
// Returns immediately and processes work in the background (EdgeRuntime.waitUntil)
// so the HTTP request never hits the 150s gateway timeout.
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { requireCronSecret, HttpError } from '../_shared/auth.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const GOOGLE_MAPS_API_KEY = Deno.env.get('GOOGLE_MAPS_API_KEY_1') || Deno.env.get('GOOGLE_MAPS_API_KEY')!;
const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')!;
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY_1') || Deno.env.get('RESEND_API_KEY')!;
const TELEGRAM_API_KEY = Deno.env.get('TELEGRAM_API_KEY')!;
const FROM_EMAIL = Deno.env.get('OUTREACH_FROM_EMAIL') || 'Sportsbnb <hello@sportsbnb.org>';

const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

const SPORT_KEYWORDS = ['soccer field', 'football field', 'tennis court', 'basketball court', 'sports complex', 'sports center', 'futsal court', 'padel court', 'volleyball court'];

// Per-step budgets keep a single tick well under the function lifetime
const RESEARCH_BUDGET_MS = 90_000;
const SEND_BUDGET_MS = 60_000;
const MAX_RESEARCH_PER_TICK = 3;
const MAX_SEND_PER_TICK = 8;
const MAX_FOLLOWUPS_PER_TICK = 5;
const MAX_MULTI_CHANNEL_PINGS_PER_TICK = 5;

declare const EdgeRuntime: { waitUntil(p: Promise<unknown>): void } | undefined;

async function logEvent(target_id: string | null, kind: string, payload: Record<string, unknown> = {}) {
  await admin.from('outreach_events').insert({ target_id, kind, payload });
}

async function enqueueTelegram(text: string, extra: Record<string, unknown> = {}) {
  await admin.from('notifications_outbox').insert({
    channel: 'telegram',
    payload: { text, parse_mode: 'HTML', ...extra },
  });
}

async function flushNotifications(chatId: string | null) {
  if (!chatId) return;
  const { data: pending } = await admin.from('notifications_outbox').select('*').eq('status', 'pending').eq('channel', 'telegram').order('created_at').limit(30);
  for (const n of pending ?? []) {
    try {
      const p = n.payload as { text: string; parse_mode?: string; reply_markup?: unknown };
      const r = await fetch('https://connector-gateway.lovable.dev/telegram/sendMessage', {
        method: 'POST',
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, 'X-Connection-Api-Key': TELEGRAM_API_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: p.text,
          parse_mode: p.parse_mode || 'HTML',
          disable_web_page_preview: true,
          ...(p.reply_markup ? { reply_markup: p.reply_markup } : {}),
        }),
      });
      if (r.ok) {
        await admin.from('notifications_outbox').update({ status: 'sent', sent_at: new Date().toISOString() }).eq('id', n.id);
      } else {
        const errTxt = await r.text();
        await admin.from('notifications_outbox').update({ attempts: n.attempts + 1, last_error: errTxt.slice(0, 500) }).eq('id', n.id);
      }
    } catch (e) {
      await admin.from('notifications_outbox').update({ attempts: n.attempts + 1, last_error: String(e).slice(0, 500) }).eq('id', n.id);
    }
  }
}

// ---------- DISCOVER ----------
async function discoverVenues(cities: Array<{ city: string; country: string; lat: number; lng: number; radius_m: number }>): Promise<number> {
  let added = 0;
  for (const c of cities) {
    for (const kw of SPORT_KEYWORDS) {
      try {
        const r = await fetch('https://connector-gateway.lovable.dev/google_maps/places/v1/places:searchText', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'X-Connection-Api-Key': GOOGLE_MAPS_API_KEY,
            'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location,places.websiteUri,places.internationalPhoneNumber',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            textQuery: `${kw} in ${c.city}`,
            locationBias: { circle: { center: { latitude: c.lat, longitude: c.lng }, radius: c.radius_m } },
            maxResultCount: 10,
          }),
        });
        if (!r.ok) { console.error('places fail', r.status, await r.text().catch(() => '')); continue; }
        const data = await r.json();
        for (const p of data.places ?? []) {
          const placeId = p.id;
          const name = p.displayName?.text;
          if (!placeId || !name) continue;
          const { data: existing } = await admin.from('outreach_targets').select('id').eq('place_id', placeId).maybeSingle();
          if (existing) continue;
          const language = c.country === 'AM' ? 'hy' : 'en';
          const { data: inserted } = await admin.from('outreach_targets').insert({
            name,
            city: c.city,
            country: c.country,
            language,
            place_id: placeId,
            lat: p.location?.latitude,
            lng: p.location?.longitude,
            status: 'new',
            enriched: { address: p.formattedAddress, website: p.websiteUri, phone: p.internationalPhoneNumber },
          }).select('id').single();
          if (inserted) {
            await logEvent(inserted.id, 'discovered', { source: 'google_maps', query: kw, city: c.city });
            added++;
          }
        }
      } catch (e) { console.error('discover error', kw, c.city, e); }
    }
  }
  return added;
}

// ---------- RESEARCH ----------
async function researchTarget(targetId: string): Promise<{ ok: boolean; hasEmail: boolean }> {
  const r = await fetch(`${SUPABASE_URL}/functions/v1/outreach-prepare`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${SERVICE_ROLE}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ target_id: targetId }),
    signal: AbortSignal.timeout(120_000),
  });
  const data = await r.json().catch(() => ({}));
  const ok = r.ok && data.success;
  const hasEmail = !!data.contact_email;
  await logEvent(targetId, ok ? 'researched' : 'research_failed', { hasEmail, status: data.status });
  return { ok, hasEmail };
}

// ---------- SEND ----------
async function sendOutreach(target: { id: string; name: string; contact_email: string; contact_name: string | null; ai_subject: string; ai_body: string }, isFollowup = false, followupNum = 0): Promise<boolean> {
  const subject = isFollowup ? `Re: ${target.ai_subject}` : target.ai_subject;
  const greeting = target.contact_name ? `Hi ${target.contact_name.split(' ')[0]},` : 'Hi there,';
  const followupPrefix = isFollowup
    ? (followupNum === 1
        ? `Just floating this back up — wanted to make sure it didn't get buried.\n\n`
        : `One more nudge — happy to make this a 10-min call instead of email tag.\n\n`)
    : '';
  const bodyText = `${greeting}\n\n${followupPrefix}${target.ai_body}\n\n— The Sportsbnb Team\nhttps://sportsbnb.org`;
  const html = bodyText.split('\n').map((l) => l ? `<p>${l.replace(/&/g,'&amp;').replace(/</g,'&lt;')}</p>` : '').join('');

  const r = await fetch('https://connector-gateway.lovable.dev/resend/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, 'X-Connection-Api-Key': RESEND_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: [target.contact_email],
      subject,
      html,
      text: bodyText,
      reply_to: 'hello@sportsbnb.org',
      tags: [{ name: 'autopilot', value: isFollowup ? `followup_${followupNum}` : 'initial' }, { name: 'target_id', value: target.id }],
    }),
  });
  if (!r.ok) {
    const err = await r.text();
    await logEvent(target.id, 'send_failed', { error: err.slice(0, 500) });
    return false;
  }
  const sent = await r.json();
  if (isFollowup) {
    await admin.from('outreach_targets').update({
      status: `followup_${followupNum}`,
      last_contacted_at: new Date().toISOString(),
      last_followup_at: new Date().toISOString(),
      followup_count: followupNum,
    }).eq('id', target.id);
    await logEvent(target.id, `followup_${followupNum}`, { resend_id: sent.id });
  } else {
    await admin.from('outreach_targets').update({ status: 'sent', last_contacted_at: new Date().toISOString() }).eq('id', target.id);
    await logEvent(target.id, 'sent', { resend_id: sent.id, subject });
  }
  return true;
}

// ---------- MULTI-CHANNEL TAP-TO-REACH ----------
// For targets with no email but with phone / socials / contact form, push a
// Telegram message with inline-keyboard deep links so the user can ping the
// venue with one tap. This is the free, fully-autonomous non-email channel.
function buildChannelKeyboard(target: any): { inline_keyboard: Array<Array<Record<string, string>>> } | null {
  const research = (target.research ?? {}) as Record<string, any>;
  const enriched = (target.enriched ?? {}) as Record<string, any>;
  const socials = (research.socials ?? {}) as Record<string, string>;
  const phones: string[] = Array.isArray(research.candidate_phones) && research.candidate_phones.length
    ? research.candidate_phones
    : (enriched.phone ? [enriched.phone] : []);
  const formUrl: string | undefined = research.contact_form_url;
  const website: string | undefined = enriched.website || research.website;
  const pitchEn = `Hi! I'm from the Sportsbnb team. We're onboarding ${target.city ?? 'local'} venues with 0% commission for 3 months. Open to a quick chat?`;
  const pitchHy = `Բարև! Ես Sportsbnb-ի թիմից եմ։ Առաջին 3 ամիսը 0% միջնորդավճար։ Կարո՞ղ ենք կարճ զրուցել։`;
  const msg = target.language === 'hy' ? pitchHy : pitchEn;
  const enc = encodeURIComponent(msg);

  const rows: Array<Array<Record<string, string>>> = [];
  if (phones.length) {
    const phone = String(phones[0]).replace(/[^\d]/g, '');
    if (phone.length >= 8) {
      rows.push([
        { text: `💬 WhatsApp +${phone}`, url: `https://wa.me/${phone}?text=${enc}` },
      ]);
    }
  }
  if (socials.telegram) rows.push([{ text: '📨 Telegram', url: socials.telegram }]);
  if (socials.instagram) rows.push([{ text: '📷 Instagram DM', url: socials.instagram }]);
  if (socials.facebook) rows.push([{ text: '👍 Facebook', url: socials.facebook }]);
  if (formUrl) rows.push([{ text: '📝 Contact form', url: formUrl }]);
  if (website) rows.push([{ text: '🌐 Website', url: website }]);
  if (target.place_id) rows.push([{ text: '📍 Open in Maps', url: `https://www.google.com/maps/place/?q=place_id:${target.place_id}` }]);
  return rows.length ? { inline_keyboard: rows } : null;
}

async function pingMultiChannelTargets(): Promise<number> {
  // Any target without an email but with phone/website/social — surface once via Telegram.
  // Includes 'new' so we don't need research first (Google Maps already provides phone + website).
  const { data: targets } = await admin.from('outreach_targets')
    .select('id,name,city,country,language,research,enriched,status,place_id')
    .in('status', ['new', 'researched', 'unreachable'])
    .is('contact_email', null)
    .is('last_followup_at', null)
    .limit(MAX_MULTI_CHANNEL_PINGS_PER_TICK);
  let sent = 0;
  for (const t of targets ?? []) {
    const kb = buildChannelKeyboard(t);
    if (!kb) continue;
    const research = (t.research ?? {}) as Record<string, any>;
    const lines = [
      `<b>📡 ${t.name}</b>`,
      t.city ? `📍 ${t.city}` : null,
      research.summary ? `\n${String(research.summary).slice(0, 280)}` : null,
      `\n<i>Tap a channel below to message them now.</i>`,
    ].filter(Boolean).join('\n');
    await enqueueTelegram(lines, { reply_markup: kb });
    await admin.from('outreach_targets').update({
      last_followup_at: new Date().toISOString(),
      status: 'channel_pinged',
    }).eq('id', t.id);
    await logEvent(t.id, 'channel_pinged', { channels: kb.inline_keyboard.flat().map((b) => b.text) });
    sent++;
  }
  return sent;
}

// ---------- FOLLOWUPS ----------
async function processFollowups(dailyRemaining: { count: number }): Promise<number> {
  let count = 0;
  const now = new Date();
  const day3 = new Date(now.getTime() - 3 * 86400_000).toISOString();
  const { data: fu1 } = await admin.from('outreach_targets')
    .select('id,name,contact_email,contact_name,ai_subject,ai_body')
    .eq('status', 'sent')
    .eq('followup_count', 0)
    .lte('last_contacted_at', day3)
    .not('contact_email', 'is', null)
    .limit(Math.min(MAX_FOLLOWUPS_PER_TICK, Math.max(0, dailyRemaining.count)));
  for (const t of fu1 ?? []) {
    if (dailyRemaining.count <= 0) break;
    if (await sendOutreach(t as any, true, 1)) { count++; dailyRemaining.count--; }
  }
  const day7 = new Date(now.getTime() - 7 * 86400_000).toISOString();
  const { data: fu2 } = await admin.from('outreach_targets')
    .select('id,name,contact_email,contact_name,ai_subject,ai_body')
    .eq('status', 'followup_1')
    .lte('last_followup_at', day7)
    .limit(Math.min(MAX_FOLLOWUPS_PER_TICK, Math.max(0, dailyRemaining.count)));
  for (const t of fu2 ?? []) {
    if (dailyRemaining.count <= 0) break;
    if (await sendOutreach(t as any, true, 2)) { count++; dailyRemaining.count--; }
  }
  const day14 = new Date(now.getTime() - 14 * 86400_000).toISOString();
  const { data: lost } = await admin.from('outreach_targets')
    .select('id,name')
    .eq('status', 'followup_2')
    .lte('last_followup_at', day14);
  for (const t of lost ?? []) {
    await admin.from('outreach_targets').update({ status: 'lost' }).eq('id', t.id);
    await logEvent(t.id, 'lost', { reason: 'no_reply_after_2_followups' });
  }
  return count;
}

async function countSentToday(): Promise<number> {
  const since = new Date(Date.now() - 24 * 3600_000).toISOString();
  const { count } = await admin.from('outreach_events').select('*', { count: 'exact', head: true }).in('kind', ['sent', 'followup_1', 'followup_2']).gte('created_at', since);
  return count ?? 0;
}

// ---------- ORCHESTRATOR (background) ----------
async function runTick(runId: string, cfg: any) {
  const errors: Array<{ step: string; error: string }> = [];
  const counts = { discovered: 0, researched: 0, sent: 0, followups: 0, multi_channel: 0, replies: 0, bookings_handled: 0 };
  const tickStart = Date.now();

  try {
    // Discovery — at most once per hour
    const lastDiscover = await admin.from('outreach_events').select('created_at').eq('kind', 'discovered').order('created_at', { ascending: false }).limit(1).maybeSingle();
    const discoverAge = lastDiscover.data ? Date.now() - new Date(lastDiscover.data.created_at).getTime() : Infinity;
    if (discoverAge > 3600_000) {
      try { counts.discovered = await discoverVenues(cfg.target_cities as any); } catch (e) { errors.push({ step: 'discover', error: String(e) }); }
    }

    // Research (budgeted)
    const { data: newTargets } = await admin.from('outreach_targets').select('id').eq('status', 'new').limit(MAX_RESEARCH_PER_TICK);
    const researchStart = Date.now();
    for (const t of newTargets ?? []) {
      if (Date.now() - researchStart > RESEARCH_BUDGET_MS) break;
      try {
        const res = await researchTarget(t.id);
        if (res.ok) counts.researched++;
      } catch (e) { errors.push({ step: `research:${t.id}`, error: String(e).slice(0, 200) }); }
    }

    // Sends (respect daily cap)
    const sentToday = await countSentToday();
    const remaining = { count: Math.max(0, cfg.daily_send_cap - sentToday) };
    const { data: drafts } = await admin.from('outreach_targets')
      .select('id,name,contact_email,contact_name,ai_subject,ai_body')
      .eq('status', 'drafted')
      .not('contact_email', 'is', null)
      .not('ai_body', 'is', null)
      .limit(Math.min(MAX_SEND_PER_TICK, remaining.count));
    const sendStart = Date.now();
    for (const t of drafts ?? []) {
      if (remaining.count <= 0) break;
      if (Date.now() - sendStart > SEND_BUDGET_MS) break;
      try {
        if (await sendOutreach(t as any)) { counts.sent++; remaining.count--; }
      } catch (e) { errors.push({ step: `send:${t.id}`, error: String(e).slice(0, 200) }); }
    }

    // Multi-channel tap-to-reach pings
    try { counts.multi_channel = await pingMultiChannelTargets(); } catch (e) { errors.push({ step: 'multi_channel', error: String(e).slice(0, 200) }); }

    // Followups
    try { counts.followups = await processFollowups(remaining); } catch (e) { errors.push({ step: 'followups', error: String(e).slice(0, 200) }); }

    // Summary
    if (counts.discovered || counts.sent || counts.followups || counts.multi_channel) {
      const lines = [`<b>🤖 Autopilot tick</b>`];
      if (counts.discovered) lines.push(`🔍 Discovered: ${counts.discovered}`);
      if (counts.researched) lines.push(`🧠 Researched: ${counts.researched}`);
      if (counts.sent) lines.push(`📨 Emails sent: ${counts.sent}`);
      if (counts.multi_channel) lines.push(`📡 Multi-channel pings: ${counts.multi_channel}`);
      if (counts.followups) lines.push(`🔁 Followups: ${counts.followups}`);
      await enqueueTelegram(lines.join('\n'));
    }
    if (errors.length) {
      await enqueueTelegram(`<b>⚠️ Autopilot errors (${errors.length})</b>\n${errors.slice(0,3).map(e => `• ${e.step}: ${e.error.slice(0,100)}`).join('\n')}`);
    }

    await flushNotifications(cfg.telegram_chat_id);

    await admin.from('autopilot_runs').update({
      finished_at: new Date().toISOString(),
      status: errors.length ? 'partial' : 'ok',
      errors,
      ...counts,
    }).eq('id', runId);
    console.log('tick complete', { runId, counts, errors: errors.length, ms: Date.now() - tickStart });
  } catch (e) {
    await admin.from('autopilot_runs').update({
      finished_at: new Date().toISOString(),
      status: 'failed',
      errors: [...errors, { step: 'main', error: String(e).slice(0, 200) }],
    }).eq('id', runId);
    console.error('tick crashed', e);
  }
}

// ---------- HTTP ENTRYPOINT (returns immediately) ----------
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
  if (!cfg) return new Response(JSON.stringify({ error: 'no config' }), { status: 500, headers: corsHeaders });
  if (cfg.is_paused) {
    return new Response(JSON.stringify({ paused: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  // Skip if another tick started in the last 4 minutes and is still running
  const fourMinAgo = new Date(Date.now() - 4 * 60_000).toISOString();
  const { data: inflight } = await admin.from('autopilot_runs')
    .select('id').eq('status', 'running').gte('started_at', fourMinAgo).limit(1);
  if (inflight && inflight.length) {
    return new Response(JSON.stringify({ skipped: 'inflight' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  const { data: run } = await admin.from('autopilot_runs').insert({ status: 'running' }).select().single();
  const runId = run!.id;

  // Background the heavy work — HTTP returns now
  const task = runTick(runId, cfg);
  if (typeof EdgeRuntime !== 'undefined' && EdgeRuntime?.waitUntil) {
    EdgeRuntime.waitUntil(task);
  } else {
    // Fallback: detach (best-effort)
    task.catch((e) => console.error('tick bg error', e));
  }

  return new Response(JSON.stringify({ runId, backgrounded: true }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
