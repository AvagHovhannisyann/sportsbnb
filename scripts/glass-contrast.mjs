#!/usr/bin/env node
/**
 * Contrast of text on translucent surfaces, against what is actually behind
 * them.
 *
 * `contrast-audit.mjs` checks every design token against every surface it is
 * declared on. That is the right check for opaque UI and it cannot see this
 * one: a glass bar has no fixed backdrop. Its effective background is whatever
 * happens to be scrolling underneath, which changes as the page moves.
 *
 * The sticky header is glass and the home page has light sections. At
 * `--glass-alpha: 0.72` the same five nav links measured 7.36–7.57:1 over the
 * dark hero and 3.01–3.59:1 four thousand pixels further down — every one
 * below AA, with no colour anywhere having changed. The token audit passed the
 * whole time, correctly, because nothing in it composites.
 *
 * Method: find the scroll offsets where the lightest content passes under the
 * glass, screenshot there, decode the screenshot in a canvas — Chromium is the
 * only PNG decoder needed — and take the median pixel of each label's box.
 * Those pixels *are* the composite: tint, blur, saturation and page content
 * already flattened by the compositor, rather than a model of them.
 *
 * Usage:
 *   node scripts/glass-contrast.mjs <player|owner|admin> <route>...
 */
import { chromium } from '@playwright/test';
import { newStubbedPage, resolveRoute } from '../scripts/lib/stub-page.mjs';

const BASE = process.env.SMOKE_BASE_URL ?? 'http://127.0.0.1:4173';
const WIDTH = Number(process.env.SMOKE_WIDTH ?? 1440);
const HEIGHT = Number(process.env.SMOKE_HEIGHT ?? 900);

const [userType, ...routes] = process.argv.slice(2);
if (!userType || routes.length === 0) {
  console.error('usage: node scripts/glass-contrast.mjs <player|owner|admin> <route>...');
  process.exit(2);
}

const luminance = ([r, g, b]) => {
  const f = (c) => {
    c /= 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};

const contrast = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

/** WCAG 1.4.3: 3:1 for large text (>=24px, or >=18.66px bold), else 4.5:1. */
const required = (px, weight) => (px >= 24 || (px >= 18.66 && weight >= 700) ? 3 : 4.5);

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
const failures = [];
let measured = 0;

for (const route of routes) {
  const url = resolveRoute(route);
  const page = await newStubbedPage(browser, { userType, width: WIDTH, height: HEIGHT });
  await page.goto(`${BASE}${url}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(700);

  // Which scroll offsets to measure.
  //
  // Five even fractions was the first attempt and it was a guess about where
  // the risk lives. It missed: the real failure sat at 3106px on `/`, between
  // two of the five, and the check passed on the exact page it was written
  // for. What matters is not an even spread but *the lightest thing that ever
  // passes under the glass* — that is where a dark translucent bar washes out.
  //
  // So: step down the page reading only the background colour beneath the
  // header, which is cheap, and screenshot just the extremes.
  const offsets = await page.evaluate(() => {
    const scrollable = document.body.scrollHeight - innerHeight;
    if (scrollable <= 0) return [0];

    const probe = (y) => {
      scrollTo(0, y);
      // A point just below the sticky bar, at the horizontal centre.
      const stack = document.elementsFromPoint(innerWidth / 2, 90);
      for (const el of stack) {
        const bg = getComputedStyle(el).backgroundColor;
        const m = bg.match(/[\d.]+/g);
        if (!m || m.length < 3) continue;
        if (m[3] !== undefined && Number(m[3]) === 0) continue;
        return (Number(m[0]) * 0.2126 + Number(m[1]) * 0.7152 + Number(m[2]) * 0.0722) / 255;
      }
      return 0;
    };

    const step = Math.max(120, Math.round(scrollable / 40));
    const seen = [];
    for (let y = 0; y <= scrollable; y += step) seen.push({ y, l: probe(y) });
    seen.push({ y: scrollable, l: probe(scrollable) });
    scrollTo(0, 0);

    // The three lightest backdrops, plus the top of the page.
    const lightest = [...seen].sort((a, b) => b.l - a.l).slice(0, 3).map((s) => s.y);
    return [...new Set([0, ...lightest])];
  });

  for (const offset of offsets) {
    await page.evaluate((y) => window.scrollTo(0, y), offset);
    await page.waitForTimeout(350);

    // Sticky or fixed elements with a backdrop-filter: the ones whose
    // background is page content rather than a surface of their own.
    const targets = await page.evaluate(() => {
      const out = [];
      for (const el of document.querySelectorAll('*')) {
        const cs = getComputedStyle(el);
        const filtered =
          (cs.backdropFilter && cs.backdropFilter !== 'none') ||
          (cs.webkitBackdropFilter && cs.webkitBackdropFilter !== 'none');
        if (!filtered) continue;
        if (cs.position !== 'sticky' && cs.position !== 'fixed') continue;
        const box = el.getBoundingClientRect();
        if (box.width < 40 || box.height < 16) continue;

        for (const node of el.querySelectorAll('a, button, span, p, h1, h2, h3')) {
          const text = (node.textContent ?? '').trim();
          if (!text || node.querySelector('a, button, span, p')) continue;
          const r = node.getBoundingClientRect();
          if (r.width < 8 || r.height < 8) continue;
          if (r.top < box.top - 1 || r.bottom > box.bottom + 1) continue;
          const ns = getComputedStyle(node);
          if (ns.visibility === 'hidden' || ns.opacity === '0') continue;
          out.push({
            text: text.slice(0, 24),
            color: ns.color,
            size: parseFloat(ns.fontSize),
            weight: Number(ns.fontWeight) || 400,
            // The label's own box, unpadded. Three attempts got here:
            //
            //  - One pixel a few px to the left. Landed on the white "Sports"
            //    beside "bnb" in the wordmark, and outside the green badge the
            //    notification digit sits on. Nine failures, none real.
            //  - The most common exact colour in the box. Glass carries a blur
            //    and a 4%-opacity noise texture, so no two backdrop pixels
            //    share an RGB value; nothing cleared the "quarter of the box"
            //    bar, every nav label was dropped, and the run reported clean.
            //  - The median pixel by luminance, below. Glyphs are a minority
            //    of a text box, so the median is a backdrop pixel, and a
            //    median does not care about noise.
            //
            // The 2px pad went with the second attempt: on a 16px badge, four
            // extra pixels of dark header dragged the median off the chip and
            // reported 1.75:1 for a digit that is perfectly legible.
            box: {
              x: Math.round(r.left),
              y: Math.round(r.top),
              w: Math.round(r.width),
              h: Math.round(r.height),
            },
          });
        }
      }
      return out;
    });

    if (targets.length === 0) continue;

    const shot = (await page.screenshot()).toString('base64');
    const decoder = await browser.newPage();
    const backdrops = await decoder.evaluate(
      async ({ shot, targets }) => {
        const img = new Image();
        await new Promise((res, rej) => {
          img.onload = res;
          img.onerror = rej;
          img.src = 'data:image/png;base64,' + shot;
        });
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        return targets.map(({ box }) => {
          const x = Math.max(0, box.x);
          const y = Math.max(0, box.y);
          const w = Math.min(box.w, img.width - x);
          const h = Math.min(box.h, img.height - y);
          if (w < 4 || h < 4) return null;
          const d = ctx.getImageData(x, y, w, h).data;

          // Median pixel by luminance, not the most common exact colour.
          //
          // The mode was the second attempt and it failed on the only surface
          // this script targets: glass carries a blur and a 4%-opacity noise
          // texture, so no two backdrop pixels share an exact RGB value and
          // nothing ever reached the "at least a quarter of the box" bar. Every
          // nav label was silently dropped, leaving only the two labels sitting
          // on solid chips, and the run reported a clean pass.
          //
          // Glyphs are a minority of a text box's pixels, so the median pixel
          // is a backdrop pixel — and a median is indifferent to noise, which
          // is the whole problem here.
          const px = [];
          for (let i = 0; i < d.length; i += 4) {
            const r = d[i];
            const g = d[i + 1];
            const b = d[i + 2];
            px.push([0.2126 * r + 0.7152 * g + 0.0722 * b, r, g, b]);
          }
          if (px.length === 0) return null;
          px.sort((p, q) => p[0] - q[0]);
          const m = px[px.length >> 1];
          return [m[1], m[2], m[3]];
        });
      },
      { shot, targets },
    );
    await decoder.close();

    targets.forEach((t, i) => {
      const bg = backdrops[i];
      if (!bg) return;
      const ink = (t.color.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number);
      if (ink.length < 3) return;
      measured += 1;
      const got = contrast(ink, bg);
      const need = required(t.size, t.weight);
      if (got < need) {
        failures.push({
          route: url,
          offset,
          text: t.text,
          got: got.toFixed(2),
          need,
          ink: `rgb(${ink})`,
          bg: `rgb(${bg})`,
        });
      }
    });
  }

  await page.context().close();
}

await browser.close();

console.log(`\nGlass contrast — ${measured} composited sample(s) across ${routes.length} route(s) at ${WIDTH}px\n`);

if (measured === 0) {
  // Nothing measured is not a pass. If no sticky glass was found, either the
  // routes have none or the selector stopped matching; both need looking at.
  console.error('  No translucent sticky surfaces found — refusing to report a pass.\n');
  process.exit(1);
}

if (failures.length === 0) {
  console.log('  Every label on glass clears AA against what is behind it\n');
} else {
  // Worst first, and deduplicated by label: the same link failing at four
  // scroll offsets is one defect, not four.
  const worst = new Map();
  for (const f of failures) {
    const key = `${f.route}|${f.text}`;
    if (!worst.has(key) || Number(f.got) < Number(worst.get(key).got)) worst.set(key, f);
  }
  for (const f of [...worst.values()].sort((a, b) => a.got - b.got)) {
    console.log(
      `  FAIL  ${f.route} @${f.offset}px  ${JSON.stringify(f.text)}  ${f.got}:1 (needs ${f.need})  ${f.ink} on ${f.bg}`,
    );
  }
  console.log(
    `\n${worst.size} label(s) on glass fall below AA against the content behind them.` +
      ' Raise --glass-alpha so the surface stops depending on what scrolls under it.\n',
  );
}

process.exit(failures.length === 0 ? 0 : 1);
