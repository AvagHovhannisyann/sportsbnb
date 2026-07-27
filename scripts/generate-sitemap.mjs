#!/usr/bin/env node
/**
 * The sitemap, built from the route table instead of maintained by hand.
 *
 * `public/sitemap.xml` was written out by hand and had drifted the way every
 * hand-copied list in this repository has drifted:
 *
 *   - it listed `/subscription`, a route deleted when Stripe was removed, so
 *     the sitemap submitted a 404 to Google;
 *   - it listed `/login` and `/signup`, which `routeTitles.ts` marks noIndex —
 *     asking Google to index pages the pages themselves ask it not to;
 *   - and it contained **no venue pages at all**. For a venue marketplace the
 *     venue page is the page: it carries the name, the city, the sports, the
 *     hourly price and the reviews. Not one was submitted.
 *
 * So the static routes now come from `src/App.tsx` filtered by the noIndex
 * flags in `src/lib/routeTitles.ts` — one list, and a route added to the app is
 * in the sitemap without anyone remembering to add it.
 *
 * Redirects are excluded by reading the route table rather than by listing them:
 * a route whose element is a `<Navigate>` is a redirect, and a sitemap that
 * submits one is asking Google to index a URL that immediately sends it
 * somewhere else. Three were caught this way — `/discover`, `/my-venues` and
 * `/list-venue` — and only the last two would have been noticed by hand, since
 * `/my-venues` is not in the noIndex table at all and would otherwise have been
 * submitted as a public page despite redirecting to the owner console.
 *
 * The venue, game and blog URLs are read from Supabase when the build has
 * credentials, using the publishable key and the same public SELECT policies a
 * visitor gets. Without them the generator still emits every static route, so a
 * build with no network produces a smaller sitemap rather than none — which is
 * the failure mode to prefer, because a missing sitemap.xml is a 404 on a URL
 * robots.txt advertises.
 *
 * Usage:
 *   node scripts/generate-sitemap.mjs            # writes dist/sitemap.xml
 *   node scripts/generate-sitemap.mjs --out public/sitemap.xml
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, isAbsolute, join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const SITE = 'https://www.sportsbnb.org';

const outArg = process.argv.indexOf('--out');
const requested = outArg === -1 ? null : process.argv[outArg + 1];
const OUT = requested
  ? (isAbsolute(requested) ? requested : join(ROOT, requested))
  : join(ROOT, 'dist', 'sitemap.xml');

/** Routes react-router declares. */
function declaredRoutes() {
  const app = readFileSync(join(ROOT, 'src', 'App.tsx'), 'utf8');
  return [...app.matchAll(/path="([^"]*)"/g)].map((m) => m[1]).filter((p) => p !== '*');
}

/** Paths `routeTitles.ts` marks noIndex. */
function noIndexPaths() {
  const src = readFileSync(join(ROOT, 'src', 'lib', 'routeTitles.ts'), 'utf8');
  const out = new Set();
  for (const m of src.matchAll(/\{\s*path:\s*'([^']+)'[^}]*\}/g)) {
    if (/noIndex:\s*true/.test(m[0])) out.add(m[1]);
  }
  return out;
}

/**
 * Routes whose element is a `<Navigate>` — redirects, not pages.
 *
 * Read from `src/App.tsx` rather than listed here, because a hand-kept list of
 * redirects is one more thing to drift. Matching is deliberately narrow: the
 * element expression on the same Route, containing the word Navigate.
 */
function redirectRoutes() {
  const app = readFileSync(join(ROOT, 'src', 'App.tsx'), 'utf8');
  const out = new Set();
  for (const m of app.matchAll(/<Route\s+path="([^"]*)"\s+element=\{([^}]*)\}/g)) {
    if (/\bNavigate\b/.test(m[2])) out.add(m[1]);
  }
  return out;
}

/**
 * Public, non-redirect routes still not worth submitting. Named individually,
 * each with a reason, so that adding one is a decision rather than a filter.
 */
const SKIP = new Map([
  ['/venue/:id/edit', 'owner-only'],
  ['/venue/:id/availability', 'owner-only'],
  ['/owner/integrations/callback', 'OAuth return URL'],
]);

/** How often each area really changes, and how much it matters. */
function policyFor(path) {
  if (path === '/') return { changefreq: 'daily', priority: '1.0' };
  if (path === '/venues' || path === '/venues/map' || path.startsWith('/venue/')) return { changefreq: 'daily', priority: '0.9' };
  if (path === '/games' || path.startsWith('/game/')) return { changefreq: 'daily', priority: '0.8' };
  if (path === '/teams' || path === '/community' || path === '/nearby') return { changefreq: 'weekly', priority: '0.7' };
  if (path === '/for-owners' || path === '/list-venue') return { changefreq: 'monthly', priority: '0.8' };
  if (path.startsWith('/blog')) return { changefreq: 'weekly', priority: '0.7' };
  if (path === '/privacy' || path === '/terms' || path === '/cookies') return { changefreq: 'yearly', priority: '0.3' };
  return { changefreq: 'monthly', priority: '0.6' };
}

const staticPaths = () => {
  const noIndex = noIndexPaths();
  const redirects = redirectRoutes();
  return declaredRoutes()
    .filter((p) => !noIndex.has(p))
    .filter((p) => !redirects.has(p))
    .filter((p) => !SKIP.has(p))
    // A route with a parameter cannot be submitted as a literal. Those come
    // from the database below, or not at all.
    .filter((p) => !p.includes(':'))
    .sort();
};

/**
 * Rows from Supabase, if this build has credentials.
 *
 * The publishable key and the public SELECT policies — the same access a
 * signed-out visitor has. Nothing here needs the service role, and it must not
 * use it: a sitemap is a public document and it should contain exactly what a
 * public reader can see.
 */
async function dynamicPaths() {
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    console.log('  no Supabase credentials in the environment — static routes only');
    return [];
  }

  const get = async (path) => {
    const res = await fetch(`${url}/rest/v1/${path}`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    });
    if (!res.ok) throw new Error(`${path} → ${res.status}`);
    return res.json();
  };

  const out = [];
  try {
    const venues = await get('venues?select=id,updated_at&is_active=eq.true&limit=5000');
    for (const v of venues) out.push({ path: `/venue/${v.id}`, lastmod: v.updated_at });
    console.log(`  ${venues.length} venue(s)`);
  } catch (e) {
    console.log(`  venues unavailable (${e.message}) — skipped`);
  }

  try {
    const games = await get('games?select=id,updated_at&status=eq.open&is_public=eq.true&limit=5000');
    for (const g of games) out.push({ path: `/game/${g.id}`, lastmod: g.updated_at });
    console.log(`  ${games.length} open game(s)`);
  } catch (e) {
    console.log(`  games unavailable (${e.message}) — skipped`);
  }

  try {
    const posts = await get('blog_posts?select=slug,updated_at&published=eq.true&limit=5000');
    for (const p of posts) out.push({ path: `/blog/${p.slug}`, lastmod: p.updated_at });
    console.log(`  ${posts.length} blog post(s)`);
  } catch (e) {
    console.log(`  blog posts unavailable (${e.message}) — skipped`);
  }

  return out;
}

const entries = [
  ...staticPaths().map((path) => ({ path, ...policyFor(path) })),
  ...(await dynamicPaths()).map((e) => ({ ...e, ...policyFor(e.path) })),
];

const xml = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ...entries.map((e) => {
    const lastmod = e.lastmod ? `<lastmod>${new Date(e.lastmod).toISOString().slice(0, 10)}</lastmod>` : '';
    return `  <url><loc>${SITE}${e.path}</loc>${lastmod}<changefreq>${e.changefreq}</changefreq><priority>${e.priority}</priority></url>`;
  }),
  '</urlset>',
  '',
].join('\n');

if (!existsSync(dirname(OUT))) mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, xml);
console.log(`Sitemap — ${entries.length} URL(s) → ${OUT.replace(ROOT, '')}`);
