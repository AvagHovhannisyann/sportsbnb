#!/usr/bin/env node
/**
 * Every route must have its own title.
 *
 * WCAG 2.4.2 (Page Titled), Level A — the strictest tier, and one of the
 * cheapest to fail in a single-page app, because nothing sets a title unless
 * something is told to. The string in `index.html` stays until React replaces
 * it, and a marketing sentence sitting in the tab of the settings page still
 * looks like a title, so nobody notices.
 *
 * Measured before this existed: 17 of the 35 player routes were still showing
 *
 *   "Sportsbnb — Book Sports Venues & Join Games Near You"
 *
 * including /login, /signup, /dashboard, /profile, /settings, /messages and
 * every step of the checkout chain. Eighteen other pages did set one, which is
 * exactly why it stayed hidden: the mechanism was there and simply had not
 * been applied everywhere.
 *
 * Two things are checked, and the second matters as much as the first:
 *
 *   FALLBACK   the route still shows the static index.html title, i.e. nothing
 *              claimed it
 *   DUPLICATE  two routes resolve to the same title, which fails the criterion
 *              just as squarely — a title that does not distinguish the page
 *              does not describe it. This is what catches a copy-pasted table
 *              row, and it caught /nearby reading "Nearby Sports Fields |
 *              Sportsbnb | Sportsbnb" once the doubled suffix was removed and
 *              the two spellings collapsed onto each other.
 *
 * `/` is allowed to keep the default: it is the page that string describes.
 *
 * Usage — needs `npx vite --host 127.0.0.1 --port 4173` running:
 *   node scripts/page-titles.mjs <player|owner|admin> <route>...
 */
import { chromium } from '@playwright/test';
import { newStubbedPage, resolveRoute, waitForAppReady } from '../scripts/lib/stub-page.mjs';

const BASE = process.env.SMOKE_BASE_URL ?? 'http://127.0.0.1:4173';
/**
 * The string baked into index.html. Read from the file rather than repeated
 * here — two copies of one constant drifting apart is the bug class these
 * scripts keep finding, and it would fail open: a changed default would make
 * every fallback route look like it had a title of its own.
 */
const { readFileSync } = await import('node:fs');
const STATIC_TITLE = readFileSync('index.html', 'utf8').match(/<title>([^<]*)<\/title>/)?.[1];
if (!STATIC_TITLE) {
  console.error('Could not read <title> out of index.html — refusing to guess it.');
  process.exit(2);
}
// index.html carries HTML entities; the DOM hands back the decoded text.
const decode = (s) =>
  s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
const DEFAULT_TITLE = decode(STATIC_TITLE);

/** The one route the default legitimately describes. */
const DEFAULT_OK = new Set(['/']);

const [userType, ...routes] = process.argv.slice(2);
if (!userType || routes.length === 0) {
  console.error('usage: node scripts/page-titles.mjs <player|owner|admin> <route>...');
  process.exit(2);
}

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
const seen = new Map();
const fallback = [];
const errored = [];

for (const route of routes) {
  const url = resolveRoute(route);
  const page = await newStubbedPage(browser, { userType, width: 1440, height: 900 });
  try {
    await page.goto(`${BASE}${url}`, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForTimeout(900);
    // The title is set by the page component, which does not mount until the
    // app has booted past its splash.
    await waitForAppReady(page);
    const title = (await page.title()).trim();
    // Where the app actually ended up, not where we asked to go.
    //
    // Without this the check reports four duplicates that are not duplicates.
    // /discover is a <Navigate> to /venues, and the smoke harness stubs a
    // signed-in session, so /login, /signup and /auth/callback all land on
    // /dashboard. Those routes share a title because they share a *page* —
    // which is the correct behaviour, and the opposite of the defect this is
    // looking for. Grouping by the final pathname keeps "two pages, one
    // title" separate from "one page, several front doors".
    const landed = new URL(page.url()).pathname;

    if (title === DEFAULT_TITLE && !DEFAULT_OK.has(url)) fallback.push(url);
    if (!seen.has(title)) seen.set(title, []);
    seen.get(title).push({ url, landed });
  } catch (e) {
    errored.push({ url, error: String(e).split('\n')[0].slice(0, 60) });
  }
  await page.context().close();
}

await browser.close();

const duplicates = [...seen.entries()]
  .map(([title, hits]) => [title, [...new Set(hits.map((h) => h.landed))], hits])
  .filter(
    ([title, landings]) =>
      landings.length > 1 && !(title === DEFAULT_TITLE && landings.every((u) => DEFAULT_OK.has(u))),
  );

const distinctPages = new Set([...seen.values()].flat().map((h) => h.landed)).size;
console.log(
  `\nPage titles — ${routes.length} route(s) landing on ${distinctPages} page(s), ` +
    `${seen.size} distinct title(s)\n`,
);

for (const url of fallback) {
  console.log(`  FALLBACK   ${url}  still shows the index.html title`);
}
for (const [title, landings] of duplicates) {
  console.log(`  DUPLICATE  ${JSON.stringify(title)}\n             ${landings.join('\n             ')}`);
}
for (const e of errored) {
  console.log(`  ERROR      ${e.url}  ${e.error}`);
}

if (fallback.length + duplicates.length + errored.length === 0) {
  console.log('  Every route has a title of its own (WCAG 2.4.2)\n');
} else {
  console.log(
    `\n${fallback.length} route(s) with no title of their own, ` +
      `${duplicates.length} title(s) shared by more than one route (WCAG 2.4.2)\n` +
      '  Titles live in src/lib/routeTitles.ts.\n',
  );
}

process.exit(fallback.length + duplicates.length + errored.length === 0 ? 0 : 1);
