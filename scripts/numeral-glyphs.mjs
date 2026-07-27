#!/usr/bin/env node
/**
 * Asserts that nothing set in `.stat-numeral` asks for a glyph the monospaced
 * font does not have.
 *
 * `.stat-numeral` is JetBrains Mono with tabular figures. That is the right
 * face for a price — tabular figures are what let a column of them line up —
 * but JetBrains Mono is a Latin font, and the app prices in Armenian dram.
 * U+058F is not in it, so the dram sign falls through the stack to Noto Sans
 * Armenian: a proportional face, dropped into the middle of a monospaced run
 * carrying none of its metrics.
 *
 * Measured at 20px on the venue card: every digit and the `$` advance 12px, as
 * a monospaced font guarantees. The dram sign advances 14.7px and stands 30px
 * tall in a 28px line box. Rendered at 6x, `֏` and the `8` beside it visibly
 * touch — the most important number on the card reads as one mangled shape.
 *
 * The fix was not a different font; it was not putting the symbol there at
 * all. `<Price>` sets the mark in the sans stack and the digits in the mono
 * one. So the invariant that keeps it fixed is simply that `.stat-numeral`
 * stays inside the font's repertoire.
 *
 * Usage:
 *   node scripts/numeral-glyphs.mjs <player|owner|admin> <route>...
 */
import { chromium } from '@playwright/test';
import { newStubbedPage, resolveRoute } from '../scripts/lib/stub-page.mjs';

const BASE = process.env.SMOKE_BASE_URL ?? 'http://127.0.0.1:4173';
const WIDTH = Number(process.env.SMOKE_WIDTH ?? 1440);

const [userType, ...routes] = process.argv.slice(2);
if (!userType || routes.length === 0) {
  console.error('usage: node scripts/numeral-glyphs.mjs <player|owner|admin> <route>...');
  process.exit(2);
}

/**
 * Everything JetBrains Mono covers that a numeral run legitimately needs:
 * printable ASCII, a non-breaking space, and the dashes and multiplication
 * sign that time and quantity strings use. Deliberately narrow — this is a
 * numeral, not prose.
 *
 * Passed into the page as a source string rather than written a second time
 * inside `evaluate`. Two copies of one pattern drifting apart is the class of
 * bug this script exists to catch; it should not contain an instance of it.
 */
const ALLOWED_SOURCE = '^[\\x20-\\x7E\\u00A0\\u2013\\u2014\\u2212\\u00D7]*$';

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
const findings = [];
let checked = 0;

for (const route of routes) {
  const url = resolveRoute(route);
  const page = await newStubbedPage(browser, { userType, width: WIDTH, height: 900 });
  // `domcontentloaded`, not `networkidle`.
  //
  // networkidle never settles on a page that mounts a map — the SDK keeps
  // fetching tiles — so the navigation sat until the 30s timeout and failed
  // the whole smoke job. That is exactly what happened on /list-venue once
  // this ran over the full owner route list. Every other audit here already
  // uses domcontentloaded plus a fixed settle for the same reason.
  await page.goto(`${BASE}${url}`, { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.waitForTimeout(1200);

  const bad = await page.evaluate((allowedSource) => {
    const allowed = new RegExp(allowedSource);
    const out = [];
    let seen = 0;
    for (const el of document.querySelectorAll('.stat-numeral')) {
      const text = (el.textContent ?? '').trim();
      if (!text) continue;
      seen += 1;
      if (allowed.test(text)) continue;
      out.push({
        text,
        offenders: [...new Set([...text].filter((c) => !allowed.test(c)))].map(
          (c) =>
            `${JSON.stringify(c)} U+${c.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')}`,
        ),
      });
    }
    return { out, seen };
  }, ALLOWED_SOURCE);

  checked += bad.seen;
  for (const b of bad.out) findings.push({ route: url, ...b });
  await page.context().close();
}

await browser.close();

console.log(
  `\nNumeral glyph coverage — ${checked} .stat-numeral run(s) across ${routes.length} route(s) at ${WIDTH}px\n`,
);
if (findings.length === 0) {
  console.log('  Every numeral run is within the monospaced font\n');
} else {
  for (const f of findings) {
    console.log(`  FAIL  ${f.route}  ${JSON.stringify(f.text)}  →  ${f.offenders.join(', ')}`);
  }
  console.log(
    `\n${findings.length} numeral run(s) reach outside JetBrains Mono.` +
      ' Use <Price> so the currency mark sets in the sans stack.\n',
  );
}

process.exit(findings.length === 0 ? 0 : 1);
