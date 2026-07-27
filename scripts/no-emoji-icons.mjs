#!/usr/bin/env node
/**
 * Fails when an emoji is used as a UI icon.
 *
 * The app draws its icons with Lucide, and forty-nine lines did not. An emoji
 * renders in whatever emoji font the operating system supplies — a different
 * family, weight, optical size and baseline from every glyph beside it — so a
 * 📅 next to a Lucide `Clock` is visibly a different object, sitting a few
 * pixels off. It also cannot inherit `currentColor`, so it ignores the theme,
 * and screen readers announce its CLDR name ("party popper") mid-sentence.
 *
 * They had spread the way this always spreads: a section heading opening with
 * a star, info windows using a bulb and a moon, four ranks in one leaderboard
 * column drawn in two different fonts, a tick inside a filter chip. None of it
 * was a decision; each was the nearest glyph to hand.
 *
 * Comments are skipped — three separate scanners in this repo have flagged
 * their own documentation, and a check that fails on its own fix notes is a
 * check nobody keeps.
 *
 *   node scripts/no-emoji-icons.mjs
 */
import { readFileSync, readdirSync } from 'node:fs';

/**
 * Deliberate exceptions, each with the reason it is not an icon.
 *
 * An allowlist is only honest if it is specific: file plus the exact text, so
 * a new emoji in an allowed file still fails.
 */
const ALLOWED = [
  {
    file: 'src/components/operator/MarketOverviewCards.tsx',
    match: /🇦🇲|🇺🇸|🌍/u,
    why: 'national flags — no icon set draws these, and they are content rather than affordance',
  },
  {
    file: 'src/pages/NearbyFieldsPage.tsx',
    match: /✓/u,
    why: 'drawn inside a hand-authored SVG map marker, not placed in an icon slot',
  },
];

// Pictographic ranges only. Deliberately excludes the arrows and dingbats
// blocks that contain characters like → and ✓ used as ordinary typography.
const EMOJI =
  /[\u{1F300}-\u{1FAFF}\u{1F000}-\u{1F2FF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}\u{20E3}]/u;

const files = readdirSync('src', { recursive: true, encoding: 'utf8' })
  .filter((f) => f.endsWith('.tsx') || f.endsWith('.ts'))
  .map((f) => `src/${f}`);

/**
 * Strips both JS comments and JSX `{/* … *\/}` comments.
 *
 * The JSX form is the one the first version of this check missed: the fix
 * notes explaining a removed emoji quote the emoji, so every file this script
 * had just been used to clean came back as a failure.
 */
const stripComments = (src) => {
  let out = '';
  let i = 0;
  while (i < src.length) {
    if (src[i] === '/' && src[i + 1] === '/') {
      const nl = src.indexOf('\n', i);
      i = nl === -1 ? src.length : nl;
    } else if (src[i] === '/' && src[i + 1] === '*') {
      const end = src.indexOf('*/', i + 2);
      // Keep newlines so reported line numbers stay true.
      out += src.slice(i, end === -1 ? src.length : end + 2).replace(/[^\n]/g, ' ');
      i = end === -1 ? src.length : end + 2;
    } else if (src[i] === '{' && src[i + 1] === '/' && src[i + 2] === '*') {
      const end = src.indexOf('*/}', i + 3);
      out += src.slice(i, end === -1 ? src.length : end + 3).replace(/[^\n]/g, ' ');
      i = end === -1 ? src.length : end + 3;
    } else {
      out += src[i];
      i += 1;
    }
  }
  return out;
};

const findings = [];
for (const file of files) {
  const lines = stripComments(readFileSync(file, 'utf8')).split('\n');
  lines.forEach((line, n) => {
    if (!EMOJI.test(line)) return;
    if (ALLOWED.some((a) => a.file === file && a.match.test(line))) return;
    findings.push({ file, line: n + 1, text: line.trim().slice(0, 100) });
  });
}

console.log(`\nEmoji-as-icon check — ${files.length} source file(s)\n`);
for (const f of findings) console.log(`FAIL  ${f.file}:${f.line}\n        ${f.text}`);
for (const a of ALLOWED) console.log(`  ok  allowed in ${a.file} — ${a.why}`);
console.log(
  `\n${findings.length === 0 ? 'No emoji used as icons' : `${findings.length} emoji used as icon(s)`}\n`,
);

process.exit(findings.length === 0 ? 0 : 1);
