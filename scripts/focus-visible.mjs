#!/usr/bin/env node
/**
 * Every keyboard-focusable control must show a visible focus indicator.
 *
 * WCAG 2.4.7, Level AA — an actual success criterion rather than a best
 * practice. Someone navigating by keyboard needs to know where they are.
 *
 * This measures **pixels**, and that is the whole point of the script.
 *
 * The obvious implementation is to read `getComputedStyle(el).outline` and
 * `.boxShadow` while the element is focused and check that something appeared.
 * I wrote that first, ran it over seven routes, and it reported thirteen
 * controls with no focus ring — including the primary button on the games
 * page. Every one of them was wrong. The custom properties were correct at the
 * same moment (`--tw-ring-shadow: 0 0 0 calc(2px + 2px) hsl(151 90% 47%)`),
 * but the composed `box-shadow` shorthand read back as the transparent
 * fallback, so a Tailwind ring is invisible to that method even while it is
 * painting. Screenshotting the same button focused and unfocused showed 16% of
 * the surrounding pixels changing.
 *
 * So: tab to a control, screenshot it, blur, screenshot again, and count
 * pixels that differ. That is what a person actually sees, and it is immune to
 * however the indicator is implemented — outline, ring, border, background.
 *
 * Real keyboard `Tab` presses, not `.focus()`: `:focus-visible` deliberately
 * does not match programmatic focus on a button, so `.focus()` measures a
 * state no user is ever in.
 *
 * KNOWN LIMITATION — why this is not in CI yet.
 *
 * On /community it reports the "View all" link at 0 changed pixels, stably
 * across runs. That is this script, not the app: focusing each of the three
 * "View all" links directly and diffing a generous region gives 700, 328 and
 * 328 changed pixels, so all three ring correctly. The remaining fault is in
 * how the clip is derived when a Tab stop was off-screen and the browser
 * scrolled it into view — the second screenshot ends up framing something
 * other than the first.
 *
 * Four measurement bugs have been found in this file so far and each one
 * produced confident false failures. Until the clip is right, this runs by
 * hand and its output is read with that in mind; gating a build on it would
 * mean trusting it more than the evidence supports.
 *
 * Usage:
 *   node scripts/focus-visible.mjs <player|owner|admin> <route>...
 */
import { chromium } from '@playwright/test';
import { newStubbedPage, resolveRoute } from '../scripts/lib/stub-page.mjs';

const BASE = process.env.SMOKE_BASE_URL ?? 'http://127.0.0.1:4173';
const WIDTH = Number(process.env.SMOKE_WIDTH ?? 1440);
/** Tab stops to sample per route. The header alone is a dozen. */
const STOPS = Number(process.env.FOCUS_STOPS ?? 14);
/**
 * Changed pixels required, as an absolute count rather than a share of the box.
 *
 * A percentage was the first choice and it is wrong here: the sampled box
 * spans the control *and its parent*, so the same 2px ring is 17% of a small
 * button measured alone and 0.76% of the same button inside a wide toolbar.
 * The indicator did not change; the denominator did. An absolute count does
 * not care how much furniture is in shot.
 *
 * A 2px ring around even a 40x40 control is several hundred pixels. With focus
 * styling suppressed the count is exactly 0, so there is no antialiasing floor
 * to clear; 100 is a wide margin either way.
 */
const MIN_CHANGED_PX = 100;

const [userType, ...routes] = process.argv.slice(2);
if (!userType || routes.length === 0) {
  console.error('usage: node scripts/focus-visible.mjs <player|owner|admin> <route>...');
  process.exit(2);
}

const changedPixels = async (probe, a, b) =>
  probe.evaluate(async ({ a, b }) => {
    const load = (s) =>
      new Promise((res, rej) => {
        const i = new Image();
        i.onload = () => res(i);
        i.onerror = rej;
        i.src = 'data:image/png;base64,' + s;
      });
    const [ia, ib] = await Promise.all([load(a), load(b)]);
    const c = document.createElement('canvas');
    c.width = ia.width;
    c.height = ia.height;
    const ctx = c.getContext('2d');
    ctx.drawImage(ia, 0, 0);
    const da = ctx.getImageData(0, 0, c.width, c.height).data;
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.drawImage(ib, 0, 0);
    const db = ctx.getImageData(0, 0, c.width, c.height).data;
    let changed = 0;
    for (let i = 0; i < da.length; i += 4) {
      const d = Math.abs(da[i] - db[i]) + Math.abs(da[i + 1] - db[i + 1]) + Math.abs(da[i + 2] - db[i + 2]);
      if (d > 24) changed += 1;
    }
    return changed;
  }, { a, b });

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
const probe = await browser.newPage();
const failures = [];
let measured = 0;

for (const route of routes) {
  const url = resolveRoute(route);
  const page = await newStubbedPage(browser, { userType, width: WIDTH, height: 900 });
  await page.goto(`${BASE}${url}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);

  const seen = new Set();
  for (let i = 0; i < STOPS; i++) {
    await page.keyboard.press('Tab');
    // Tabbing to something below the fold scrolls it into view, and the rect
    // is only correct once that settles. Reading immediately gave a clip
    // computed from the pre-scroll position, which cropped the footer links
    // and reported 88 changed pixels for a 4px ring that was plainly drawn.
    await page.waitForTimeout(150);
    const target = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el || el === document.body || el === document.documentElement) return null;
      const r = el.getBoundingClientRect();
      // Off-screen or collapsed: nothing to look at.
      if (r.width < 6 || r.height < 6) return null;
      if (r.bottom < 0 || r.top > innerHeight || r.right < 0 || r.left > innerWidth) return null;
      const name = (el.getAttribute('aria-label') || el.textContent || el.tagName).trim().slice(0, 30);
      return {
        key: `${el.tagName}|${name}|${Math.round(r.x)},${Math.round(r.y)}`,
        name,
        tag: el.tagName.toLowerCase(),
        // The union of the control and its parent, plus a margin.
        //
        // Clipping to the control alone was not enough: a composed field —
        // the home page's search bar, where a transparent input sits inside a
        // bordered segment — draws its indicator with `focus-within` on the
        // wrapper, outside the input's own box. The check reported 0.04% for
        // a ring that was plainly on screen, which would have made every
        // focus-within pattern in the app a false positive.
        clip: (() => {
          const p = el.parentElement?.getBoundingClientRect();
          const x = Math.max(0, Math.min(r.x, p?.x ?? r.x) - 8);
          const y = Math.max(0, Math.min(r.y, p?.y ?? r.y) - 8);
          const right = Math.max(r.right, p?.right ?? r.right) + 8;
          const bottom = Math.max(r.bottom, p?.bottom ?? r.bottom) + 8;
          return {
            x,
            y,
            // `innerWidth`/`innerHeight`, not the Node-side constants — this
            // runs in the page, where those names do not exist.
            width: Math.min(right - x, innerWidth - x),
            height: Math.min(bottom - y, innerHeight - y),
          };
        })(),
      };
    });
    if (!target || seen.has(target.key)) continue;
    seen.add(target.key);

    const focused = (await page.screenshot({ clip: target.clip })).toString('base64');
    await page.evaluate(() => document.activeElement?.blur());
    await page.waitForTimeout(120);
    const blurred = (await page.screenshot({ clip: target.clip })).toString('base64');

    measured += 1;
    const changed = await changedPixels(probe, focused, blurred);
    if (changed < MIN_CHANGED_PX) {
      failures.push({ route: url, name: target.name, tag: target.tag, changed });
    }

    // Focus was dropped to take the second shot; put the caret back where the
    // tab order was, so the next Tab continues rather than restarting.
    await page.evaluate((k) => {
      const els = [...document.querySelectorAll('a[href],button,input,select,textarea,[tabindex]')];
      const el = els.find((e) => {
        const r = e.getBoundingClientRect();
        return `${e.tagName}|${(e.getAttribute('aria-label') || e.textContent || e.tagName).trim().slice(0, 30)}|${Math.round(r.x)},${Math.round(r.y)}` === k;
      });
      el?.focus();
    }, target.key);
  }

  await page.context().close();
}

await browser.close();

console.log(`\nFocus visibility — ${measured} control(s) across ${routes.length} route(s) at ${WIDTH}px\n`);
if (measured === 0) {
  console.error('  No focusable controls reached — refusing to report a pass.\n');
  process.exit(1);
}
if (failures.length === 0) {
  console.log('  Every control repainted visibly when focused by keyboard\n');
} else {
  for (const f of failures) {
    console.log(`  FAIL  ${f.route}  ${f.tag} ${JSON.stringify(f.name)} — ${f.changed} pixel(s) changed`);
  }
  console.log(`\n${failures.length} control(s) with no visible focus indicator (WCAG 2.4.7)\n`);
}

process.exit(failures.length === 0 ? 0 : 1);
