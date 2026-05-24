import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

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

async function summarize(text: string, venueName: string): Promise<Record<string, unknown>> {
  const r = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${Deno.env.get('LOVABLE_API_KEY')}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: 'Extract a concise JSON profile of a sports venue from raw website text. Return ONLY JSON with keys: summary (1-2 sentences), sports (array), unique_angle (1 sentence on what makes them special), owner_or_contact_name (string or null), tone (formal|casual|professional).' },
        { role: 'user', content: `Venue: ${venueName}\n\nWebsite text:\n${text.slice(0, 6000)}` },
      ],
      response_format: { type: 'json_object' },
    }),
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
        research = { source: Deno.env.get('FIRECRAWL_API_KEY') ? 'firecrawl' : 'direct', website, ...profile };
      } else {
        research = { source: 'failed', website, note: 'Could not fetch website' };
      }
    } else {
      research = { source: 'none', note: 'No website found in enrichment data' };
    }

    await admin.from('outreach_targets').update({ research, status: target.status === 'enriched' || target.status === 'new' ? 'researched' : target.status }).eq('id', target_id);
    return new Response(JSON.stringify({ success: true, research }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    console.error('research error', e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'unknown' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
