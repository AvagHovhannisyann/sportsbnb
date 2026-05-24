import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

const GW = 'https://connector-gateway.lovable.dev/google_maps';

async function searchPlace(query: string) {
  const r = await fetch(`${GW}/places/v1/places:searchText`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${Deno.env.get('LOVABLE_API_KEY')}`,
      'X-Connection-Api-Key': Deno.env.get('GOOGLE_MAPS_API_KEY_1') ?? Deno.env.get('GOOGLE_MAPS_API_KEY')!,
      'Content-Type': 'application/json',
      'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.internationalPhoneNumber,places.nationalPhoneNumber,places.websiteUri,places.rating,places.userRatingCount,places.googleMapsUri,places.regularOpeningHours.weekdayDescriptions,places.location,places.businessStatus',
    },
    body: JSON.stringify({ textQuery: query }),
  });
  const data = await r.json();
  if (!r.ok) throw new Error(`Maps error ${r.status}: ${JSON.stringify(data)}`);
  return data.places?.[0] || null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const auth = req.headers.get('Authorization');
    if (!auth) return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: auth } },
    });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const { data: roles } = await supabase.from('user_roles').select('role').eq('user_id', user.id).eq('role', 'admin').maybeSingle();
    if (!roles) return new Response(JSON.stringify({ error: 'forbidden' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const { target_id } = await req.json();
    if (!target_id) return new Response(JSON.stringify({ error: 'target_id required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { data: target, error: tErr } = await admin.from('outreach_targets').select('*').eq('id', target_id).single();
    if (tErr || !target) return new Response(JSON.stringify({ error: 'target not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const query = [target.name, target.city, target.country].filter(Boolean).join(' ');
    const place = await searchPlace(query);

    const enriched = place ? {
      place_id: place.id,
      name: place.displayName?.text,
      address: place.formattedAddress,
      phone: place.internationalPhoneNumber || place.nationalPhoneNumber,
      website: place.websiteUri,
      rating: place.rating,
      review_count: place.userRatingCount,
      maps_url: place.googleMapsUri,
      hours: place.regularOpeningHours?.weekdayDescriptions || [],
      location: place.location,
      business_status: place.businessStatus,
    } : { error: 'no_match' };

    await admin.from('outreach_targets').update({
      enriched,
      status: target.status === 'new' ? 'enriched' : target.status,
    }).eq('id', target_id);

    return new Response(JSON.stringify({ success: true, enriched }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('enrich error', e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'unknown' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
