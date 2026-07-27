#!/usr/bin/env node
/**
 * Contrast audit for hardcoded Tailwind palette colours.
 *
 * `scripts/contrast-audit.mjs` measures the design tokens, and measures them
 * well — but it can only see what the token layer defines. A class string that
 * reaches straight past the tokens into the raw palette is invisible to it.
 *
 * Three did. `bg-amber-500 text-white` on the "N spots left" badge on
 * /community and on the pending-booking block in the owner's week calendar,
 * and `bg-emerald-500 text-white` on the Active badge on /owner/venues. All
 * three measure between 2.1:1 and 2.6:1, against 4.5:1 for text that size.
 * The token audit ran clean on every one of those pages, because none of those
 * colours is a token.
 *
 * So this checks the other half: every quoted class string in the source that
 * pairs a *solid* palette background with `text-white` or `text-black`.
 * Opacity-modified backgrounds (`bg-amber-500/10`) are skipped — the composite
 * depends on what is behind them, which is the browser-based audit's job.
 *
 * Needs no server and no browser; it is pure source analysis.
 *
 *   node scripts/palette-contrast.mjs
 *   node scripts/palette-contrast.mjs --json
 */
import { readFileSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const palette = require('tailwindcss/colors');

const JSON_OUT = process.argv.includes('--json');
const AA_NORMAL = 4.5;

const srgb = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const luminance = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  return 0.2126 * srgb(r) + 0.7152 * srgb(g) + 0.0722 * srgb(b);
};
const ratio = (a, b) => {
  const [x, y] = [luminance(a), luminance(b)].sort((m, n) => n - m);
  return Math.round(((x + 0.05) / (y + 0.05)) * 100) / 100;
};

// A directory walk rather than `git ls-files`, which was the first version:
// it lists *tracked* files only, so a file added but not yet committed was
// invisible to the check. That was caught by a self-test probe the checker
// silently ignored — the exact moment a new hardcoded colour is most likely to
// be introduced is the moment the file is new.
const files = readdirSync('src', { recursive: true, encoding: 'utf8' })
  .filter((f) => f.endsWith('.tsx') || f.endsWith('.ts'))
  .map((f) => `src/${f}`);

// Solid palette background, i.e. no `/opacity` suffix. The negative lookahead
// on `/` is the whole point — `bg-amber-500/10` is a tint over an unknown
// surface and belongs to the browser audit, not here.
const BG = /\bbg-([a-z]+)-(\d{2,3})\b(?!\/)/g;
const FG = /\btext-(white|black)\b(?!\/)/;

/**
 * Yields every string literal in `src`, skipping comments.
 *
 * A regex over quoted spans was the obvious first attempt and it was wrong:
 * the first run flagged two failures that were the comments documenting those
 * very failures, because ``Was `bg-amber-500 text-white`…`` reads as a
 * template literal. A checker that fails on its own fix notes is a checker
 * nobody keeps.
 *
 * Known limitation: a regex literal containing a quote character would be
 * mis-scoped. There are none in this source, and the failure mode is a
 * mis-reported line rather than a crash.
 */
function* stringLiterals(src) {
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (c === '/' && src[i + 1] === '/') {
      i = src.indexOf('\n', i);
      if (i === -1) return;
    } else if (c === '/' && src[i + 1] === '*') {
      const end = src.indexOf('*/', i + 2);
      i = end === -1 ? src.length : end + 2;
    } else if (c === '"' || c === "'" || c === '`') {
      const start = ++i;
      while (i < src.length && src[i] !== c) i += src[i] === '\\' ? 2 : 1;
      yield { text: src.slice(start, i), index: start };
      i += 1;
    } else {
      i += 1;
    }
  }
}

/**
 * The other half of the same blind spot: a palette colour used as *text*.
 *
 * The check above pairs a solid palette background with text-white/black, so
 * both sides are known and the maths is closed. `text-green-600` on its own
 * gives you only one side — but the surfaces it can land on are not unknown,
 * they are the handful of tokens declared in index.css. So read those, and
 * fail a colour only when it fails against *every* surface it could sit on.
 * That is a claim that holds regardless of where the class is used.
 *
 * This was added after the busyness chips on /nearby measured 4.34, 4.49 and
 * 3.07:1 in the browser while this script reported a clean run. The pattern —
 * `text-red-600` inside `bg-red-500/5` — is a palette text colour on a tint,
 * and neither half of the original check could see it.
 */
const readSurfaces = () => {
  const css = readFileSync('src/index.css', 'utf8');
  // The dark block, which is the theme the app actually ships (`<html
  // class="dark">`, no toggle). Bounded to the first `.dark {` body so the
  // light values above it cannot leak in.
  const darkStart = css.indexOf('.dark {');
  const block = css.slice(darkStart, css.indexOf('\n  }', darkStart));
  const out = {};
  // Container surfaces only. `--secondary` and `--accent` are component fills
  // — in the dark theme --secondary is 100 20% 96%, near-white — and including
  // them let almost any dark text "pass" against a backdrop it will never
  // actually sit on. The first run of this check reported 113 passes on that
  // basis; restricting to real backdrops is what makes a pass mean something.
  for (const [, name, h, s, l] of block.matchAll(
    /--(background|card|popover|muted|surface-[123]):\s*([\d.]+)\s+([\d.]+)%\s+([\d.]+)%/g,
  )) {
    out[name] = hslToHex(+h, +s, +l);
  }
  return out;
};

function hslToHex(h, s, l) {
  s /= 100;
  l /= 100;
  const k = (n) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const to = (v) =>
    Math.round(255 * v)
      .toString(16)
      .padStart(2, '0');
  return `#${to(f(0))}${to(f(8))}${to(f(4))}`;
}

const SURFACES = readSurfaces();
const TEXT = new RegExp(`\\btext-(${Object.keys(palette).join('|')})-(\\d{2,3})\\b(?!\\/)`, 'g');

const findings = [];
const textFindings = [];
for (const file of files) {
  const src = readFileSync(file, 'utf8');
  for (const { text, index } of stringLiterals(src)) {
    const line = () => src.slice(0, index).split('\n').length;

    const fgMatch = text.match(FG);
    if (fgMatch) {
      for (const [, name, shade] of text.matchAll(BG)) {
        const hex = palette[name]?.[shade];
        if (!hex) continue;
        const fg = fgMatch[1] === 'white' ? '#ffffff' : '#000000';
        findings.push({
          file,
          line: line(),
          pair: `text-${fgMatch[1]} on bg-${name}-${shade}`,
          hex,
          ratio: ratio(hex, fg),
        });
      }
    }

    for (const [, name, shade] of text.matchAll(TEXT)) {
      const hex = palette[name]?.[shade];
      if (typeof hex !== 'string') continue;
      // Best case across every surface. A colour that cannot reach AA on any
      // of them is wrong wherever it is; one that reaches AA somewhere may
      // still be wrong in a specific spot, which is the browser audit's job.
      let best = { surface: null, ratio: 0 };
      for (const [surface, bg] of Object.entries(SURFACES)) {
        const r = ratio(hex, bg);
        if (r > best.ratio) best = { surface, ratio: r };
      }
      textFindings.push({ file, line: line(), cls: `text-${name}-${shade}`, ...best });
    }
  }
}

findings.sort((a, b) => a.ratio - b.ratio);
textFindings.sort((a, b) => a.ratio - b.ratio);
const failures = findings.filter((f) => f.ratio < AA_NORMAL);
const textFailures = textFindings.filter((f) => f.ratio < AA_NORMAL);

if (JSON_OUT) {
  console.log(JSON.stringify({ findings, failures, textFindings, textFailures }, null, 2));
} else {
  console.log('\nHardcoded palette contrast\n');
  for (const f of findings) {
    const mark = f.ratio < AA_NORMAL ? 'FAIL' : '  ok';
    console.log(
      `${mark}  ${String(f.ratio).padStart(6)} / ${AA_NORMAL}   ${f.pair}   ${f.file}:${f.line}`,
    );
  }

  console.log(
    `\nPalette text colours — best case across ${Object.keys(SURFACES).length} dark surfaces\n`,
  );
  for (const f of textFailures) {
    console.log(
      `FAIL  ${String(f.ratio).padStart(6)} / ${AA_NORMAL}   ${f.cls} ` +
        `(best: --${f.surface})   ${f.file}:${f.line}`,
    );
  }
  const passing = textFindings.length - textFailures.length;
  console.log(
    `      ${passing} palette text colour(s) reach AA on at least one surface\n`,
  );

  console.log(
    `${failures.length + textFailures.length === 0 ? 'No AA failures' : `${failures.length + textFailures.length} AA failure(s)`} ` +
      `(${findings.length} pair(s), ${textFindings.length} text colour(s) checked)\n`,
  );
}

process.exit(failures.length + textFailures.length === 0 ? 0 : 1);
