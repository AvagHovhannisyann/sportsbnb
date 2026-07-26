#!/usr/bin/env node
/**
 * Heading structure: one `h1` per page, and no skipped levels.
 *
 * A screen-reader user navigates a page by its headings, and the levels are
 * the outline. A page that goes h1 → h3 has a hole in it; a page with two h1s
 * has two documents in it.
 *
 * Neither is a WCAG conformance failure — level skipping is a best practice
 * rather than a success criterion — so this is a quality check, not a legal
 * one. It still found real drift on ten of fourteen routes the first time it
 * ran:
 *
 *   - The footer's column headings were `h4` with nothing above them inside
 *     the footer landmark, so *every page in the app* skipped two levels at
 *     the same place.
 *   - `CardTitle` is a hardcoded `h3`, which is right where cards sit under an
 *     `h2` section and wrong where they are the first thing under the page's
 *     `h1`. It now takes an `as` prop so the level can follow the placement.
 *   - The venue and game card titles were `h3` directly under the page `h1`.
 *
 * All of those are invisible: heading level carries no styling here, because
 * the base rule treats h1–h6 alike and the size comes from utility classes.
 * Invisible is exactly why it drifted.
 *
 * Usage:
 *   node scripts/heading-outline.mjs <player|owner|admin> <route>...
 */
import { chromium } from '@playwright/test';
import { newStubbedPage, resolveRoute } from '../scripts/lib/stub-page.mjs';

const BASE = process.env.SMOKE_BASE_URL ?? 'http://127.0.0.1:4173';
const WIDTH = Number(process.env.SMOKE_WIDTH ?? 1440);

const [userType, ...routes] = process.argv.slice(2);
if (!userType || routes.length === 0) {
  console.error('usage: node scripts/heading-outline.mjs <player|owner|admin> <route>...');
  process.exit(2);
}

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
const findings = [];
let measured = 0;

for (const route of routes) {
  const url = resolveRoute(route);
  const page = await newStubbedPage(browser, { userType, width: WIDTH, height: 900 });
  await page.goto(`${BASE}${url}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);

  const outline = await page.evaluate(() => {
    // Rendered headings only. A heading inside a closed dialog or a collapsed
    // panel is not part of the outline anyone is reading.
    const hs = [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')].filter((h) => {
      const r = h.getBoundingClientRect();
      return r.height > 0 && r.width > 0 && (h.textContent ?? '').trim();
    });
    const levels = hs.map((h) => Number(h.tagName[1]));
    const skips = [];
    for (let i = 1; i < levels.length; i++) {
      if (levels[i] - levels[i - 1] > 1) {
        skips.push({
          from: levels[i - 1],
          to: levels[i],
          text: (hs[i].textContent ?? '').trim().slice(0, 32),
        });
      }
    }
    return { count: levels.length, h1s: levels.filter((l) => l === 1).length, first: levels[0] ?? null, skips };
  });

  if (outline.count === 0) {
    // A page with no headings at all is not a page that passed.
    findings.push({ route: url, why: 'no rendered headings' });
  } else {
    measured += outline.count;
    if (outline.h1s !== 1) {
      findings.push({ route: url, why: `${outline.h1s} h1 element(s), expected exactly 1` });
    }
    if (outline.first !== null && outline.first !== 1) {
      findings.push({ route: url, why: `outline starts at h${outline.first}, not h1` });
    }
    for (const s of outline.skips) {
      findings.push({ route: url, why: `h${s.from} → h${s.to} at ${JSON.stringify(s.text)}` });
    }
  }

  await page.context().close();
}

await browser.close();

console.log(`\nHeading outline — ${measured} heading(s) across ${routes.length} route(s) at ${WIDTH}px\n`);
if (findings.length === 0) {
  console.log('  Every route has one h1 and no skipped levels\n');
} else {
  for (const f of findings) console.log(`  FAIL  ${f.route}  ${f.why}`);
  console.log(`\n${findings.length} outline problem(s)\n`);
}

process.exit(findings.length === 0 ? 0 : 1);
