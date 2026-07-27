#!/usr/bin/env node
/**
 * What a crawler actually receives.
 *
 * Every other check in this directory drives a browser and therefore measures
 * the app as a *user* meets it. This one measures the app as GPTBot meets it:
 * the bytes in `dist/`, with no JavaScript executed. That distinction is the
 * whole reason it exists.
 *
 * Before the prerender step, `curl` on four different public URLs returned
 * byte-identical documents — 3885 bytes, the same SHA-256, the home page's
 * title on every one, no canonical link, and **zero characters of body text**.
 * Googlebot renders JavaScript on a second pass and eventually saw the real
 * pages. GPTBot, OAI-SearchBot, ClaudeBot, PerplexityBot, Amazonbot and every
 * social scraper do not, and for all of them this marketplace was one blank
 * page repeated at fifteen URLs.
 *
 * So the check is: are the pages a crawler is sent actually different from each
 * other, and do they say anything?
 *
 * ## What it asserts
 *
 *   CONTENT     each prerendered page has body text a crawler can read
 *   DISTINCT    no two pages are byte-identical, and no two share a title
 *   CANONICAL   every page declares a canonical, on the host production serves
 *   DESCRIPTION every page has its own, none inheriting the site default
 *   JSON-LD     parses, and carries no rating that no review supports
 *   AGREEMENT   the static JSON-LD in index.html and the runtime one in
 *               SEOHead.tsx agree on the site name, the host and the search URL
 *   SITEMAP     every URL uses the canonical host and is a real, indexable,
 *               non-redirect route
 *   ROBOTS      advertises the sitemap on the same host
 *
 * ## The host
 *
 * `https://www.sportsbnb.org`, measured rather than assumed: the apex domain
 * answers 302 and redirects there. A canonical pointing at a redirect is not a
 * canonical — the target wins and the declared URL is discarded — which is what
 * `SEOHead.tsx` was doing on every page while the sitemap submitted the other
 * host.
 *
 * Usage — needs `npm run build` first:
 *   node scripts/crawlable.mjs
 */
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { createHash } from 'node:crypto';

const ROOT = new URL('..', import.meta.url).pathname;
const DIST = join(ROOT, 'dist');
const HOST = 'https://www.sportsbnb.org';

if (!existsSync(join(DIST, 'index.html'))) {
  console.error('crawlable: dist/ not built. Run `npm run build` first.');
  process.exit(2);
}

const failures = [];
const notes = [];
const fail = (m) => failures.push(m);

/** Every index.html the prerender step produced. */
function prerendered(dir = DIST, out = []) {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) {
      if (entry === 'assets') continue;
      prerendered(path, out);
    } else if (entry === 'index.html') {
      out.push(path);
    }
  }
  return out;
}

const pages = prerendered().map((file) => {
  const html = readFileSync(file, 'utf8');
  const body = html.slice(html.indexOf('<body'));
  const text = body
    .replace(/<script[\s\S]*?<\/script>/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const pick = (re) => (html.match(re) || [])[1] ?? null;
  return {
    route: '/' + relative(DIST, file).replace(/index\.html$/, '').replace(/\/$/, ''),
    file: relative(ROOT, file),
    sha: createHash('sha256').update(html).digest('hex').slice(0, 12),
    text: text.length,
    title: pick(/<title>([\s\S]*?)<\/title>/),
    canonical: pick(/<link rel="canonical" href="([^"]*)"/),
    description: pick(/<meta name="description" content="([^"]*)"/),
    jsonLd: [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => m[1]),
  };
});

if (pages.length < 2) {
  fail(`only ${pages.length} prerendered page(s) in dist/ — the prerender step did not run`);
}

// ------------------------------------------------------------------ CONTENT

/** Below this a page has a heading and nothing worth quoting. */
const MIN_TEXT = 200;
for (const p of pages) {
  if (p.text < MIN_TEXT) {
    fail(`CONTENT     ${p.route} serves ${p.text} chars of body text (need ${MIN_TEXT}). A crawler that does not run JavaScript sees only this.`);
  }
}

// ----------------------------------------------------------------- DISTINCT

const bySha = new Map();
const byTitle = new Map();
for (const p of pages) {
  (bySha.get(p.sha) ?? bySha.set(p.sha, []).get(p.sha)).push(p.route);
  const t = p.title ?? '(none)';
  (byTitle.get(t) ?? byTitle.set(t, []).get(t)).push(p.route);
}
for (const [sha, routes] of bySha) {
  if (routes.length > 1) {
    fail(`DISTINCT    ${routes.length} pages are byte-identical (${sha}): ${routes.join(', ')}`);
  }
}
for (const [title, routes] of byTitle) {
  if (routes.length > 1) {
    fail(`DISTINCT    ${routes.length} pages share the title ${JSON.stringify(title)}: ${routes.join(', ')}`);
  }
}

// ---------------------------------------------------- CANONICAL/DESCRIPTION

const descriptions = new Map();
for (const p of pages) {
  const expected = `${HOST}${p.route === '' ? '/' : p.route}`;
  if (!p.canonical) {
    fail(`CANONICAL   ${p.route} declares none. Every URL serves the same shell, so without one Google has nothing to consolidate on.`);
  } else if (p.canonical !== expected) {
    fail(`CANONICAL   ${p.route} declares ${p.canonical}, expected ${expected}`);
  }
  if (!p.description) {
    fail(`DESCRIPTION ${p.route} has none`);
  } else {
    (descriptions.get(p.description) ?? descriptions.set(p.description, []).get(p.description)).push(p.route);
  }
}
for (const [, routes] of descriptions) {
  if (routes.length > 1) {
    fail(`DESCRIPTION ${routes.length} pages share one description: ${routes.join(', ')}. Google rewrites duplicate snippets, so the pages compete with each other's wording rather than their own.`);
  }
}

// ------------------------------------------------------------------ JSON-LD

/**
 * A rating on a type where no review exists to support it.
 *
 * `createWebsiteJsonLd` carried `ratingValue: "4.8"` and `reviewCount: "500"`,
 * both invented, on the home page. Google's policy requires a rating to come
 * from genuine reviews shown on the same page; the stated remedy for markup
 * that does not is a manual action. Venue pages may legitimately carry one —
 * theirs comes from the `reviews` table via the `update_venue_rating` trigger
 * and is rendered on the page — but nothing prerendered here has reviews on it.
 */
for (const p of pages) {
  for (const raw of p.jsonLd) {
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      fail(`JSON-LD     ${p.route} has a block that does not parse: ${e.message}`);
      continue;
    }
    // `seen` because @graph members are also reachable through Object.values
    // below, and without it the same node is reported twice — a check that
    // double-counts misstates how much is wrong.
    const seen = new Set();
    const stack = Array.isArray(parsed) ? [...parsed] : [parsed];
    while (stack.length) {
      const node = stack.pop();
      if (!node || typeof node !== 'object' || seen.has(node)) continue;
      seen.add(node);
      if (Array.isArray(node['@graph'])) stack.push(...node['@graph']);
      if (node.aggregateRating) {
        fail(
          `JSON-LD     ${p.route} carries an aggregateRating (${JSON.stringify(node.aggregateRating)}) on a page with no reviews on it. ` +
            `Ratings must come from real reviews visible on the same page.`,
        );
      }
      for (const v of Object.values(node)) if (v && typeof v === 'object') stack.push(v);
    }
  }
}

// ---------------------------------------------------------------- AGREEMENT

{
  const shell = readFileSync(join(ROOT, 'index.html'), 'utf8');
  const head = readFileSync(join(ROOT, 'src', 'components', 'seo', 'SEOHead.tsx'), 'utf8');
  const siteUrl = (head.match(/const SITE_URL = "([^"]*)"/) || [])[1];
  if (siteUrl !== HOST) {
    fail(`AGREEMENT   SEOHead.tsx SITE_URL is ${siteUrl}, expected ${HOST} — the host production serves.`);
  }
  const searchTemplate = `${HOST}/venues?q={search_term_string}`;
  if (!shell.includes(searchTemplate)) {
    fail(`AGREEMENT   index.html does not declare the SearchAction target ${searchTemplate}`);
  }
  if (!head.includes('/venues?q={search_term_string}')) {
    fail(`AGREEMENT   SEOHead.tsx does not declare the SearchAction target — the two copies of the site JSON-LD have diverged.`);
  }
  const shellHosts = [...shell.matchAll(/https:\/\/(?:www\.)?sportsbnb\.org/g)].map((m) => m[0]);
  const wrong = shellHosts.filter((h) => h !== HOST);
  if (wrong.length) {
    fail(`AGREEMENT   index.html references ${wrong.length} URL(s) on the wrong host (e.g. ${wrong[0]})`);
  }
}

// ------------------------------------------------------------------ SITEMAP

{
  const sitemapPath = join(DIST, 'sitemap.xml');
  if (!existsSync(sitemapPath)) {
    fail('SITEMAP     dist/sitemap.xml missing, but robots.txt advertises it');
  } else {
    const xml = readFileSync(sitemapPath, 'utf8');
    const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
    if (locs.length === 0) fail('SITEMAP     no URLs in dist/sitemap.xml');

    const app = readFileSync(join(ROOT, 'src', 'App.tsx'), 'utf8');
    const routes = [...app.matchAll(/path="([^"]*)"/g)].map((m) => m[1]).filter((p) => p !== '*');
    const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const patterns = routes.map((r) => new RegExp(`^${esc(r).replace(/:\w+/g, '[^/]+')}$`));
    const redirects = new Set(
      [...app.matchAll(/<Route\s+path="([^"]*)"\s+element=\{([^}]*)\}/g)]
        .filter((m) => /\bNavigate\b/.test(m[2]))
        .map((m) => m[1]),
    );
    const noIndex = new Set(
      [...readFileSync(join(ROOT, 'src', 'lib', 'routeTitles.ts'), 'utf8').matchAll(/\{\s*path:\s*'([^']+)'[^}]*\}/g)]
        .filter((m) => /noIndex:\s*true/.test(m[0]))
        .map((m) => m[1]),
    );

    for (const loc of locs) {
      let u;
      try {
        u = new URL(loc);
      } catch {
        fail(`SITEMAP     ${loc} is not a URL`);
        continue;
      }
      if (u.origin !== HOST) {
        fail(`SITEMAP     ${loc} is on ${u.origin}, not ${HOST}. Google discards a submitted URL whose page declares a canonical on another host.`);
      }
      if (!patterns.some((p) => p.test(u.pathname))) {
        fail(`SITEMAP     ${u.pathname} matches no route in src/App.tsx — the sitemap submits a 404`);
      }
      if (redirects.has(u.pathname)) {
        fail(`SITEMAP     ${u.pathname} is a <Navigate> redirect, not a page`);
      }
      if (noIndex.has(u.pathname)) {
        fail(`SITEMAP     ${u.pathname} is marked noIndex — the sitemap asks Google to index a page that asks it not to`);
      }
    }
    notes.push(`SITEMAP     ${locs.length} URL(s), all on ${HOST} and all real routes`);
  }
}

// ------------------------------------------------------------------- ROBOTS

{
  const robots = readFileSync(join(ROOT, 'public', 'robots.txt'), 'utf8');
  const declared = (robots.match(/^Sitemap:\s*(\S+)/m) || [])[1];
  if (!declared) fail('ROBOTS      declares no Sitemap:');
  else if (!declared.startsWith(HOST)) {
    fail(`ROBOTS      advertises the sitemap at ${declared}, on a different host from the canonicals (${HOST})`);
  }
}

// ------------------------------------------------------------------- DOMAIN

/**
 * One domain, everywhere.
 *
 * Two domain errors turned up in one afternoon and neither was visible from
 * any single file. The canonicals pointed at `sportsbnb.org` while production
 * serves `www.sportsbnb.org`; and the FAQ answered "How do I contact support?"
 * with an address at `sportsbnb.com` — the only `.com` in the repository,
 * against twelve `.org` ones — so anyone who followed it emailed a domain the
 * company does not own.
 *
 * Both are the same shape: a string that looks right on its own line and
 * disagrees with every other line like it. Counting them is the cheapest
 * possible check, so it lives here rather than waiting for a third one.
 */
{
  const roots = ['src', 'public', 'supabase/functions', 'index.html'];
  const files = [];
  const walk = (p) => {
    if (!existsSync(p)) return;
    if (statSync(p).isDirectory()) {
      for (const e of readdirSync(p)) walk(join(p, e));
    } else if (/\.(tsx?|html|txt|xml|json|md)$/.test(p)) {
      files.push(p);
    }
  };
  for (const r of roots) walk(join(ROOT, r));

  const wrong = [];
  for (const file of files) {
    const text = readFileSync(file, 'utf8')
      // Comments explaining a past mistake legitimately quote the wrong
      // domain. Blanking them is what stops this reporting its own docs.
      .replace(/\/\*[\s\S]*?\*\//g, ' ')
      .replace(/(^|[^:])\/\/[^\n]*/g, '$1 ');
    for (const m of text.matchAll(/sportsbnb\.(com|net|io|co)\b/g)) {
      wrong.push(`${relative(ROOT, file)}: sportsbnb.${m[1]}`);
    }
  }
  if (wrong.length) {
    fail(`DOMAIN      ${wrong.length} reference(s) to a domain this company does not use: ${wrong.slice(0, 5).join(', ')}`);
  } else {
    notes.push(`DOMAIN      every domain reference across ${files.length} file(s) is sportsbnb.org`);
  }
}

// ------------------------------------------------------------------- report

console.log(`\nCrawlable — ${pages.length} prerendered page(s) in dist/, read as bytes with no JavaScript\n`);
for (const p of pages.sort((a, b) => a.route.localeCompare(b.route))) {
  console.log(`  ${(p.route || '/').padEnd(16)} ${String(p.text).padStart(5)} chars  ${p.sha}  ${(p.title ?? '').slice(0, 46)}`);
}
console.log();
for (const n of notes) console.log(`  ok      ${n}`);
for (const f of failures) console.log(`  FAIL    ${f}`);

if (failures.length === 0) {
  console.log(`\n  Every public page serves its own title, canonical, description and text.\n`);
} else {
  console.log(`\n${failures.length} problem(s) in what crawlers receive\n`);
}

process.exit(failures.length === 0 ? 0 : 1);
