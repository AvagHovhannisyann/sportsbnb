#!/usr/bin/env node
/**
 * Contrast of what the app actually renders, against the backdrop it actually
 * lands on — text under WCAG 1.4.3 and load-bearing icons under 1.4.11.
 *
 * WHY THIS EXISTS AT ALL
 *
 * There were already two contrast checks and neither measures this.
 * `contrast-audit.mjs` renders a swatch per (token, surface) pair — real
 * browser, real stylesheet, but a synthetic pairing chosen by hand, so it can
 * only vouch for combinations someone thought to list. `palette-contrast.mjs`
 * reads class strings out of the source and scores a raw palette colour
 * against its *best case* across every surface in the theme; it says so in its
 * own comment, because a colour that clears AA on `--card` tells you nothing
 * about the same colour on a tint inside a `--muted` panel.
 *
 * The owner's earnings ledger is the case that proves the gap.
 * `text-emerald-600` on the card measures 4.13:1 — under AA, on the one screen
 * in the app where a number is money — and both checks ran clean over it. The
 * token audit never saw it because it is not a token; the source audit passed
 * it, correctly by its own rule, because emerald-600 does reach AA on the
 * darkest surface in the theme. It just was not sitting on that one.
 *
 * HOW
 *
 * For each element carrying visible text, and each icon that is the whole
 * control rather than decoration:
 *
 *   - take the computed `color` (or the icon's `stroke`/`fill`) as foreground;
 *   - composite the backdrop by walking ancestors and layering each
 *     `background-color` until one is opaque — which is what makes a tint like
 *     `bg-success/10` resolve to the colour a person sees rather than to
 *     "transparent";
 *   - pick the threshold from the role: 4.5:1 for body text, 3:1 for large
 *     text (>=24px, or >=18.66px at weight >=700) and for graphical objects.
 *
 * WHAT IT REFUSES TO SCORE, which matters more than what it scores
 *
 * A contrast checker that guesses is worse than none, because its passes stop
 * meaning anything. The four situations that make the analytic walk unsound
 * are counted and reported as *indeterminate* rather than folded into either
 * column — see `scripts/lib/contrast-walk.mjs`, which owns that judgement and
 * states each reason.
 *
 * WHICH ICONS COUNT
 *
 * 1.4.11 covers "graphical objects required to understand the content". An
 * icon next to a label saying the same thing is not required to understand
 * anything; the label already did the work. Getting that scope wrong in either
 * direction makes the check useless — score every icon and the output is
 * hundreds of lines of decorative chrome, score none and the icon-only
 * controls go unmeasured.
 *
 * The rule came from what the app renders. On /owner/venues, 28 icons:
 * `layout-dashboard` inside `<a>Overview</a>`, `building-2` inside
 * `<a>Venues</a>`, each paired with its own word. The one icon with no sibling
 * text is the `x` in `<button aria-label="Close menu">`, where the glyph is
 * the entire control. So: in scope when the nearest interactive ancestor
 * carries no visible text, or the icon has its own accessible name. Exempt
 * icons are counted, not hidden, so a swing in the ratio is visible.
 *
 * WHY ONE SCRIPT AND NOT TWO
 *
 * This was two files, and each loaded all 62 routes and ran its own scroll
 * sweep. Measured at ~4s per route per audit, that was about four minutes of
 * CI spent visiting the same pages a second time to ask a second question
 * about the same pixels. One navigation, one reveal, one walk, two criteria.
 *
 * Usage — needs `npx vite --host 127.0.0.1 --port 4173` running:
 *   node scripts/rendered-contrast.mjs <player|owner|admin> <route>...
 *   CONTRAST_SELFTEST=1 node scripts/rendered-contrast.mjs player /
 */
import { chromium } from '@playwright/test';
import { newStubbedPage, resolveRoute, waitForAppReady } from '../scripts/lib/stub-page.mjs';
import { WALK_SOURCE, revealEverything } from '../scripts/lib/contrast-walk.mjs';

const BASE = process.env.SMOKE_BASE_URL ?? 'http://127.0.0.1:4173';
const WIDTH = Number(process.env.SMOKE_WIDTH ?? 1440);
/**
 * Injects swatches whose ratios are fixed by construction, to prove the check
 * can fail before its passes are believed. Every audit in this directory that
 * skipped this step shipped with a measurement bug.
 */
const SELFTEST = process.env.CONTRAST_SELFTEST === '1';
/** WCAG 1.4.11, for a graphical object rather than text. */
const ICON_MIN = 3;
/**
 * The largest thing still meaningfully "an icon". Lucide renders at 16–24px
 * here; empty-state glyphs reach 48. Past this it is a chart or an
 * illustration, made of parts that each carry their own paint.
 */
const MAX_ICON_PX = 64;

const [userType, ...routes] = process.argv.slice(2);
if (!userType || routes.length === 0) {
  console.error('usage: node scripts/rendered-contrast.mjs <player|owner|admin> <route>...');
  process.exit(2);
}

/**
 * Runs in the page. Returns text records and icon records from one visit.
 *
 * The compositing helpers arrive as source text and are rebuilt with
 * `new Function`, because `page.evaluate` serialises this callback and drops
 * anything it closed over. `maxIconPx` is passed in for the same reason — a
 * Node-side constant referenced in here is a `ReferenceError` at runtime, which
 * is how the first version of the icon pass failed.
 */
const COLLECT = ({ walkSource, maxIconPx }) => {
  const { backdrop, ratio, hex, parse, over } = new Function(
    walkSource + '; return { backdrop, ratio, hex, parse, over };',
  )();

  const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TITLE', 'HEAD', 'SVG', 'PATH']);
  const text = [];
  const icons = [];

  for (const el of document.querySelectorAll('*')) {
    if (SKIP_TAGS.has(el.tagName)) continue;
    // Direct text children only — otherwise a wrapper is scored once per
    // descendant and one failure is reported as twenty.
    let content = '';
    for (const n of el.childNodes) if (n.nodeType === 3) content += n.nodeValue;
    content = content.trim();
    if (!content) continue;

    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none') continue;
    const r = el.getBoundingClientRect();
    // 1x1 boxes are `sr-only`: real colour, no pixels, nothing to read.
    if (r.width < 2 || r.height < 2) continue;
    // WCAG 1.4.3 exempts disabled controls.
    if (el.closest('[disabled],[aria-disabled="true"]')) continue;

    const fg = parse(cs.color);
    // `color: transparent` is background-clip:text — the glyph is painted by
    // the background, which this walk cannot read.
    if (!fg || fg.a === 0) {
      text.push({ indeterminate: 'transparent-text' });
      continue;
    }
    const b = backdrop(el);
    if (b.reason) {
      text.push({ indeterminate: b.reason });
      continue;
    }

    const size = parseFloat(cs.fontSize);
    const weight = parseInt(cs.fontWeight, 10) || 400;
    const large = size >= 24 || (size >= 18.66 && weight >= 700);
    // Semi-transparent text (`text-foreground/50`) composites onto the
    // backdrop before it is scored — `rgba(255,255,255,.5)` on black is grey,
    // and scoring the unmixed white would call a 5.3:1 label a 21:1 one.
    const solid = fg.a < 1 ? over(b.bg, fg) : fg;

    text.push({
      label: content.slice(0, 40),
      selector: `${el.tagName.toLowerCase()}${typeof el.className === 'string' && el.className ? '.' + el.className.trim().split(/\s+/).slice(0, 3).join('.') : ''}`,
      fg: hex(solid),
      bg: hex(b.bg),
      detail: `${size}px/${weight}`,
      min: large ? 3 : 4.5,
      ratio: ratio(solid, b.bg),
    });
  }

  for (const svg of document.querySelectorAll('svg')) {
    const cs = getComputedStyle(svg);
    if (cs.visibility === 'hidden' || cs.display === 'none') continue;
    const r = svg.getBoundingClientRect();
    // Below 8px it is a bullet or a caret notch, not a glyph anyone reads.
    if (r.width < 8 || r.height < 8) continue;
    // Above the cap it is a Recharts surface or an illustration: the root
    // `<svg>` reports the default black paint while every line, bar and axis
    // inside sets its own, so one colour for the whole thing describes nothing
    // on screen. Charts do fall under 1.4.11, but per series against its
    // neighbours — a different measurement this file should not fake.
    if (r.width > maxIconPx || r.height > maxIconPx) continue;
    if (svg.closest('[disabled],[aria-disabled="true"]')) continue;

    // Lucide draws with `stroke="currentColor" fill="none"`, so the computed
    // stroke is already resolved. Reading `color` would be wrong for any icon
    // that sets its own stroke or is a filled glyph.
    const paint = parse(cs.stroke && cs.stroke !== 'none' ? cs.stroke : cs.fill);
    if (!paint || paint.a === 0) continue;

    const control = svg.closest('button,a,[role="button"],[role="link"],label');
    const controlText = control ? (control.textContent ?? '').trim() : '';
    const named =
      svg.getAttribute('aria-label') ||
      svg.querySelector('title') ||
      (svg.getAttribute('role') === 'img' && svg.getAttribute('aria-labelledby'));
    // Load-bearing when nothing beside it says the same thing.
    if (!(named ? true : control ? controlText === '' : false)) {
      icons.push({ exempt: true });
      continue;
    }

    const b = backdrop(svg);
    if (b.reason) {
      icons.push({ indeterminate: b.reason });
      continue;
    }
    const solid = paint.a < 1 ? over(b.bg, paint) : paint;

    icons.push({
      label: (
        svg.getAttribute('aria-label') ||
        control?.getAttribute('aria-label') ||
        (svg.getAttribute('class') ?? '').match(/lucide-[\w-]+/)?.[0] ||
        'icon'
      ).slice(0, 32),
      selector: 'svg',
      fg: hex(solid),
      bg: hex(b.bg),
      detail: `${Math.round(Math.min(r.width, r.height))}px`,
      min: 3,
      ratio: ratio(solid, b.bg),
    });
  }

  return { text, icons };
};

/**
 * Probes with ratios fixed by construction. On black the ratio is
 * `(L + 0.05) / 0.05`, so a target inverts to a grey directly: #595959 has
 * L = 0.0999 and therefore 3.00:1, #ffffff has L = 1 and therefore 21:1.
 *
 *   text  white      21.00  passes at 4.5   — does not fail everything
 *   text  grey 16px   3.00  FAILS at 4.5    — can fail at all
 *   text  grey 28px   3.00  passes at 3     — large text takes the lower bar
 *   text  tint       17.40  passes at 4.5   — white on a 10% white tint over
 *                                             black, i.e. white on #1a1a1a
 *   icon  grey        3.00  passes at 3     — the 1.4.11 threshold
 *   icon  dim         2.48  FAILS at 3      — either side of it
 *   icon  labelled     —    absent entirely — the scope rule
 *
 * The tint is why this file exists: `palette-contrast.mjs` cannot see a tint
 * at all, and a DOM walk that reads `backgroundColor` without compositing gets
 * `rgba(0,0,0,0)`. Reading back `#1a1a1a` is the assertion.
 *
 * The last one is the scope rule, and it is the part most likely to be wrong:
 * the same failing colour beside a visible label, which must not appear at
 * all. An earlier draft put `aria-label` on each probe `<svg>` for
 * identification — itself grounds to be in scope — so the exempt case came
 * back scored and the rule went untested.
 *
 * Three drafts of these comments asserted ratios from memory (4.83, 3.95,
 * 5.71, 4.68, 2.44) and the checks returned 6.92, 4.62, 17.49, 4.34 and 2.48.
 * The checks were right every time. Expectations here come from the formula.
 */
const SELFTEST_PROBE = () => {
  const host = document.createElement('div');
  host.id = 'contrast-selftest';
  host.style.cssText = 'position:fixed;left:0;top:0;z-index:99999;background:#000;padding:8px';
  const icon = (stroke) =>
    `<svg width="20" height="20" viewBox="0 0 20 20" style="stroke:${stroke};fill:none"><path d="M2 2 L18 18"/></svg>`;
  host.innerHTML = `
    <p style="color:#fff;font-size:16px">probe-white-21</p>
    <p style="color:#595959;font-size:16px">probe-small-3</p>
    <p style="color:#595959;font-size:28px">probe-large-3</p>
    <div style="background:rgba(255,255,255,0.1)">
      <p style="color:#fff;font-size:16px">probe-tint-17.4</p>
    </div>
    <button aria-label="probe-icon-pass-3.00">${icon('#595959')}</button>
    <button aria-label="probe-icon-fail-2.48">${icon('#4d4d4d')}</button>
    <button aria-label="probe-icon-exempt">${icon('#4d4d4d')} Labelled</button>`;
  // Buttons carry a UA background; strip it so the backdrop is the known black.
  for (const el of host.querySelectorAll('button')) el.style.background = 'transparent';
  document.body.appendChild(host);
};

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
const failures = { text: [], icons: [] };
const indeterminate = new Map();
const scored = { text: 0, icons: 0 };
let exempt = 0;

for (const route of routes) {
  const url = resolveRoute(route);
  const page = await newStubbedPage(browser, { userType, width: WIDTH, height: 900 });
  // `domcontentloaded`, not `networkidle` — the latter never settles on a page
  // that mounts a map, which timed out the whole smoke job once already.
  await page.goto(`${BASE}${url}`, { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.waitForTimeout(1200);
  await waitForAppReady(page);
  await revealEverything(page);

  if (SELFTEST) await page.evaluate(SELFTEST_PROBE);

  const found = await page.evaluate(COLLECT, { walkSource: WALK_SOURCE, maxIconPx: MAX_ICON_PX });
  for (const kind of ['text', 'icons']) {
    for (const rec of found[kind]) {
      if (rec.exempt) {
        exempt += 1;
        continue;
      }
      if (rec.indeterminate) {
        indeterminate.set(rec.indeterminate, (indeterminate.get(rec.indeterminate) ?? 0) + 1);
        continue;
      }
      scored[kind] += 1;
      if (SELFTEST && rec.label.startsWith('probe')) {
        console.log(`  SELFTEST  ${rec.label}  ${rec.ratio}:1  (${rec.fg} on ${rec.bg})`);
      }
      if (rec.ratio < rec.min) failures[kind].push({ route: url, ...rec });
    }
  }
  await page.context().close();
}

await browser.close();

// One line per distinct (route, colour pair, threshold): a component rendered
// in a list of twelve is one defect, not twelve.
const collapse = (list) => {
  const grouped = new Map();
  for (const f of list) {
    const key = `${f.route}|${f.fg}|${f.bg}|${f.min}|${f.label}`;
    const g = grouped.get(key);
    if (g) g.count += 1;
    else grouped.set(key, { ...f, count: 1 });
  }
  return [...grouped.values()].sort((a, b) => a.ratio - b.ratio);
};

const report = (title, list, criterion) => {
  const unique = collapse(list);
  console.log(`\n${title}\n`);
  for (const f of unique) {
    console.log(
      `  FAIL  ${String(f.ratio).padStart(6)} / ${f.min}   ${f.fg} on ${f.bg}   ` +
        `${f.route}  ${JSON.stringify(f.label)}${f.count > 1 ? ` (x${f.count})` : ''}`,
    );
    console.log(`        ${f.selector}  ${f.detail}`);
  }
  if (unique.length === 0) console.log(`  Everything scored meets ${criterion}`);
  return unique.length;
};

console.log(
  `\nRendered contrast — ${scored.text} text run(s) and ${scored.icons} load-bearing icon(s) ` +
    `(${exempt} icons exempt beside a label) across ${routes.length} route(s) at ${WIDTH}px`,
);
const bad =
  report(`Text — WCAG 1.4.3`, failures.text, 'WCAG 1.4.3') +
  report(`Icons — WCAG 1.4.11 at ${ICON_MIN}:1`, failures.icons, 'WCAG 1.4.11');

if (indeterminate.size) {
  console.log(
    `\n  Not scored: ${[...indeterminate].map(([k, v]) => `${v} ${k}`).join(', ')}` +
      ' — see scripts/lib/contrast-walk.mjs for why each is refused rather than guessed',
  );
}
console.log('');

if (scored.text === 0 || scored.icons === 0) {
  console.error('  A whole category scored nothing — refusing to report a pass.\n');
  process.exit(1);
}

process.exit(bad === 0 ? 0 : 1);
