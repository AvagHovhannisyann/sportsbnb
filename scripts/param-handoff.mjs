#!/usr/bin/env node
/**
 * A URL parameter that one place writes and nothing anywhere reads.
 *
 * Four of these were live at once, and they are not a cosmetic class of bug —
 * each one is a control that looks like it works:
 *
 *   ?location=  HeroSearch wrote what the user typed into the field labelled
 *               Location. DiscoverPage has never read it, so Search returned
 *               the entire unfiltered catalogue as the answer to a search.
 *   ?redirect=  BookingPanel wrote it when a signed-out visitor pressed
 *               Reserve, and JoinTeamPage when someone opened a team invite.
 *               LoginPage read a *different* mechanism — router state — so
 *               both landed on the dashboard. The first lost the venue they
 *               were about to book; the second lost the invite code, and
 *               there is no other route to it once the link is gone.
 *   ?venue=     OwnerVenuesPage wrote it from the row menu of one specific
 *               venue. OwnerSettingsPage opened `myVenues[0]` regardless, so
 *               an owner editing their second venue was shown a form filled
 *               with their first one's details — and saved into it.
 *
 * None of them threw. None of them logged. Every browser audit in this
 * directory passed every one of those routes, because each page rendered
 * exactly as designed; the failure was in the space between two files.
 *
 * This is the cheapest possible check for that shape, and it is static: no
 * browser, no server, a few hundred milliseconds. Collect the parameters the
 * app writes into its own URLs, collect the ones it reads, and report the
 * difference.
 *
 * ## What it deliberately does not claim
 *
 * A parameter read *somewhere* counts as read. This cannot tell that page A
 * writes `?foo=` while only page B reads it — that needs the router graph, and
 * it is a strictly rarer bug than writing one nobody reads at all. Everything
 * it does report is real; what it misses, it misses quietly, which is why the
 * browser check `search-handoff.mjs` exists alongside it for the search path.
 *
 * Dynamic keys (`params.set(key, value)`) are invisible to it and are listed
 * rather than ignored, so the gap is on screen instead of implied.
 *
 * Usage — no dev server needed:
 *   node scripts/param-handoff.mjs
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const SRC = join(ROOT, 'src');

/**
 * Parameters that arrive from somewhere other than this app, so nothing here
 * writes them and their absence from the producer set means nothing.
 * They are only relevant in the other direction, which this does not check.
 */
const INBOUND_ONLY = new Set([
  'code', // OAuth authorization code, from the provider
  'state', // OAuth CSRF token, echoed by the provider
  'error', // OAuth failure, from the provider
  'error_description',
]);

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) out.push(...walk(path));
    else if (/\.(ts|tsx)$/.test(entry) && !/\.(test|spec)\.tsx?$/.test(entry)) out.push(path);
  }
  return out;
}

/** `params.set("sport", …)` and friends, on a receiver that is a query string. */
const SET_CALL = /\b(?:params|searchParams|newParams|nextParams|query|qs)\.set\(\s*["'`]([\w-]+)["'`]/g;
/** The same with a computed key — unreadable here, so it gets counted and named. */
const SET_DYNAMIC = /\b(?:params|searchParams|newParams|nextParams|query|qs)\.set\(\s*(?!["'`])/g;
/** `setSearchParams({ lat: …, lng: … })` — object literal keys. */
const SET_OBJECT = /setSearchParams\(\s*\{([^}]*)\}/g;
/** A query string inside an app-internal path literal: `/venues?sport=…`. */
const PATH_QUERY = /["'`]\/[^"'`\s]*\?([^"'`\s]*)["'`]/g;
/** `searchParams.get("sport")`. */
const GET_CALL = /\b(?:params|searchParams|url)\.searchParams\.get\(\s*["'`]([\w-]+)["'`]|\b(?:params|searchParams)\.get\(\s*["'`]([\w-]+)["'`]/g;

const written = new Map(); // param -> Set of "file:line"
const read = new Set();
const dynamic = [];

const note = (map, key, where) => {
  if (!map.has(key)) map.set(key, new Set());
  map.get(key).add(where);
};

/**
 * Blank out comments, keeping every byte's position so line numbers survive.
 *
 * Not cosmetic. The doc comment on `src/lib/redirect.ts` explains the bug by
 * quoting `/login?redirect=/venue/:id`, and without this the check read that
 * prose as three more places writing the parameter. Worse in the other
 * direction: a parameter mentioned only in a comment would be reported as an
 * orphan, and a check that cries wolf about its own documentation is one
 * people learn to skip.
 *
 * `//` is left alone when preceded by a colon, so `https://…` inside a string
 * is not mistaken for the start of a comment.
 */
const stripComments = (src) =>
  src
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/(^|[^:])\/\/[^\n]*/g, (m, lead) => lead + ' '.repeat(m.length - lead.length));

for (const file of walk(SRC)) {
  const text = stripComments(readFileSync(file, 'utf8'));
  const rel = relative(ROOT, file);
  const lineOf = (index) => text.slice(0, index).split('\n').length;

  for (const m of text.matchAll(SET_CALL)) note(written, m[1], `${rel}:${lineOf(m.index)}`);
  for (const m of text.matchAll(SET_DYNAMIC)) dynamic.push(`${rel}:${lineOf(m.index)}`);

  for (const m of text.matchAll(SET_OBJECT)) {
    for (const k of m[1].matchAll(/([\w-]+)\s*:/g)) note(written, k[1], `${rel}:${lineOf(m.index)}`);
  }

  for (const m of text.matchAll(PATH_QUERY)) {
    // `${params.toString()}` carries keys recorded by SET_CALL already; the
    // literal keys are the ones only visible here.
    for (const k of m[1].matchAll(/[?&]?([\w-]+)=/g)) note(written, k[1], `${rel}:${lineOf(m.index)}`);
  }

  for (const m of text.matchAll(GET_CALL)) read.add(m[1] ?? m[2]);
}

const orphans = [...written.keys()]
  .filter((p) => !read.has(p) && !INBOUND_ONLY.has(p))
  .sort();

console.log(`\nURL parameter handoff — ${written.size} written, ${read.size} read\n`);

for (const p of orphans) {
  console.log(`  ORPHAN  ?${p}=  written by ${[...written.get(p)].join(', ')}`);
  console.log(`          Nothing calls searchParams.get(${JSON.stringify(p)}). The control that`);
  console.log(`          sets it looks like it works and does nothing.`);
}

if (dynamic.length) {
  console.log(
    `\n  DYNAMIC (unreadable here, ${dynamic.length}): ${dynamic.join(', ')}\n` +
      '    A computed key cannot be resolved without running the code, so these\n' +
      '    are outside what this check can see rather than inside what it passed.\n',
  );
}

if (orphans.length === 0) {
  console.log(`  Every parameter this app writes is read by something.\n`);
} else {
  console.log(`\n${orphans.length} parameter(s) written and never read\n`);
}

process.exit(orphans.length === 0 ? 0 : 1);
