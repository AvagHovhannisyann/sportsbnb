#!/usr/bin/env node
/**
 * Contrast of the icons that carry meaning on their own.
 *
 * WCAG 1.4.11, Level AA, at 3:1 — a different criterion from the 1.4.3 that
 * `text-contrast.mjs` measures, with a different threshold and, crucially, a
 * much narrower scope. 1.4.11 covers "graphical objects required to understand
 * the content". An icon sitting next to a label that says the same thing is
 * not required to understand anything; the label already did the work.
 *
 * Getting that scope wrong in either direction makes the check useless. Score
 * every icon in the app and most findings are decorative chrome nobody needs
 * to see — a checker with a long list of things that do not matter is a
 * checker people learn to skip. Score none and the icon-only controls, which
 * are the ones a person genuinely cannot use if they cannot see them, go
 * unmeasured.
 *
 * So the scope here was decided by looking at what the app actually renders
 * rather than by assumption. On /owner/venues, 28 icons: the sidebar's
 * `layout-dashboard` sits inside `<a>Overview</a>`, `building-2` inside
 * `<a>Venues</a>`, and so on — every one paired with its own word. The one
 * icon with no sibling text is the `x` inside `<button aria-label="Close
 * menu">`, where the glyph is the entire control.
 *
 * The rule that falls out:
 *
 *   IN SCOPE   an icon whose nearest interactive ancestor carries no visible
 *              text, or which has its own accessible name — the icon is the
 *              only thing saying what this is
 *   EXEMPT     an icon inside a control or block that also renders text — the
 *              text is the accessible content and the icon decorates it
 *
 * Exempt icons are counted, not hidden, so the ratio of one to the other is
 * visible and a sudden swing is noticeable.
 *
 * The backdrop walk, and everything it refuses to score, is shared with
 * `text-contrast.mjs` — see `scripts/lib/contrast-walk.mjs`.
 *
 * Usage — needs `npx vite --host 127.0.0.1 --port 4173` running:
 *   node scripts/icon-contrast.mjs <player|owner|admin> <route>...
 *   ICON_CONTRAST_SELFTEST=1 node scripts/icon-contrast.mjs player /
 */
import { chromium } from '@playwright/test';
import { newStubbedPage, resolveRoute } from '../scripts/lib/stub-page.mjs';
import { WALK_SOURCE, revealEverything } from '../scripts/lib/contrast-walk.mjs';

const BASE = process.env.SMOKE_BASE_URL ?? 'http://127.0.0.1:4173';
const WIDTH = Number(process.env.SMOKE_WIDTH ?? 1440);
const SELFTEST = process.env.ICON_CONTRAST_SELFTEST === '1';
/** WCAG 1.4.11. Not 4.5 — this is a graphical object, not text. */
const MIN_RATIO = 3;
/**
 * The largest thing still meaningfully "an icon". Lucide renders at 16–24px
 * here; the empty-state glyphs reach 48. Anything past this is a chart or an
 * illustration, made of parts that each carry their own paint.
 */
const MAX_ICON_PX = 64;

const [userType, ...routes] = process.argv.slice(2);
if (!userType || routes.length === 0) {
  console.error('usage: node scripts/icon-contrast.mjs <player|owner|admin> <route>...');
  process.exit(2);
}

// `maxIconPx` is passed in rather than closed over: this body is serialised
// and run in the page, where the Node-side constants do not exist.
const COLLECT = ({ walkSource, maxIconPx }) => {
  const { backdrop, ratio, hex, parse, over } = new Function(
    walkSource + '; return { backdrop, ratio, hex, parse, over };',
  )();

  const out = [];
  for (const svg of document.querySelectorAll('svg')) {
    const cs = getComputedStyle(svg);
    if (cs.visibility === 'hidden' || cs.display === 'none') continue;
    const r = svg.getBoundingClientRect();
    // Below 8px it is a bullet or a caret notch, not a glyph anyone reads.
    if (r.width < 8 || r.height < 8) continue;
    // Above 64px it is not an icon. The first run flagged three "icons" of
    // 250px and 256px at 1.35:1 on /owner/analytics and /operator — Recharts
    // surfaces, whose root `<svg>` reports the default black paint while every
    // line, bar and axis inside sets its own. Scoring one colour for the whole
    // chart describes nothing that is on screen. Charts do fall under 1.4.11,
    // but per series against its neighbours, which is a different measurement
    // and not one this file should pretend to make.
    if (r.width > maxIconPx || r.height > maxIconPx) continue;
    // 1.4.11 exempts inactive controls, same as 1.4.3.
    if (svg.closest('[disabled],[aria-disabled="true"]')) continue;

    // Lucide draws with `stroke="currentColor" fill="none"`, so the computed
    // stroke is already the resolved colour. Reading `color` directly would be
    // wrong for any icon that sets its own stroke or is a filled glyph.
    const strokeIsPaint = cs.stroke && cs.stroke !== 'none';
    const paint = parse(strokeIsPaint ? cs.stroke : cs.fill);
    if (!paint || paint.a === 0) continue;

    const control = svg.closest('button,a,[role="button"],[role="link"],label');
    const controlText = control ? (control.textContent ?? '').trim() : '';
    const named =
      svg.getAttribute('aria-label') ||
      svg.querySelector('title') ||
      (svg.getAttribute('role') === 'img' && svg.getAttribute('aria-labelledby'));
    // The icon is load-bearing when nothing beside it says the same thing.
    const inScope = named ? true : control ? controlText === '' : false;
    if (!inScope) {
      out.push({ exempt: true });
      continue;
    }

    const b = backdrop(svg);
    if (b.reason) {
      out.push({ indeterminate: b.reason });
      continue;
    }
    const solid = paint.a < 1 ? over(b.bg, paint) : paint;

    out.push({
      name: (
        svg.getAttribute('aria-label') ||
        control?.getAttribute('aria-label') ||
        (svg.getAttribute('class') ?? '').match(/lucide-[\w-]+/)?.[0] ||
        'icon'
      ).slice(0, 32),
      fg: hex(solid),
      bg: hex(b.bg),
      size: Math.round(Math.min(r.width, r.height)),
      ratio: ratio(solid, b.bg),
    });
  }
  return out;
};

/**
 * Three icon-only buttons on a known backdrop. On black the ratio is
 * `(L + 0.05) / 0.05`, so #595959 inverts to exactly 3.00:1 and #4d4d4d to
 * 2.48:1 — one either side of the 1.4.11 threshold, because a check that has
 * never failed is not known to be able to.
 *
 * The third is the scope rule under test, and it is the part most likely to be
 * wrong: the same failing colour, but beside a visible label, so it must not
 * appear in the output at all. The first draft of this probe put `aria-label`
 * on each `<svg>` for identification, which is itself a reason to be in scope —
 * so the exempt case came back scored and the rule went untested. The names
 * now come from the buttons, which is also how the app labels an icon-only
 * control.
 */
const SELFTEST_PROBE = () => {
  const host = document.createElement('div');
  host.style.cssText = 'position:fixed;left:0;top:0;z-index:99999;background:#000;padding:8px';
  const icon = (stroke) =>
    `<svg width="20" height="20" viewBox="0 0 20 20" style="stroke:${stroke};fill:none"><path d="M2 2 L18 18"/></svg>`;
  host.innerHTML = `
    <button aria-label="probe-pass-3.00">${icon('#595959')}</button>
    <button aria-label="probe-fail-2.48">${icon('#4d4d4d')}</button>
    <button aria-label="probe-exempt">${icon('#4d4d4d')} Labelled</button>`;
  // Buttons carry a UA background; strip it so the backdrop is the known black.
  for (const el of host.querySelectorAll('button')) el.style.background = 'transparent';
  document.body.appendChild(host);
};

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
const failures = [];
const indeterminate = new Map();
let scored = 0;
let exempt = 0;

for (const route of routes) {
  const url = resolveRoute(route);
  const page = await newStubbedPage(browser, { userType, width: WIDTH, height: 900 });
  await page.goto(`${BASE}${url}`, { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.waitForTimeout(1200);
  await revealEverything(page);

  if (SELFTEST) await page.evaluate(SELFTEST_PROBE);

  for (const rec of await page.evaluate(COLLECT, { walkSource: WALK_SOURCE, maxIconPx: MAX_ICON_PX })) {
    if (rec.exempt) {
      exempt += 1;
      continue;
    }
    if (rec.indeterminate) {
      indeterminate.set(rec.indeterminate, (indeterminate.get(rec.indeterminate) ?? 0) + 1);
      continue;
    }
    scored += 1;
    if (SELFTEST && rec.name.startsWith('probe')) {
      console.log(`  SELFTEST  ${rec.name}  ${rec.ratio}:1  (${rec.fg} on ${rec.bg})`);
    }
    if (rec.ratio < MIN_RATIO) failures.push({ route: url, ...rec });
  }
  await page.context().close();
}

await browser.close();

// One line per distinct colour pair per route: an icon rendered once per row
// of a twelve-row table is one defect, not twelve.
const grouped = new Map();
for (const f of failures) {
  const key = `${f.route}|${f.fg}|${f.bg}|${f.name}`;
  const g = grouped.get(key);
  if (g) g.count += 1;
  else grouped.set(key, { ...f, count: 1 });
}
const unique = [...grouped.values()].sort((a, b) => a.ratio - b.ratio);

console.log(
  `\nIcon contrast — ${scored} load-bearing icon(s) scored, ${exempt} exempt beside a label, ` +
    `across ${routes.length} route(s) at ${WIDTH}px\n`,
);
for (const f of unique) {
  console.log(
    `  FAIL  ${String(f.ratio).padStart(6)} / ${MIN_RATIO}   ${f.fg} on ${f.bg}   ` +
      `${f.route}  ${f.name}  ${f.size}px${f.count > 1 ? ` (x${f.count})` : ''}`,
  );
}
if (unique.length === 0) console.log('  Every load-bearing icon meets WCAG 1.4.11\n');

if (indeterminate.size) {
  console.log(
    `\n  Not scored: ${[...indeterminate].map(([k, v]) => `${v} ${k}`).join(', ')}` +
      ' — see scripts/lib/contrast-walk.mjs for why each is refused rather than guessed\n',
  );
}
if (scored === 0) {
  console.error('  No load-bearing icon was scored — refusing to report a pass.\n');
  process.exit(1);
}

process.exit(unique.length === 0 ? 0 : 1);
