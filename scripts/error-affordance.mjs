#!/usr/bin/env node
/**
 * When the data fails to load, the page must not claim there is none.
 *
 * This is not a WCAG criterion. It is a correctness one, and the app already
 * contains the argument for it — a comment on TeamsPage, written when someone
 * hit this by hand:
 *
 *   "No teams yet" on a failed fetch is a claim about the user's own
 *   memberships, and its call to action is "create your first team" — which
 *   invites a duplicate of one they already own.
 *
 * That is the whole check. An empty state and a failed request look identical
 * to a component that only ever asks `data.length === 0`, and they mean
 * opposite things to the person reading the screen. One says "you have nothing
 * here, go make something". The other should say "we could not reach the
 * server, try again". Showing the first when the second is true is the app
 * telling the user something false about their own account.
 *
 * Every fixture in this harness answers 200, so no check here had ever
 * rendered a page whose data did not arrive. `-error` serves PostgREST's own
 * 500 shape for the content tables, which is what an outage or a tripped RLS
 * policy looks like from the browser.
 *
 * Three outcomes per route:
 *
 *   LIES        empty-state wording is on screen and no error affordance is —
 *               the page is making a false claim
 *   SILENT      neither. The request failed and the page says nothing at all;
 *               reported, not failed, because a page with no data-dependent
 *               content legitimately has nothing to say
 *   ok          an error affordance is present
 *
 * Only the first fails the build. The wording lists below are matched against
 * visible text, so they are deliberately about how this app actually phrases
 * things rather than about English in general.
 *
 * Usage — needs `npx vite --host 127.0.0.1 --port 4173` running:
 *   node scripts/error-affordance.mjs <player|owner|admin> <route>...
 */
import { chromium } from '@playwright/test';
import { newStubbedPage, resolveRoute, waitForAppReady } from '../scripts/lib/stub-page.mjs';

const BASE = process.env.SMOKE_BASE_URL ?? 'http://127.0.0.1:4173';

const [role, ...routes] = process.argv.slice(2);
if (!role || routes.length === 0) {
  console.error('usage: node scripts/error-affordance.mjs <player|owner|admin> <route>...');
  process.exit(2);
}

/** How this app words a failure. */
const ERROR_WORDS =
  "couldn't|could not|can't load|cannot load|failed|went wrong|unavailable|try again|retry|unable to";
/** How this app words "you have nothing". */
const EMPTY_WORDS =
  'no .{0,24}(yet|found)|nothing here|be the first|get started by|create your first|you have no ';

const COLLECT = ({ errorWords, emptyWords }) => {
  const main = document.querySelector('main') ?? document.body;
  // Visible text only — an sr-only string is not what is being judged here.
  const text = [...main.querySelectorAll('*')]
    .filter((el) => {
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden') return false;
      const r = el.getBoundingClientRect();
      return r.width > 2 && r.height > 2;
    })
    .flatMap((el) => [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.nodeValue))
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();

  const hasRetryControl = [...main.querySelectorAll('button,a')].some((el) =>
    /try again|retry|reload/i.test((el.getAttribute('aria-label') || el.textContent || '')),
  );

  const errorRe = new RegExp(errorWords, 'i');
  const emptyRe = new RegExp(emptyWords, 'i');
  return {
    error: hasRetryControl || errorRe.test(text),
    empty: emptyRe.test(text),
    sample: (text.match(emptyRe)?.[0] ?? text.slice(0, 60)).trim(),
  };
};

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
const lies = [];
const silent = [];
let ok = 0;

for (const route of routes) {
  const url = resolveRoute(route);
  const page = await newStubbedPage(browser, { userType: `${role}-error`, width: 1440, height: 900 });
  await page.goto(`${BASE}${url}`, { waitUntil: 'domcontentloaded', timeout: 20000 });
  // Long enough for the query's single retry to fail too, so the page has
  // settled on its error state rather than still showing a skeleton.
  await page.waitForTimeout(1800);
  await waitForAppReady(page);

  const r = await page.evaluate(COLLECT, { errorWords: ERROR_WORDS, emptyWords: EMPTY_WORDS });
  if (r.empty && !r.error) lies.push({ url, sample: r.sample });
  else if (!r.empty && !r.error) silent.push({ url });
  else ok += 1;

  await page.context().close();
}

await browser.close();

console.log(
  `\nError affordance — ${routes.length} route(s) with every content query failing\n`,
);
for (const f of lies) {
  console.log(`  LIES    ${f.url}  shows ${JSON.stringify(f.sample)} with no way to tell it failed`);
}
if (silent.length) {
  console.log(
    `\n  SILENT (reported, not failed): ${silent.map((s) => s.url).join(', ')}\n` +
      '    Nothing on screen mentions the failure. Fine for a page with no\n' +
      '    data-dependent content; worth a look for one that has some.\n',
  );
}
if (lies.length === 0) {
  console.log(`  ${ok} route(s) say so when the data does not arrive\n`);
} else {
  console.log(`\n${lies.length} route(s) claim the user has no data when the request failed\n`);
}

process.exit(lies.length === 0 ? 0 : 1);
