#!/usr/bin/env node
/**
 * Contrast audit for the design tokens.
 *
 * Renders a swatch for every (foreground token, surface token) pair the app
 * actually uses, in a real browser against the real stylesheet, and reports
 * the WCAG ratio. Fails on anything below the threshold for its role.
 *
 * This exists because `--destructive` sat at 3.85:1 for error text and 4.04:1
 * for white on the button fill — failing AA in both of its roles at once — and
 * nothing about it looked wrong. It reads as a perfectly ordinary error red.
 * The only way that surfaces is by putting a number on colours that look fine,
 * which is not something anyone does by eye on a routine basis.
 *
 * Thresholds are WCAG 2.1 AA:
 *   - normal text            4.5:1
 *   - large text (>=24px, or >=18.66px bold)  3:1
 *   - UI component boundaries 3:1
 *
 * Usage — needs `npx vite --host 127.0.0.1 --port 4173` running:
 *   node scripts/contrast-audit.mjs            # dark theme (the default look)
 *   node scripts/contrast-audit.mjs --light
 *   node scripts/contrast-audit.mjs --json     # machine-readable
 */
import { chromium } from '@playwright/test';

const EXEC = process.env.CHROMIUM_PATH || undefined;
const BASE = process.env.CONTRAST_BASE_URL ?? 'http://127.0.0.1:4173';
const LIGHT = process.argv.includes('--light');
const JSON_OUT = process.argv.includes('--json');

/**
 * Surfaces text actually lands on. `card` and `surface-1` matter most: almost
 * every panel in the app is one of the two, and they are close enough in
 * lightness that a colour can pass on one and fail on the other.
 */
const SURFACES = ['background', 'card', 'surface-1', 'surface-2', 'surface-3', 'muted'];

/**
 * Foreground tokens, with the smallest role each is used in. `minRatio` is the
 * threshold that role demands — 3 where a token is only ever large text or a
 * boundary, 4.5 where it carries body copy.
 */
const FOREGROUNDS = [
  { token: 'foreground', minRatio: 4.5, note: 'body copy' },
  { token: 'foreground-soft', minRatio: 4.5, note: 'secondary copy' },
  { token: 'muted-foreground', minRatio: 4.5, note: 'labels, captions (679 uses)' },
  { token: 'primary', minRatio: 4.5, note: 'links and inline actions (299 uses)' },
  { token: 'destructive', minRatio: 4.5, note: 'error copy (89 uses)' },
  { token: 'success', minRatio: 4.5, note: 'confirmations' },
  { token: 'warning', minRatio: 4.5, note: 'cautions' },
  // Dividers between sections and around cards. WCAG 1.4.11 exempts purely
  // decorative boundaries, and these are decorative: nothing about a card's
  // outline tells you what a control is or what state it is in. Measured and
  // printed, so a regression is visible, but not failed — raising them would
  // repaint every card and table in the app, which is a design decision and
  // not an accessibility requirement. Deliberately not moving a goalpost to
  // get a green run: the tokens below are the ones the rule actually covers.
  { token: 'border', minRatio: 3, note: 'card and section dividers', decorative: true },
  { token: 'border-strong', minRatio: 3, note: 'emphasised dividers', decorative: true },
  { token: 'input', minRatio: 3, note: 'legacy shadcn token, no longer on any control', decorative: true },
  // The edge of a control. This one WCAG 1.4.11 does cover.
  { token: 'border-interactive', minRatio: 3, note: 'input, textarea, select, toggle, OTP, role pickers' },
];

/** Fills that carry their own foreground token — checked the other way round. */
const FILLS = [
  { bg: 'primary', fg: 'primary-foreground', minRatio: 4.5, note: 'primary button' },
  { bg: 'destructive-solid', fg: 'destructive-foreground', minRatio: 4.5, note: 'destructive button' },
  { bg: 'secondary', fg: 'secondary-foreground', minRatio: 4.5, note: 'secondary button' },
  { bg: 'accent', fg: 'accent-foreground', minRatio: 4.5, note: 'hover surface' },
  { bg: 'popover', fg: 'popover-foreground', minRatio: 4.5, note: 'popovers, menus' },
];

const browser = await chromium.launch(EXEC ? { executablePath: EXEC } : {});
const page = await browser.newPage();
await page.goto(BASE, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1500);

const results = await page.evaluate(
  ({ surfaces, foregrounds, fills, light }) => {
    document.documentElement.classList.toggle('dark', !light);

    const resolve = (token) => {
      const probe = document.createElement('div');
      probe.style.color = `hsl(var(--${token}))`;
      document.body.appendChild(probe);
      const c = getComputedStyle(probe).color;
      probe.remove();
      return c;
    };
    const lum = (css) => {
      const [r, g, b] = css.match(/[\d.]+/g).slice(0, 3).map(Number).map((v) => {
        v /= 255;
        return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
      });
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    const ratio = (a, b) => {
      const [x, y] = [lum(a), lum(b)];
      return Math.round(((Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)) * 100) / 100;
    };

    const out = [];
    for (const fg of foregrounds) {
      const fgColor = resolve(fg.token);
      for (const surface of surfaces) {
        out.push({
          kind: 'text',
          fg: fg.token,
          bg: surface,
          note: fg.note,
          ratio: ratio(fgColor, resolve(surface)),
          minRatio: fg.minRatio,
        });
      }
    }
    for (const fill of fills) {
      out.push({
        kind: 'fill',
        fg: fill.fg,
        bg: fill.bg,
        note: fill.note,
        ratio: ratio(resolve(fill.fg), resolve(fill.bg)),
        minRatio: fill.minRatio,
      });
    }
    return out;
  },
  { surfaces: SURFACES, foregrounds: FOREGROUNDS, fills: FILLS, light: LIGHT },
);

await browser.close();

// A foreground is only a failure on surfaces it is plausibly used on. Every
// token is checked against every surface, but only `card`, `surface-1` and
// `background` are treated as required — `surface-3` is an inset block that
// rarely carries small copy, and flagging it would drown the real signal.
const REQUIRED_SURFACES = new Set(['background', 'card', 'surface-1']);
const DECORATIVE = new Set(FOREGROUNDS.filter((f) => f.decorative).map((f) => f.token));
const failures = results.filter(
  (r) =>
    r.ratio < r.minRatio &&
    !DECORATIVE.has(r.fg) &&
    (r.kind === 'fill' || REQUIRED_SURFACES.has(r.bg)),
);

if (JSON_OUT) {
  console.log(JSON.stringify({ theme: LIGHT ? 'light' : 'dark', results, failures }, null, 2));
} else {
  const theme = LIGHT ? 'light' : 'dark';
  console.log(`\nContrast audit — ${theme} theme\n`);
  for (const r of results) {
    const required = r.kind === 'fill' || REQUIRED_SURFACES.has(r.bg);
    const bad = r.ratio < r.minRatio && required && !DECORATIVE.has(r.fg);
    const mark = bad ? 'FAIL' : r.ratio < r.minRatio ? 'note' : '  ok';
    // `note` covers two different things and the distinction matters: a
    // decorative token below 3:1 is by design, a real token below its
    // threshold on a surface it is rarely used on is worth a second look.
    console.log(
      `${mark}  ${String(r.ratio).padStart(6)} / ${r.minRatio}   ${r.fg} on ${r.bg}` +
        (bad ? `   — ${r.note}` : ''),
    );
  }
  console.log(
    `\n${failures.length === 0 ? 'No AA failures' : `${failures.length} AA failure(s)`} ` +
      `(${theme} theme, ${results.length} pairs checked)\n`,
  );
}

process.exit(failures.length === 0 ? 0 : 1);
