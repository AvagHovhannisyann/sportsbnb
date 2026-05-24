import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

const GW = 'https://connector-gateway.lovable.dev/resend';
const FROM = 'Sportsbnb <hello@sportsbnb.org>';
const REPLY_TO = 'support@sportsbnb.org';

function bodyToHtml(text: string): string {
  const esc = text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const paragraphs = esc.split(/\n{2,}/).map(p => `<p style="margin:0 0 14px 0;line-height:1.55;">${p.replace(/\n/g,'<br/>')}</p>`).join('');
  return `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;color:#111;max-width:560px;">${paragraphs}</div>`;
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

    const { target_id, to, subject, body } = await req.json();
    if (!target_id || !to || !subject || !body) {
      return new Response(JSON.stringify({ error: 'target_id, to, subject, body required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to)) {
      return new Response(JSON.stringify({ error: 'invalid email' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const r = await fetch(`${GW}/emails`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('LOVABLE_API_KEY')}`,
        'X-Connection-Api-Key': Deno.env.get('RESEND_API_KEY_1') || Deno.env.get('RESEND_API_KEY')!,
      },
      body: JSON.stringify({ from: FROM, to: [to], reply_to: REPLY_TO, subject, html: bodyToHtml(body), text: body }),
    });
    const data = await r.json();
    if (!r.ok) throw new Error(`Resend ${r.status}: ${JSON.stringify(data)}`);

    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    await admin.from('outreach_messages').insert({
      target_id, direction: 'outbound', subject, body, from_email: FROM, to_email: to, resend_id: data.id, sent_by: user.id,
    });
    await admin.from('outreach_targets').update({
      status: 'contacted', last_contacted_at: new Date().toISOString(), contact_email: to,
    }).eq('id', target_id);

    return new Response(JSON.stringify({ success: true, id: data.id }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    console.error('send error', e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'unknown' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
