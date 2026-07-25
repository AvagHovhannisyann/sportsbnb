import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { AI_MODELS, chatCompletion } from '../_shared/ai.ts';

async function scrapeWithFirecrawl(url: string): Promise<string | null> {
  const key = Deno.env.get('FIRECRAWL_API_KEY');
  if (!key) return null;
  try {
    const r = await fetch('https://api.firecrawl.dev/v2/scrape', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, formats: ['markdown'], onlyMainContent: true }),
    });
    const data = await r.json();
    return data?.markdown || data?.data?.markdown || null;
  } catch (e) { console.error('firecrawl fail', e); return null; }
}

async function fetchPlain(url: string): Promise<string | null> {
  try {
    const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 SportsbnbBot' }, signal: AbortSignal.timeout(15000) });
    if (!r.ok) return null;
    const html = await r.text();
    return html.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 8000);
  } catch { return null; }
}

function extractEmail(text: string): string | null {
  const match = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  return match?.[0]?.replace(/[.,;:)]+$/, '') ?? null;
}

async function summarize(text: string, venueName: string): Promise<Record<string, unknown>> {
  const r = await chatCompletion({
    model: AI_MODELS.chat,
    messages: [
      { role: 'system', content: 'Extract a concise JSON profile of a sports venue from raw website text. Return ONLY JSON with keys: summary (1-2 sentences), sports (array), unique_angle (1 sentence on what makes them special), owner_or_contact_name (string or null), contact_email (string or null), tone (formal|casual|professional). Only include contact_email if it appears in the website text.' },
      { role: 'user', content: `Venue: ${venueName}\n\nWebsite text:\n${text.slice(0, 6000)}` },
    ],
    response_format: { type: 'json_object' },
  });
  const d = await r.json();
  try { return JSON.parse(d.choices?.[0]?.message?.content || '{}'); } catch { return {}; }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const auth = req.headers.get('Authorization');
    if (!auth) return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: auth } } });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    const { data: roles } = await supabase.from('user_roles').select('role').eq('user_id', user.id).eq('role', 'admin').maybeSingle();
    if (!roles) return new Response(JSON.stringify({ error: 'forbidden' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const { target_id } = await req.json();
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { data: target } = await admin.from('outreach_targets').select('*').eq('id', target_id).single();
    if (!target) return new Response(JSON.stringify({ error: 'target not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const website = (target.enriched as Record<string, string> | null)?.website;
    let research: Record<string, unknown> = { source: 'none' };

    if (website) {
      const text = (await scrapeWithFirecrawl(website)) || (await fetchPlain(website));
      if (text) {
        const profile = await summarize(text, target.name);
        research = { source: Deno.env.get('FIRECRAWL_API_KEY') ? 'firecrawl' : 'direct', website, ...profile, contact_email: profile.contact_email || extractEmail(text) };
      } else {
        research = { source: 'failed', website, note: 'Could not fetch website' };
      }
    } else {
      research = { source: 'none', note: 'No website found in enrichment data' };
    }

    const contactName = typeof research.owner_or_contact_name === 'string' && research.owner_or_contact_name.trim()
      ? research.owner_or_contact_name.trim()
      : null;
    const contactEmail = typeof research.contact_email === 'string' && research.contact_email.trim()
      ? research.contact_email.trim()
      : null;

    await admin.from('outreach_targets').update({
      research,
      status: target.status === 'enriched' || target.status === 'new' ? 'researched' : target.status,
      contact_name: target.contact_name || contactName,
      contact_email: target.contact_email || contactEmail,
    }).eq('id', target_id);
    return new Response(JSON.stringify({ success: true, research }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    console.error('research error', e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'unknown' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
