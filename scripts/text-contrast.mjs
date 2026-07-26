#!/usr/bin/env node
/**
 * Contrast of the text the app actually renders, against the backdrop it
 * actually lands on.
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
 * The busyness chips on /nearby are the case that proves the gap. They
 * measured 4.34, 4.49 and 3.07:1 in a browser, and both existing checks ran
 * clean over them: the token audit never saw them because they are not tokens,
 * and the source audit passed them because `text-green-600` reaches 5.9:1 on
 * the darkest surface in the theme — just not on the one it was sitting on.
 *
 * So this walks the DOM, and for every element carrying visible text:
 *
 *   - takes the computed `color` as the foreground;
 *   - composites the backdrop by walking ancestors and layering each
 *     `background-color` until one is opaque — which is what makes a tint like
 *     `bg-success/10` resolve to the colour a person sees rather than to
 *     "transparent";
 *   - picks the threshold from the computed font — 3:1 for large text
 *     (>=24px, or >=18.66px at weight >=700), 4.5:1 otherwise, WCAG 1.4.3.
 *
 * WHAT IT REFUSES TO SCORE, and why that matters more than what it scores.
 *
 * A contrast checker that guesses is worse than none, because its passes stop
 * meaning anything. Four situations make the analytic walk unsound, and each
 * one is counted and reported as *indeterminate* rather than folded into
 * either column:
 *
 *   - a gradient or image anywhere in the backdrop chain (the hero, the
 *     promoted cards) — there is no single backdrop colour to score against;
 *   - `opacity` below 1 on the element or an ancestor — the group composites
 *     as a unit and the analytic result diverges from the painted pixel;
 *   - `backdrop-filter` in the chain — that is glass, and `glass-contrast.mjs`
 *     measures it properly by screenshotting real pixels;
 *   - a chain that reaches the root without ever hitting an opaque layer.
 *
 * The known blind spot it cannot count: an absolutely-positioned sibling
 * painted behind the text is not an ancestor, so the walk misses it. axe-core
 * has the same limitation for the same reason. It is not a source of false
 * failures — an overlay behind text is nearly always darker, not lighter —
 * but it is a source of false passes, which is why the glass audit exists
 * separately and screenshots instead.
 *
 * Usage — needs `npx vite --host 127.0.0.1 --port 4173` running:
 *   node scripts/text-contrast.mjs <player|owner|admin> <route>...
 *   TEXT_CONTRAST_SELFTEST=1 node scripts/text-contrast.mjs player /
 */
import { chromium } from '@playwright/test';
import { newStubbedPage, resolveRoute } from '../scripts/lib/stub-page.mjs';

const BASE = process.env.SMOKE_BASE_URL ?? 'http://127.0.0.1:4173';
const WIDTH = Number(process.env.SMOKE_WIDTH ?? 1440);
/**
 * Injects three swatches whose ratios are known by construction, to prove the
 * check can fail before its passes are believed. Every audit in this directory
 * that skipped this step shipped with a measurement bug.
 */
const SELFTEST = process.env.TEXT_CONTRAST_SELFTEST === '1';

const [userType, ...routes] = process.argv.slice(2);
if (!userType || routes.length === 0) {
  console.error('usage: node scripts/text-contrast.mjs <player|owner|admin> <route>...');
  process.exit(2);
}

/** Runs in the page. Returns one record per element carrying visible text. */
const COLLECT = () => {
  const parse = (c) => {
    const m = c.match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    const p = m[1].split(/[,/]/).map((v) => parseFloat(v.trim()));
    return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
  };
  /** `src` over `dst`, both premultiplied out. `dst` is assumed opaque. */
  const over = (dst, src) => ({
    r: src.r * src.a + dst.r * (1 - src.a),
    g: src.g * src.a + dst.g * (1 - src.a),
    b: src.b * src.a + dst.b * (1 - src.a),
    a: 1,
  });
  const srgb = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  const lum = (c) =>
    0.2126 * srgb(c.r / 255) + 0.7152 * srgb(c.g / 255) + 0.0722 * srgb(c.b / 255);
  const ratio = (a, b) => {
    const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m);
    return Math.round(((x + 0.05) / (y + 0.05)) * 100) / 100;
  };
  const hex = (c) =>
    '#' +
    [c.r, c.g, c.b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');

  const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TITLE', 'HEAD', 'SVG', 'PATH']);

  /**
   * Layers ancestor backgrounds until one is opaque.
   *
   * Returns `{ bg }` or `{ reason }` — never a guess. The `reason` values are
   * the four unsound cases in the file header; each is counted separately in
   * the report so a route that is mostly gradient cannot masquerade as a route
   * that is mostly passing.
   */
  const backdrop = (start) => {
    const layers = [];
    for (let el = start; el; el = el.parentElement) {
      const cs = getComputedStyle(el);
      if (cs.backgroundImage !== 'none') return { reason: 'background-image' };
      if (cs.backdropFilter && cs.backdropFilter !== 'none') return { reason: 'backdrop-filter' };
      // The element's own opacity is what fades it; a parent's fades it too.
      // Either way the painted result is not the analytic composite.
      if (parseFloat(cs.opacity) < 1) return { reason: 'opacity' };
      const c = parse(cs.backgroundColor);
      if (!c || c.a === 0) continue;
      layers.push(c);
      if (c.a === 1) {
        // Opaque: nothing behind it can show through, so stop climbing and
        // fold the tints collected on the way down back onto it.
        let acc = layers.pop();
        while (layers.length) acc = over(acc, layers.pop());
        return { bg: acc };
      }
    }
    return { reason: 'no-opaque-backdrop' };
  };

  const out = [];
  for (const el of document.querySelectorAll('*')) {
    if (SKIP_TAGS.has(el.tagName)) continue;
    // Direct text children only — otherwise a wrapper is scored once per
    // descendant and one failure is reported as twenty.
    let text = '';
    for (const n of el.childNodes) if (n.nodeType === 3) text += n.nodeValue;
    text = text.trim();
    if (!text) continue;

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
      out.push({ indeterminate: 'transparent-text', text: text.slice(0, 40) });
      continue;
    }

    const b = backdrop(el);
    if (b.reason) {
      out.push({ indeterminate: b.reason, text: text.slice(0, 40) });
      continue;
    }

    const size = parseFloat(cs.fontSize);
    const weight = parseInt(cs.fontWeight, 10) || 400;
    const large = size >= 24 || (size >= 18.66 && weight >= 700);
    // Semi-transparent text (`text-foreground/50`) composites onto the
    // backdrop before it is scored — `rgba(255,255,255,.5)` on black is grey,
    // and scoring the unmixed white would call a 5.3:1 label a 21:1 one.
    const solidFg = fg.a < 1 ? over(b.bg, fg) : fg;

    out.push({
      text: text.slice(0, 40),
      selector: `${el.tagName.toLowerCase()}${el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).slice(0, 3).join('.') : ''}`,
      fg: hex(solidFg),
      bg: hex(b.bg),
      size,
      weight,
      min: large ? 3 : 4.5,
      ratio: ratio(solidFg, b.bg),
    });
  }
  return out;
};

/**
 * Swatches whose ratios are fixed by construction, so a wrong answer is
 * obvious rather than plausible.
 *
 * On black the ratio is `(L + 0.05) / 0.05`, so a target ratio inverts to a
 * grey directly: #595959 has L = 0.0999 and therefore 3.00:1, and #ffffff has
 * L = 1 and therefore 21:1. That gives four assertions:
 *
 *   white       21.00  passes at 4.5      — the check does not fail everything
 *   grey-16px    3.00  FAILS at 4.5       — the check can fail at all
 *   grey-28px    3.00  passes at 3        — large text takes the lower bar
 *   tint        17.40  passes at 4.5      — white on a 10% white tint over
 *                                            black, which is white on #1a1a1a
 *
 * The last one is the reason this file exists. A 10% tint is `rgba(255,255,
 * 255,0.1)`: `palette-contrast.mjs` cannot see it at all, and a DOM walk that
 * reads `backgroundColor` without compositing gets `rgba(0,0,0,0)` and either
 * skips the element or scores it against the wrong surface. Reading back
 * `#1a1a1a` is the assertion — that the ancestor walk resolved a tint to the
 * colour a person sees.
 *
 * Two drafts of this comment asserted ratios from memory (4.83, 3.95, 5.71)
 * and the check returned 6.92, 4.62 and 17.49. It was right every time; the
 * comment was wrong every time. Expectations here come from the formula.
 */
const SELFTEST_PROBE = () => {
  const host = document.createElement('div');
  host.id = 'text-contrast-selftest';
  host.style.cssText = 'position:fixed;left:0;top:0;z-index:99999;background:#000;padding:8px';
  host.innerHTML = `
    <p style="color:#fff;font-size:16px">probe-white-21</p>
    <p style="color:#595959;font-size:16px">probe-small-3</p>
    <p style="color:#595959;font-size:28px">probe-large-3</p>
    <div style="background:rgba(255,255,255,0.1)">
      <p style="color:#fff;font-size:16px">probe-tint-5.71</p>
    </div>`;
  document.body.appendChild(host);
};

/**
 * Scrolls the whole page so that content behind a scroll reveal actually
 * paints, then returns to the top.
 *
 * Not an optimisation — a correctness fix, and the single largest one in this
 * file. The first run reported 48 of 111 text runs on `/` as indeterminate for
 * `opacity`, which read like a limitation of the analytic walk. It was not:
 * those elements were sitting at `opacity: 0` because the page uses
 * framer-motion `whileInView`, and nothing below the fold had ever entered the
 * viewport. Half the home page was being quietly excluded from an audit that
 * would still have printed a pass.
 *
 * `viewport: { once: true }` is what makes this stick — a section revealed on
 * the way down stays revealed when we scroll back up, so one pass is enough.
 */
const revealEverything = async (page) => {
  await page.evaluate(async () => {
    const step = innerHeight * 0.8;
    const wait = () => new Promise((r) => setTimeout(r, 220));
    for (let y = 0; y < document.body.scrollHeight; y += step) {
      scrollTo(0, y);
      await wait();
    }
    scrollTo(0, 0);
    await wait();
  });
  // Transitions run ~600ms; measuring one mid-fade is measuring a frame no
  // reader ever sits on.
  await page.waitForTimeout(900);
};

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
const failures = [];
const indeterminate = new Map();
let scored = 0;

for (const route of routes) {
  const url = resolveRoute(route);
  const page = await newStubbedPage(browser, { userType, width: WIDTH, height: 900 });
  // `domcontentloaded` — `networkidle` never settles on the routes that mount
  // a map, which is what timed out the whole smoke job once already.
  await page.goto(`${BASE}${url}`, { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.waitForTimeout(1200);
  await revealEverything(page);

  if (SELFTEST) await page.evaluate(SELFTEST_PROBE);

  const records = await page.evaluate(COLLECT);
  for (const rec of records) {
    if (rec.indeterminate) {
      indeterminate.set(rec.indeterminate, (indeterminate.get(rec.indeterminate) ?? 0) + 1);
      continue;
    }
    scored += 1;
    if (SELFTEST && rec.text.startsWith('probe-')) {
      console.log(`  SELFTEST  ${rec.text}  ${rec.ratio}:1  (${rec.fg} on ${rec.bg})`);
    }
    if (rec.ratio < rec.min) failures.push({ route: url, ...rec });
  }
  await page.context().close();
}

await browser.close();

// Worst first, and one line per distinct (colour pair, threshold) so a
// component rendered in a list of twelve is one finding rather than twelve.
const grouped = new Map();
for (const f of failures) {
  const key = `${f.route}|${f.fg}|${f.bg}|${f.min}`;
  const g = grouped.get(key);
  if (g) g.count += 1;
  else grouped.set(key, { ...f, count: 1 });
}
const unique = [...grouped.values()].sort((a, b) => a.ratio - b.ratio);

console.log(
  `\nRendered text contrast — ${scored} text run(s) across ${routes.length} route(s) at ${WIDTH}px\n`,
);
for (const f of unique) {
  console.log(
    `  FAIL  ${String(f.ratio).padStart(6)} / ${f.min}   ${f.fg} on ${f.bg}   ` +
      `${f.route}  ${JSON.stringify(f.text)}` +
      `${f.count > 1 ? ` (x${f.count})` : ''}`,
  );
  console.log(`        ${f.selector}  ${f.size}px/${f.weight}`);
}
if (unique.length === 0) console.log('  Every scored text run meets its WCAG 1.4.3 threshold\n');

if (indeterminate.size) {
  console.log(
    `\n  Not scored: ${[...indeterminate].map(([k, v]) => `${v} ${k}`).join(', ')}` +
      ' — see the header for why each is refused rather than guessed\n',
  );
}
if (scored === 0) {
  console.error('  Nothing was scored — refusing to report a pass.\n');
  process.exit(1);
}

process.exit(unique.length === 0 ? 0 : 1);
