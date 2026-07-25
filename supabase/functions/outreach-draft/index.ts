import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { AI_MODELS, chatCompletion } from '../_shared/ai.ts';

const SYSTEM_EN = `You write warm, concise B2B outreach emails on behalf of the Sportsbnb team, a booking platform for sports venues. Founding offer: 0% commission for the first 3 months, then only 3% — Sportsbnb helps fill empty slots, brings new customers, and gives owners a free smart calendar and online booking widget. Write in a personal, direct tone. NEVER sound like a template. Reference one concrete detail about the venue from the research. Keep under 130 words. End with a soft CTA (15-min call or reply). Return ONLY JSON: { "subject": "...", "body": "..." } where body uses real line breaks (\\n).`;

const SYSTEM_HY = `Դու գրում ես ջերմ, հակիրճ B2B email-ներ Sportsbnb-ի թիմի անունից։ Հիմնադիր առաջարկ՝ առաջին 3 ամիսը 0% միջնորդավճար, հետո ընդամենը 3%։ Sportsbnb-ը օգնում է լրացնել դատարկ ժամերը, բերում է նոր հաճախորդներ և տալիս է անվճար խելացի օրացույց ու օնլայն ամրագրման վիջեթ։ Գրիր անձնական, ուղղակի տոնով։ ԵՐԲԵՔ չհնչիր ձևանմուշային։ Հղում արա մեկ կոնկրետ դետալի՝ վենյուի վերաբերյալ։ Մինչև 130 բառ։ Ավարտիր մեղմ CTA-ով (15-րոպեանոց զանգ կամ պատասխան)։ Վերադարձրու ՄԻԱՅՆ JSON՝ { "subject": "...", "body": "..." } որտեղ body-ն օգտագործում է իրական տողանջատումներ (\\n)։`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const auth = req.headers.get('Authorization');
    if (!auth) return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const isInternal = auth === `Bearer ${serviceRole}`;
    if (!isInternal) {
      const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: auth } } });
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      const { data: roles } = await supabase.from('user_roles').select('role').eq('user_id', user.id).eq('role', 'admin').maybeSingle();
      if (!roles) return new Response(JSON.stringify({ error: 'forbidden' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { target_id } = await req.json();
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { data: target } = await admin.from('outreach_targets').select('*').eq('id', target_id).single();
    if (!target) return new Response(JSON.stringify({ error: 'target not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const lang = target.language === 'hy' ? 'hy' : 'en';
    const system = lang === 'hy' ? SYSTEM_HY : SYSTEM_EN;

    const ctx = {
      venue: target.name,
      city: target.city,
      enriched: target.enriched,
      research: target.research,
      contact_name: target.contact_name,
    };

    const r = await chatCompletion({
      model: AI_MODELS.chat,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: `Write the outreach email. Venue context:\n${JSON.stringify(ctx, null, 2)}` },
      ],
      response_format: { type: 'json_object' },
    });
    if (r.status === 429) return new Response(JSON.stringify({ error: 'Rate limit. Try again in a moment.' }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    if (r.status === 402) return new Response(JSON.stringify({ error: 'AI credits exhausted.' }), { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    const d = await r.json();
    if (!r.ok) throw new Error(`AI ${r.status}: ${JSON.stringify(d)}`);

    let draft: { subject?: string; body?: string } = {};
    try { draft = JSON.parse(d.choices?.[0]?.message?.content || '{}'); } catch { draft = {}; }
    if (!draft.subject || !draft.body) throw new Error('AI did not return subject and body');

    await admin.from('outreach_targets').update({
      ai_subject: draft.subject, ai_body: draft.body,
      status: ['new','enriched','researched'].includes(target.status) ? 'drafted' : target.status,
    }).eq('id', target_id);

    return new Response(JSON.stringify({ success: true, subject: draft.subject, body: draft.body }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    console.error('draft error', e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'unknown' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
