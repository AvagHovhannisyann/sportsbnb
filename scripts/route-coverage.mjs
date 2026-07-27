#!/usr/bin/env node
/**
 * A route no audit ever loads.
 *
 * Every browser check here takes a list of routes. Those lists live in
 * `scripts/lib/routes.sh`, and they are maintained by hand — so a route added
 * to `src/App.tsx` and not to them is not partially covered or covered later.
 * It is covered by nothing, for as long as nobody notices, while five parallel
 * suites report green beside it.
 *
 * That is the same failure this whole directory keeps running into, one level
 * up: a check reports nothing because it never saw the thing, not because the
 * thing was fine. `docs/audits.md` has it for fixtures — a table with no rows
 * renders no controls, so `a11y-names` finds no unnamed ones. This is the
 * routing version, and it is worse, because a missing fixture still leaves the
 * page loading in CI.
 *
 * It caught `/game/:id/join-success` on its first run: the screen a player
 * lands on after paying to join a game, never once loaded by any check here.
 *
 * ## How it matches
 *
 * `src/App.tsx` is the authority for what exists; `scripts/lib/routes.sh` is
 * the authority for what gets looked at. Each declared route becomes a pattern
 * with `:params` widened to one segment, and a route is covered when some path
 * in the shell lists matches it — `/join-team/SMOKE1` covers
 * `/join-team/:code`, which is the concrete-id convention those lists already
 * use. Comment lines in the shell file are ignored, so an example in a comment
 * cannot stand in for real coverage.
 *
 * `path="*"` is excluded: the catch-all is reached by every wrong URL and is
 * not a page anyone navigates to on purpose.
 *
 * One blind spot, stated rather than left to be found. A path that appears
 * only as an argument to `without()` — the helper that subtracts routes a
 * given check cannot look at — still reads as listed here. Today every such
 * path is also in `$PLAYER`, so nothing is hidden; if a route were deleted
 * from `$PLAYER` while its exclusion stayed behind, this would call it
 * covered. A check about blind spots should name its own.
 *
 * Usage — no dev server needed:
 *   node scripts/route-coverage.mjs
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const APP = join(ROOT, 'src', 'App.tsx');
const LISTS = join(ROOT, 'scripts', 'lib', 'routes.sh');

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const routes = [...readFileSync(APP, 'utf8').matchAll(/path="([^"]*)"/g)]
  .map((m) => m[1])
  .filter((p) => p !== '*');

if (routes.length === 0) {
  console.error('No routes found in src/App.tsx — the check cannot mean anything.');
  process.exit(2);
}

// Comment lines are prose. An example route in a comment must not count as
// coverage, or the file documents itself into passing.
const listSource = readFileSync(LISTS, 'utf8')
  .split('\n')
  .filter((line) => !line.trimStart().startsWith('#'))
  .join('\n');
const listed = [...new Set([...listSource.matchAll(/\/[A-Za-z0-9:_.\/-]*/g)].map((m) => m[0]))];

const uncovered = routes.filter((route) => {
  const pattern = new RegExp(`^${escapeRe(route).replace(/:\w+/g, '[^/]+')}$`);
  return !listed.some((path) => pattern.test(path));
});

console.log(
  `\nRoute coverage — ${routes.length} route(s) declared, ${listed.length} path(s) in the audit lists\n`,
);

for (const route of uncovered) {
  console.log(`  UNCOVERED  ${route}`);
  console.log(`             No path in scripts/lib/routes.sh matches it, so no audit has`);
  console.log(`             ever loaded this page. Add it to the list for whichever role`);
  console.log(`             can reach it, using a concrete id for any :param.`);
}

if (uncovered.length === 0) {
  console.log('  Every declared route is in at least one audit list.\n');
} else {
  console.log(`\n${uncovered.length} route(s) that no audit looks at\n`);
}

process.exit(uncovered.length === 0 ? 0 : 1);
