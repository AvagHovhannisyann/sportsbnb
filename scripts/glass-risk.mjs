#!/usr/bin/env node
/**
 * Which routes actually put the glass header at risk, ranked.
 *
 * `glass-contrast.mjs` is the expensive check in this directory — it
 * screenshots the bar at several scroll offsets, in both themes, at roughly
 * 14s a route. Running it over all 62 routes twice is about 29 minutes, which
 * is not a thing to spend on every pull request. So it runs on a short list,
 * and that list was chosen by hand.
 *
 * This is how to choose it by measurement instead. A translucent bar only
 * fails when what passes *under* it changes lightness: at `--glass-alpha`
 * 0.72 the same five nav links measured 7.4:1 over the dark hero and 3.0:1
 * over a light section further down the same page. A route whose backdrop is
 * one flat colour from top to bottom cannot produce that, whatever the theme.
 *
 * So: step down each page reading only the background colour just below the
 * bar — the same probe `glass-contrast.mjs` uses to pick its offsets, minus
 * the screenshots — and report the luminance span. High span means the bar
 * crosses a boundary somewhere and deserves the real check. Span near zero
 * means it does not.
 *
 * Run over all 62 routes, the answer was concentrated in three:
 *
 *   0.908  /                  a near-white section passes under the bar
 *   0.908  /for-owners        the same marketing layout
 *   0.544  /owner-dashboard   a mid-light band
 *   0.083  everything else    (58 routes, most of them exactly 0)
 *
 * Two of those three were not in the gated list, and two of the four routes
 * that were in it measure exactly 0. The list was not wrong out of
 * carelessness — `/venues`, `/games` and `/community` are the pages someone
 * would name from memory as "the busy ones". They are just not the pages
 * where this particular thing can break.
 *
 * Re-run this after any layout change that adds a light section, and move the
 * gated list in ci.yml to match.
 *
 * Usage — needs `npx vite --host 127.0.0.1 --port 4173` running:
 *   node scripts/glass-risk.mjs <player|owner|admin> <route>...
 */
import { chromium } from '@playwright/test';
import { newStubbedPage, resolveRoute, waitForAppReady } from '../scripts/lib/stub-page.mjs';

const BASE = process.env.SMOKE_BASE_URL ?? 'http://127.0.0.1:4173';
const WIDTH = Number(process.env.SMOKE_WIDTH ?? 1440);
/**
 * Span above which a route is worth screenshotting. `/owner-dashboard` sits at
 * 0.544 and the flat routes at 0.083 or below, so anything in between
 * separates them; 0.2 is comfortably inside that gap rather than perched on
 * either edge of it.
 */
const RISK_SPAN = Number(process.env.GLASS_RISK_SPAN ?? 0.2);

const [userType, ...routes] = process.argv.slice(2);
if (!userType || routes.length === 0) {
  console.error('usage: node scripts/glass-risk.mjs <player|owner|admin> <route>...');
  process.exit(2);
}

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
const rows = [];

for (const route of routes) {
  const url = resolveRoute(route);
  const page = await newStubbedPage(browser, { userType, width: WIDTH, height: 900 });
  try {
    await page.goto(`${BASE}${url}`, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForTimeout(900);
    // The splash is a flat `bg-background` sheet over the whole viewport, so
    // measuring through it reports a span of 0 for every route in the app.
    await waitForAppReady(page);

    rows.push({
      url,
      ...(await page.evaluate(() => {
        const probe = (y) => {
          scrollTo(0, y);
          // A point just below the sticky bar, at the horizontal centre.
          for (const el of document.elementsFromPoint(innerWidth / 2, 90)) {
            const m = getComputedStyle(el).backgroundColor.match(/[\d.]+/g);
            if (!m || m.length < 3) continue;
            if (m[3] !== undefined && Number(m[3]) === 0) continue;
            return (
              (Number(m[0]) * 0.2126 + Number(m[1]) * 0.7152 + Number(m[2]) * 0.0722) / 255
            );
          }
          return 0;
        };
        const scrollable = document.body.scrollHeight - innerHeight;
        if (scrollable <= 0) {
          const l = probe(0);
          return { span: 0, lo: l, hi: l };
        }
        const step = Math.max(120, Math.round(scrollable / 30));
        let lo = 1;
        let hi = 0;
        for (let y = 0; y <= scrollable; y += step) {
          const l = probe(y);
          lo = Math.min(lo, l);
          hi = Math.max(hi, l);
        }
        scrollTo(0, 0);
        return { span: hi - lo, lo, hi };
      })),
    });
  } catch (e) {
    rows.push({ url, error: String(e).split('\n')[0].slice(0, 60) });
  }
  await page.context().close();
}

await browser.close();

rows.sort((a, b) => (b.span ?? -1) - (a.span ?? -1));
const round = (n) => (n === undefined ? '  —  ' : n.toFixed(3).padStart(5));

console.log(`\nGlass risk — backdrop luminance span under the bar, ${routes.length} route(s) at ${WIDTH}px\n`);
for (const r of rows) {
  const mark = r.error ? 'ERR ' : r.span >= RISK_SPAN ? 'RISK' : '    ';
  console.log(
    `  ${mark}  span ${round(r.span)}   lo ${round(r.lo)}  hi ${round(r.hi)}   ${r.url}` +
      (r.error ? `   ${r.error}` : ''),
  );
}

const risky = rows.filter((r) => !r.error && r.span >= RISK_SPAN);
console.log(
  `\n${risky.length} route(s) at or above a span of ${RISK_SPAN} — these are the ones worth ` +
    'the screenshot check in glass-contrast.mjs:\n' +
    (risky.length ? `  ${risky.map((r) => r.url).join(' ')}\n` : '  (none)\n'),
);

// Informational by design. A route becoming risky is a signal to widen the
// gated list, not a build failure — the failure, if there is one, is
// glass-contrast's to report.
process.exit(rows.some((r) => r.error) ? 1 : 0);
