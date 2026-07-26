#!/usr/bin/env node
/**
 * Asserts that development-only affordances are absent from the production
 * bundle.
 *
 * Every browser check in this repo — smoke, contrast, tap targets, accessible
 * names — runs against `npx vite`, the **dev server**, both locally and in CI
 * (see the `smoke` job). That is fine for what those checks do: the dev server
 * serves current source, which is what they are testing.
 *
 * But it means `import.meta.env.DEV` is `true` for every one of them, so any
 * code behind a DEV gate is only ever observed in its *development* form. The
 * production shape of those branches is never looked at by anything.
 *
 * That gap surfaced when the checkout page showed a "Test payment · Development
 * only" provider in what I believed was a production preview. It was not — the
 * preview server had failed to bind for hours because a dev server already held
 * the port, and I had sent its output to /dev/null. The gate is in fact correct
 * and Vite strips the branch entirely. But nothing was checking that, and
 * "nothing was checking it" is the finding.
 *
 * Usage, after `npm run build`:
 *   node scripts/prod-bundle-check.mjs
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const DIST = process.env.DIST_DIR ?? 'dist';

/**
 * Strings that must never reach a user. Each names why, because a bare list of
 * banned words is a list nobody can safely edit later.
 */
const FORBIDDEN = [
  {
    text: 'Development only',
    why: 'the mock payment provider on the checkout page, gated on import.meta.env.DEV',
  },
  {
    text: 'SMOKE_SELFTEST',
    why: 'the route-smoke self-test hook; it belongs to the harness, not the app',
  },
];

const walk = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });

let files;
try {
  files = walk(DIST).filter((f) => /\.(js|css|html)$/.test(f));
} catch {
  console.error(`\n${DIST}/ not found — run \`npm run build\` first.\n`);
  process.exit(1);
}

if (files.length === 0) {
  // An empty dist would pass every assertion below for the wrong reason.
  console.error(`\nNo built assets under ${DIST}/ — refusing to report a pass.\n`);
  process.exit(1);
}

const findings = [];
for (const file of files) {
  const src = readFileSync(file, 'utf8');
  for (const { text, why } of FORBIDDEN) {
    if (src.includes(text)) findings.push({ file, text, why });
  }
}

console.log(`\nProduction bundle check — ${files.length} asset(s) in ${DIST}/\n`);
for (const { text, why } of FORBIDDEN) {
  const hit = findings.find((f) => f.text === text);
  console.log(`  ${hit ? 'FAIL' : '  ok'}  ${JSON.stringify(text)} — ${why}`);
  if (hit) console.log(`        found in ${hit.file}`);
}
console.log(
  `\n${findings.length === 0 ? 'No development-only strings shipped' : `${findings.length} leaked`}\n`,
);

process.exit(findings.length === 0 ? 0 : 1);
