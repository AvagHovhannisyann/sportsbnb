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

const findings = [];
for (const file of files) {
  const src = readFileSync(file, 'utf8');
  for (const { text, index } of stringLiterals(src)) {
    const fgMatch = text.match(FG);
    if (!fgMatch) continue;
    for (const [, name, shade] of text.matchAll(BG)) {
      const hex = palette[name]?.[shade];
      if (!hex) continue;
      const fg = fgMatch[1] === 'white' ? '#ffffff' : '#000000';
      findings.push({
        file,
        line: src.slice(0, index).split('\n').length,
        pair: `text-${fgMatch[1]} on bg-${name}-${shade}`,
        hex,
        ratio: ratio(hex, fg),
      });
    }
  }
}

findings.sort((a, b) => a.ratio - b.ratio);
const failures = findings.filter((f) => f.ratio < AA_NORMAL);

if (JSON_OUT) {
  console.log(JSON.stringify({ findings, failures }, null, 2));
} else {
  console.log('\nHardcoded palette contrast\n');
  for (const f of findings) {
    const mark = f.ratio < AA_NORMAL ? 'FAIL' : '  ok';
    console.log(
      `${mark}  ${String(f.ratio).padStart(6)} / ${AA_NORMAL}   ${f.pair}   ${f.file}:${f.line}`,
    );
  }
  console.log(
    `\n${failures.length === 0 ? 'No AA failures' : `${failures.length} AA failure(s)`} ` +
      `(${findings.length} hardcoded pair(s) found)\n`,
  );
}

process.exit(failures.length === 0 ? 0 : 1);
