#!/usr/bin/env node
/**
 * Asserts that a loading skeleton has the same geometry as the thing it stands
 * in for.
 *
 * A skeleton exists for exactly one reason: to hold the space the real content
 * will occupy, so nothing jumps when the data lands. A skeleton whose box is
 * the wrong shape does not merely fail to help — it *causes* the shift it was
 * added to prevent, and it does so while looking, in code review, like the fix.
 *
 * That is not hypothetical. `/venues` shipped a skeleton carrying the comment
 *
 *     aspect-[5/4] mirrors VenueCard's own image box — a skeleton whose
 *     geometry differs from the real card just relocates the layout shift
 *     instead of removing it
 *
 * directly above an `aspect-[5/4]` box, while VenueCard's image had since moved
 * to `aspect-[3/2]`. Measured at 1440: skeleton 323x258, real card 323x215.
 * Every card in the grid rose 43px on load. The comment was right and the code
 * had drifted out from under it, which is the failure mode a comment cannot
 * catch and a measurement can.
 *
 * Method: hold the REST response so the skeleton is on screen, measure it,
 * release, wait for the real thing, measure that. Compare aspect ratios rather
 * than pixel heights — the width is set by the grid and is the same for both,
 * so the ratio is the part the author actually chose.
 *
 * Usage:
 *   node scripts/layout-shift.mjs
 */
import { chromium } from '@playwright/test';
import { newStubbedPage, IDS } from '../scripts/lib/stub-page.mjs';

const BASE = process.env.SMOKE_BASE_URL ?? 'http://127.0.0.1:4173';
const WIDTH = Number(process.env.SMOKE_WIDTH ?? 1440);

/**
 * Each case names the route, the request to stall so the skeleton stays up,
 * and a selector for the box whose shape both states must agree on.
 *
 * `box` runs against the skeleton DOM and the settled DOM in turn, so it has
 * to match in both. Filtering by size rather than by class keeps it from
 * depending on utility names that are the very thing under test.
 */
const CASES = [
  {
    label: '/venues venue card image',
    route: '/venues',
    stall: '**/rest/v1/venues*',
    // The card image box: the first sizeable aspect-ratio element in the grid.
    // Thresholds are a fraction of the viewport, not pixels — a hardcoded
    // `width > 600` passed at 1440 and found nothing at 375, where it reported
    // "could not measure" rather than a false clean. Relative keeps one
    // selector honest at both widths.
    box: () => {
      const els = [...document.querySelectorAll('[class*="aspect-"]')]
        .map((e) => e.getBoundingClientRect())
        .filter((r) => r.width > innerWidth * 0.15 && r.height > 60);
      return els.length ? { w: els[0].width, h: els[0].height } : null;
    },
  },
  {
    label: 'venue detail gallery',
    route: `/venue/${IDS.venue}`,
    stall: '**/rest/v1/venues*',
    box: () => {
      const els = [...document.querySelectorAll('[class*="aspect-"], .rounded-xl')]
        .map((e) => e.getBoundingClientRect())
        .filter((r) => r.width > innerWidth * 0.6 && r.height > 100);
      return els.length ? { w: els[0].width, h: els[0].height } : null;
    },
  },
];

// A skeleton is a placeholder, not a pixel-perfect copy; a few percent of
// difference is not a layout shift anyone perceives. 5% of the box height is
// the line — the /venues case was 20% out.
const TOLERANCE = 0.05;

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
const failures = [];
const rows = [];

for (const { label, route, stall, box } of CASES) {
  const page = await newStubbedPage(browser, { userType: 'player', width: WIDTH, height: 900 });

  let release;
  const gate = new Promise((r) => (release = r));
  await page.route(stall, async (r) => {
    await gate;
    await r.fallback();
  });

  // The navigation is deliberately not awaited — the point is to look at the
  // page mid-flight — but its failure must not be swallowed. With the dev
  // server down this reported "could not measure the skeleton", which reads
  // as a finding about the app rather than as "there was nothing to load".
  // I misdiagnosed my own run on exactly that message.
  let navError = null;
  page.goto(`${BASE}${route}`, { waitUntil: 'commit' }).catch((e) => {
    navError = String(e).split('\n')[0];
  });
  await page.waitForTimeout(2000);
  if (navError) {
    failures.push(`${label}: could not reach the page — ${navError}`);
    rows.push(`  FAIL  ${label} — ${navError}`);
    await page.context().close();
    continue;
  }
  const before = await page.evaluate(box);

  release();
  await page.waitForTimeout(2500);
  const after = await page.evaluate(box);

  if (!before || !after) {
    // Never pass because the selector found nothing — that is the failure mode
    // that makes an audit report clean while measuring air.
    failures.push(`${label}: could not measure ${!before ? 'the skeleton' : 'the settled page'}`);
    rows.push(`  FAIL  ${label} — nothing to measure`);
    await page.context().close();
    continue;
  }

  const rBefore = before.w / before.h;
  const rAfter = after.w / after.h;
  const drift = Math.abs(before.h - after.h) / after.h;
  const ok = drift <= TOLERANCE;
  if (!ok) {
    failures.push(
      `${label}: skeleton ${Math.round(before.w)}x${Math.round(before.h)} (${rBefore.toFixed(2)}) ` +
        `vs settled ${Math.round(after.w)}x${Math.round(after.h)} (${rAfter.toFixed(2)}) ` +
        `— content moves ${Math.round(Math.abs(before.h - after.h))}px on load`,
    );
  }
  rows.push(
    `  ${ok ? '  ok' : 'FAIL'}  ${label.padEnd(28)} skeleton ${rBefore.toFixed(2)} → settled ${rAfter.toFixed(2)}  (${Math.round(drift * 100)}% height drift)`,
  );

  await page.context().close();
}

await browser.close();

console.log(`\nSkeleton geometry — ${CASES.length} case(s) at ${WIDTH}px\n`);
rows.forEach((r) => console.log(r));
console.log(
  failures.length === 0
    ? '\nEvery skeleton holds the space its content lands in\n'
    : `\n${failures.length} skeleton(s) shift the page:\n${failures.map((f) => `  - ${f}`).join('\n')}\n`,
);

process.exit(failures.length === 0 ? 0 : 1);
