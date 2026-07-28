import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { searchPlacesText } from '../_shared/google-places.ts';
import { AI_MODELS, chatCompletion } from '../_shared/ai.ts';

const FIRECRAWL_V2 = 'https://api.firecrawl.dev/v2';

const PITCH_EN = `Sportsbnb is a booking platform for sports venues. We charge 0% commission — permanently, not as a trial. Owners keep 100% of every booking, with no listing fee and no monthly cost. We help fill empty slots, bring new customers, and give owners a free smart calendar and online booking widget.`;
const PITCH_HY = `Sportsbnb-ը սպորտային հարթակների ամրագրման հարթակ է։ Մենք միջնորդավճար չենք վերցնում՝ 0%՝ ընդմիշտ, ոչ թե փորձնական ժամկետով։ Տերը ստանում է յուրաքանչյուր ամրագրման ողջ գումարը՝ առանց տեղադրման կամ ամսական վճարի։ Օգնում ենք լրացնել դատարկ ժամերը, բերում ենք նոր հաճախորդներ և տալիս ենք անվճար խելացի օրացույց ու օնլայն ամրագրման վիջեթ։`;

const SYSTEM_EN = `You write warm, concise B2B outreach messages on behalf of the Sportsbnb team. ${PITCH_EN} Write in a personal, direct tone. NEVER sound like a template. Reference one concrete detail about the venue from the research. Keep under 130 words. End with a soft CTA (15-min call or reply). Return ONLY JSON: { "subject": "...", "body": "..." } where body uses real line breaks (\\n).`;
const SYSTEM_HY = `Դու գրում ես ջերմ, հակիրճ B2B հաղորդագրություններ Sportsbnb-ի թիմի անունից։ ${PITCH_HY} Գրիր անձնական, ուղղակի տոնով։ ԵՐԲԵՔ չհնչիր ձևանմուշային։ Հղում արա մեկ կոնկրետ դետալի՝ վենյուի վերաբերյալ։ Մինչև 130 բառ։ Ավարտիր մեղմ CTA-ով (15-րոպեանոց զանգ կամ պատասխան)։ Վերադարձրու ՄԻԱՅՆ JSON՝ { "subject": "...", "body": "..." } որտեղ body-ն օգտագործում է իրական տողանջատումներ (\\n)։`;

function json(data: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

function cleanEmail(email: string): string {
  return email.toLowerCase().replace(/^mailto:/, '').replace(/\?.*$/, '').replace(/[.,;:)\]>]+$/, '').trim();
}

function extractEmails(text: string): string[] {
  const normalized = text
    .replace(/&#64;|%40|\s*\[at\]\s*|\s*\(at\)\s*|\s+at\s+/gi, '@')
    .replace(/&#46;|%2e|\s*\[dot\]\s*|\s*\(dot\)\s*|\s+dot\s+/gi, '.')
    .replace(/\s*@\s*/g, '@')
    .replace(/\s*\.\s*/g, '.');
  const matches = normalized.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) ?? [];
  const blocked = /\.(png|jpe?g|gif|webp|svg|css|js)$|example\.com|wixpress|sentry|noreply|no-reply|donotreply|privacy|abuse|postmaster|mailer-daemon/i;
  return [...new Set(matches.map(cleanEmail).filter((email) => !blocked.test(email)))];
}

function extractPhones(text: string): string[] {
  const matches = text.match(/(?:\+?\d[\d\s().-]{7,}\d)/g) ?? [];
  return [...new Set(matches.map((p) => p.replace(/[^\d+]/g, '')).filter((p) => p.length >= 8 && p.length <= 16))];
}

function extractSocials(text: string, html: string | null): Record<string, string> {
  const out: Record<string, string> = {};
  const sources = [text, html ?? ''].join(' ');
  const patterns: Record<string, RegExp> = {
    facebook: /https?:\/\/(?:www\.)?facebook\.com\/[A-Za-z0-9_.\-/]+/i,
    instagram: /https?:\/\/(?:www\.)?instagram\.com\/[A-Za-z0-9_.\-/]+/i,
    twitter: /https?:\/\/(?:www\.)?(?:twitter|x)\.com\/[A-Za-z0-9_.\-/]+/i,
    linkedin: /https?:\/\/(?:www\.)?linkedin\.com\/(?:company|in)\/[A-Za-z0-9_.\-/]+/i,
    youtube: /https?:\/\/(?:www\.)?youtube\.com\/(?:@|c\/|channel\/|user\/)[A-Za-z0-9_.\-/]+/i,
    tiktok: /https?:\/\/(?:www\.)?tiktok\.com\/@[A-Za-z0-9_.\-/]+/i,
    whatsapp: /https?:\/\/(?:wa\.me|api\.whatsapp\.com)\/[A-Za-z0-9_.\-/?=&]+/i,
    telegram: /https?:\/\/(?:t\.me|telegram\.me)\/[A-Za-z0-9_.\-/]+/i,
  };
  for (const [k, re] of Object.entries(patterns)) {
    const m = sources.match(re);
    if (m) out[k] = m[0].replace(/[)\]>.,;]+$/, '');
  }
  return out;
}

function findContactFormUrl(urls: string[]): string | null {
  return urls.find((u) => /contact|reach|get-in-touch|enquir|inquir/i.test(u)) ?? null;
}

function scoreEmail(email: string, website?: string): number {
  const local = email.split('@')[0] ?? '';
  const domain = email.split('@')[1] ?? '';
  let score = 0;
  if (/^(info|hello|contact|office|admin|booking|bookings|sales|team|manager|director|support)$/i.test(local)) score += 30;
  if (/football|soccer|sport|academy|field|foundation|club|venue/i.test(email)) score += 15;
  if (!/(gmail|yahoo|hotmail|outlook|icloud|aol)\./i.test(domain)) score += 10;
  if (website) {
    try {
      const host = new URL(website).hostname.replace(/^www\./, '');
      if (domain.endsWith(host) || host.endsWith(domain)) score += 50;
    } catch { /* ignore */ }
  }
  return score;
}

function bestEmail(emails: string[], website?: string): string | null {
  return [...new Set(emails)].sort((a, b) => scoreEmail(b, website) - scoreEmail(a, website))[0] ?? null;
}

async function searchPlace(query: string) {
  const r = await searchPlacesText({ textQuery: query });
  const data = await r.json();
  if (!r.ok) throw new Error(`Maps error ${r.status}: ${JSON.stringify(data)}`);
  return data.places?.[0] || null;
}

async function fetchRaw(url: string): Promise<string | null> {
  try {
    const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 SportsbnbBot' }, signal: AbortSignal.timeout(15000) });
    if (!r.ok) return null;
    return (await r.text()).slice(0, 30000);
  } catch { return null; }
}

function toText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

async function firecrawlScrape(url: string): Promise<{ text: string; html: string; links: string[] }> {
  const key = Deno.env.get('FIRECRAWL_API_KEY');
  if (!key) return { text: '', html: '', links: [] };
  try {
    const r = await fetch(`${FIRECRAWL_V2}/scrape`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, formats: ['markdown', 'html', 'links'], onlyMainContent: false, waitFor: 1500 }),
    });
    const data = await r.json();
    const payload = data?.data ?? data;
    return {
      text: [payload?.markdown, payload?.html].filter(Boolean).join('\n'),
      html: payload?.html ?? '',
      links: Array.isArray(payload?.links) ? payload.links : [],
    };
  } catch { return { text: '', html: '', links: [] }; }
}

function candidateUrls(website: string, html: string | null): string[] {
  const base = new URL(website);
  const urls = new Set<string>([
    base.href,
    new URL('/contact', base).href,
    new URL('/contact-us', base).href,
    new URL('/contacts', base).href,
    new URL('/about', base).href,
    new URL('/about-us', base).href,
    new URL('/team', base).href,
    new URL('/staff', base).href,
    new URL('/coaches', base).href,
    new URL('/location', base).href,
  ]);
  const linkMatches = html?.matchAll(/href=["']([^"']+)["']/gi) ?? [];
  for (const match of linkMatches) {
    const href = match[1];
    if (!/contact|about|team|staff|coach|email|mail|office|location/i.test(href)) continue;
    try { urls.add(new URL(href, base).href); } catch { /* ignore */ }
  }
  return [...urls].filter((url) => new URL(url).hostname === base.hostname).slice(0, 16);
}

async function collectWebsiteResearch(website: string) {
  const homeRaw = await fetchRaw(website);
  const urls = candidateUrls(website, homeRaw);
  const seen = new Set<string>();
  const pages: string[] = [];
  const emails = new Set<string>();
  const phones = new Set<string>();
  const socials: Record<string, string> = {};
  const allHtml: string[] = [];

  while (urls.length > 0 && seen.size < 18) {
    const url = urls.shift()!;
    if (seen.has(url)) continue;
    seen.add(url);
    const raw = url === website && homeRaw ? homeRaw : await fetchRaw(url);
    const firecrawl = await firecrawlScrape(url);
    firecrawl.links
      .filter((link) => /contact|about|team|staff|coach|email|mail|office|location/i.test(link))
      .forEach((link) => { try { urls.push(new URL(link, website).href); } catch { /* ignore */ } });
    const combined = [raw ?? '', firecrawl.text].join('\n');
    extractEmails(combined).forEach((email) => emails.add(email));
    extractPhones(combined).forEach((p) => phones.add(p));
    Object.assign(socials, extractSocials(combined, firecrawl.html || raw));
    allHtml.push(firecrawl.html || raw || '');
    if (combined.trim()) pages.push(`URL: ${url}\n${toText(combined).slice(0, 5000)}`);
    if (emails.size >= 5) break;
  }

  return {
    text: pages.join('\n\n---\n\n').slice(0, 14000),
    emails: [...emails],
    phones: [...phones],
    socials,
    urls: [...seen],
    contact_form_url: findContactFormUrl([...seen]),
  };
}

async function firecrawlSearchEmails(query: string): Promise<{ text: string; emails: string[]; phones: string[]; socials: Record<string, string>; urls: string[] }> {
  const key = Deno.env.get('FIRECRAWL_API_KEY');
  if (!key) return { text: '', emails: [], phones: [], socials: {}, urls: [] };
  try {
    const r = await fetch(`${FIRECRAWL_V2}/search`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query,
        limit: 8,
        scrapeOptions: { formats: ['markdown', 'html'] },
      }),
    });
    const data = await r.json();
    const results = Array.isArray(data?.data) ? data.data : Array.isArray(data?.web) ? data.web : [];
    const emails = new Set<string>();
    const phones = new Set<string>();
    const socials: Record<string, string> = {};
    const urls: string[] = [];
    const snippets: string[] = [];
    for (const result of results) {
      const url = result.url || result.link || result.metadata?.sourceURL;
      if (url) urls.push(url);
      const text = [result.title, result.description, result.markdown, result.html].filter(Boolean).join('\n');
      extractEmails(text).forEach((email) => emails.add(email));
      extractPhones(text).forEach((p) => phones.add(p));
      Object.assign(socials, extractSocials(text, result.html ?? null));
      if (text.trim()) snippets.push(`URL: ${url ?? 'search result'}\n${toText(text).slice(0, 2500)}`);
    }
    return { text: snippets.join('\n\n---\n\n').slice(0, 10000), emails: [...emails], phones: [...phones], socials, urls };
  } catch { return { text: '', emails: [], phones: [], socials: {}, urls: [] }; }
}

async function summarize(text: string, venueName: string, emails: string[]): Promise<Record<string, unknown>> {
  const r = await chatCompletion({
    model: AI_MODELS.chat,
    messages: [
      { role: 'system', content: 'Extract a concise JSON profile of a sports venue from raw website/contact-page text. Return ONLY JSON with keys: summary (1-2 sentences), sports (array), unique_angle (1 sentence on what makes them special), owner_or_contact_name (string or null), contact_email (string or null), tone (formal|casual|professional). Choose contact_email from the provided candidate emails if one looks like the best public venue/business contact. Do not invent emails or names.' },
      { role: 'user', content: `Venue: ${venueName}\nCandidate emails found: ${emails.join(', ') || 'none'}\n\nWebsite/contact text:\n${text}` },
    ],
    response_format: { type: 'json_object' },
    max_tokens: 2048,
  });
  const d = await r.json();
  if (!r.ok) throw new Error(`AI research ${r.status}: ${JSON.stringify(d)}`);
  try { return JSON.parse(d.choices?.[0]?.message?.content || '{}'); } catch { return {}; }
}

async function draftEmail(target: Record<string, unknown>, enriched: Record<string, unknown>, research: Record<string, unknown>) {
  const lang = target.language === 'hy' ? 'hy' : 'en';
  const r = await chatCompletion({
    model: AI_MODELS.chat,
    messages: [
      { role: 'system', content: lang === 'hy' ? SYSTEM_HY : SYSTEM_EN },
      { role: 'user', content: `Write the outreach email. Venue context:\n${JSON.stringify({ venue: target.name, city: target.city, enriched, research, contact_name: target.contact_name }, null, 2)}` },
    ],
    response_format: { type: 'json_object' },
    max_tokens: 2048,
  });
  const d = await r.json();
  if (!r.ok) throw new Error(`AI draft ${r.status}: ${JSON.stringify(d)}`);
  try { return JSON.parse(d.choices?.[0]?.message?.content || '{}'); } catch { return {}; }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const auth = req.headers.get('Authorization');
    if (!auth) return json({ error: 'unauthorized' }, 401);
    const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const isInternal = auth === `Bearer ${serviceRole}`;
    if (!isInternal) {
      const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: auth } } });
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return json({ error: 'unauthorized' }, 401);
      const { data: roles } = await supabase.from('user_roles').select('role').eq('user_id', user.id).eq('role', 'admin').maybeSingle();
      if (!roles) return json({ error: 'forbidden' }, 403);
    }

    const { target_id } = await req.json();
    if (!target_id) return json({ error: 'target_id required' }, 400);

    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { data: target } = await admin.from('outreach_targets').select('*').eq('id', target_id).single();
    if (!target) return json({ error: 'target not found' }, 404);

    const place = await searchPlace([target.name, target.city, target.country].filter(Boolean).join(' '));
    const enriched: Record<string, unknown> = place ? {
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

    let research: Record<string, unknown> = { source: 'none', note: 'No website found in Google Maps data' };
    const website = enriched.website as string | undefined;
    const allEmails = new Set<string>();
    const allPhones = new Set<string>();
    const allSocials: Record<string, string> = {};
    let contactFormUrl: string | null = null;
    let externalText = '';
    let externalUrls: string[] = [];

    if (enriched.phone) allPhones.add(String(enriched.phone));

    if (website) {
      const collected = await collectWebsiteResearch(website);
      collected.emails.forEach((email) => allEmails.add(email));
      collected.phones.forEach((p) => allPhones.add(p));
      Object.assign(allSocials, collected.socials);
      contactFormUrl = collected.contact_form_url;

      if (allEmails.size === 0) {
        const searched = await firecrawlSearchEmails(`"${target.name}" ${target.city ?? ''} email OR contact OR owner OR manager`);
        searched.emails.forEach((email) => allEmails.add(email));
        searched.phones.forEach((p) => allPhones.add(p));
        Object.assign(allSocials, searched.socials);
        externalText = searched.text;
        externalUrls = searched.urls;
      }
      if (collected.text) {
        const researchText = [collected.text, externalText].filter(Boolean).join('\n\n--- external search ---\n\n');
        const candidateEmails = [...allEmails];
        const profile = await summarize(researchText, target.name, candidateEmails);
        research = {
          source: Deno.env.get('FIRECRAWL_API_KEY') ? 'firecrawl+search+direct' : 'direct',
          website,
          pages_checked: collected.urls,
          external_pages_checked: externalUrls,
          candidate_emails: candidateEmails,
          candidate_phones: [...allPhones],
          socials: allSocials,
          contact_form_url: contactFormUrl,
          ...profile,
          contact_email: profile.contact_email || bestEmail(candidateEmails, website),
        };
      } else {
        research = { source: 'failed', website, candidate_phones: [...allPhones], socials: allSocials, contact_form_url: contactFormUrl, note: 'Could not fetch website/contact pages' };
      }
    } else {
      const searched = await firecrawlSearchEmails(`"${target.name}" ${target.city ?? ''} ${target.country ?? ''} email OR contact OR owner OR manager`);
      searched.emails.forEach((email) => allEmails.add(email));
      searched.phones.forEach((p) => allPhones.add(p));
      Object.assign(allSocials, searched.socials);
      if (searched.text) {
        const candidateEmails = [...allEmails];
        const profile = await summarize(searched.text, target.name, candidateEmails);
        research = {
          source: 'firecrawl-search',
          external_pages_checked: searched.urls,
          candidate_emails: candidateEmails,
          candidate_phones: [...allPhones],
          socials: allSocials,
          ...profile,
          contact_email: profile.contact_email || bestEmail(candidateEmails),
        };
      } else {
        research = { source: 'search-empty', candidate_phones: [...allPhones], socials: allSocials, note: 'No public web data found' };
      }
    }

    const contactName = typeof research.owner_or_contact_name === 'string' && research.owner_or_contact_name.trim() ? research.owner_or_contact_name.trim() : null;
    const contactEmail = typeof research.contact_email === 'string' && research.contact_email.trim() ? cleanEmail(research.contact_email) : null;

    const hasEmail = !!contactEmail;
    const hasPhone = allPhones.size > 0;
    const hasSocial = Object.keys(allSocials).length > 0;
    const hasContactForm = !!contactFormUrl;
    const hasAnyChannel = hasEmail || hasPhone || hasSocial || hasContactForm;

    let draftSubject: string | null = null;
    let draftBody: string | null = null;
    if (hasAnyChannel) {
      const draft = await draftEmail({ ...target, contact_name: target.contact_name || contactName }, enriched, research);
      if (!draft.subject || !draft.body) throw new Error('AI did not return subject and body');
      draftSubject = draft.subject;
      draftBody = draft.body;
    }

    let nextStatus = target.status;
    if (!hasAnyChannel) {
      nextStatus = 'unreachable';
    } else if (['new', 'enriched', 'researched', 'unreachable'].includes(target.status)) {
      nextStatus = hasEmail ? 'drafted' : 'researched';
    }

    await admin.from('outreach_targets').update({
      enriched,
      research,
      contact_name: target.contact_name || contactName,
      contact_email: target.contact_email || contactEmail,
      ai_subject: draftSubject ?? target.ai_subject,
      ai_body: draftBody ?? target.ai_body,
      status: nextStatus,
    }).eq('id', target_id);

    return json({
      success: true,
      enriched,
      research,
      contact_name: target.contact_name || contactName,
      contact_email: target.contact_email || contactEmail,
      phones: [...allPhones],
      socials: allSocials,
      contact_form_url: contactFormUrl,
      subject: draftSubject,
      body: draftBody,
      status: nextStatus,
      unreachable: !hasAnyChannel,
    });
  } catch (e) {
    console.error('prepare error', e);
    return json({ error: e instanceof Error ? e.message : 'unknown' }, 500);
  }
});
