#!/usr/bin/env node
/**
 * An internal link pointing at a route this app does not have.
 *
 * Sibling of `param-handoff.mjs`, and the same shape of bug: a control that
 * renders correctly, throws nothing, and takes the user to the 404 page. React
 * Router has a `path="*"` catch-all, so nothing crashes and nothing logs —
 * every browser audit here loaded every one of these screens and passed, then
 * the button on it went nowhere.
 *
 * Three were live:
 *
 *   /game/:id/edit    the host's "Edit Game" button, prominent and full width
 *                     on the game they own
 *   /team/:id/edit    the captain's "Edit Team" item in the team settings menu
 *   /my-activity      "View my bookings", on the checkout error panel — the
 *                     one escape hatch offered to someone who has just been
 *                     told "your hold has not been cancelled, don't book again
 *                     until this loads". `my-activity` is not a route at all;
 *                     it is a tab id inside CommunityPage, navigated to as
 *                     though it were one.
 *
 * ## How it matches
 *
 * The route table in `src/App.tsx` is the authority. Each `path=` becomes a
 * pattern with `:params` widened to one path segment, and every internal link
 * target in `src/` is tested against all of them. Targets are normalised the
 * same way: a `${...}` interpolation stands for one segment, and a query or
 * hash is dropped, since routing ignores both.
 *
 * Only literals starting with "/" are considered. A path built up in a
 * variable is invisible here, and so is `path="*"`, which is excluded on
 * purpose — matching against the catch-all would make every link "valid" and
 * the check would pass forever without measuring anything.
 *
 * Usage — no dev server needed:
 *   node scripts/dead-routes.mjs
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const SRC = join(ROOT, 'src');
const APP = join(SRC, 'App.tsx');

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) out.push(...walk(path));
    else if (/\.(ts|tsx)$/.test(entry) && !/\.(test|spec)\.tsx?$/.test(entry)) out.push(path);
  }
  return out;
}

/** Comments are prose. See the note on the same helper in param-handoff.mjs. */
const stripComments = (src) =>
  src
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/(^|[^:])\/\/[^\n]*/g, (m, lead) => lead + ' '.repeat(m.length - lead.length));

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const appSource = readFileSync(APP, 'utf8');
const routes = [...appSource.matchAll(/path="([^"]*)"/g)].map((m) => m[1]).filter((p) => p !== '*');
if (routes.length === 0) {
  console.error(`No routes found in ${relative(ROOT, APP)} — the check cannot mean anything.`);
  process.exit(2);
}
const patterns = routes.map((r) => new RegExp(`^${escapeRe(r).replace(/:\w+/g, '[^/]+')}$`));

/** `to=`, `navigate(`, `href=` and the EmptyState `actionHref=`. */
const LINK = /(?:to=|navigate\(|actionHref=|href=)\s*[{(]?\s*[`"']([^`"']*)[`"']/g;

const dead = new Map();
for (const file of walk(SRC)) {
  const text = stripComments(readFileSync(file, 'utf8'));
  const rel = relative(ROOT, file);
  for (const m of text.matchAll(LINK)) {
    const raw = m[1];
    if (!raw.startsWith('/')) continue; // external, or a relative anchor
    // `${venue.id}` is one segment, and routing never sees a query or hash.
    const target = raw.split(/[?#]/)[0].replace(/\$\{[^}]*\}/g, 'X');
    if (patterns.some((p) => p.test(target))) continue;
    const line = text.slice(0, m.index).split('\n').length;
    if (!dead.has(raw)) dead.set(raw, new Set());
    dead.get(raw).add(`${rel}:${line}`);
  }
}

console.log(`\nInternal links — ${routes.length} route(s) declared in src/App.tsx\n`);
for (const [target, where] of [...dead].sort()) {
  console.log(`  DEAD  ${target}`);
  console.log(`        linked from ${[...where].join(', ')}`);
  console.log(`        No route matches. React Router serves the catch-all, so the`);
  console.log(`        control looks fine and lands the user on the 404 page.`);
}

if (dead.size === 0) {
  console.log('  Every internal link resolves to a declared route.\n');
} else {
  console.log(`\n${dead.size} dead internal link target(s)\n`);
}

process.exit(dead.size === 0 ? 0 : 1);
