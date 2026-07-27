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

/**
 * Parameters whose reader is missing because the feature behind them is
 * unfinished, and which are written up rather than quietly fixed.
 *
 * Reported on every run, not failed. The distinction the rest of this
 * directory draws: a check that cannot honestly score something says so in its
 * own column instead of folding it into a pass or a fail. Failing the build
 * here would be demanding that someone invent a product decision to get CI
 * green; passing silently would let a whole dead feature look healthy.
 *
 * Each entry has to say what is missing and where the decision is recorded. An
 * entry without that is just an exemption, and exemption lists are how checks
 * rot.
 */
const UNFINISHED = new Map([
  [
    'ref',
    'The referral programme has no backend at all: `referral_credits` has two ' +
      'SELECT policies and no INSERT policy, no SECURITY DEFINER function ever ' +
      'writes it, `referral_codes.uses_count` is never incremented, and nothing ' +
      'at checkout can spend a credit. Reading the parameter at signup without ' +
      'any of that would record nothing. See docs/handover.md §5.',
  ],
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
/**
 * A query string inside an app-internal URL literal.
 *
 * Two shapes, because matching only the first left a real bug on the floor.
 * `"/venues?sport=…"` is the obvious one. The other is a template literal
 * building an absolute URL back to this same app —
 * `${window.location.origin}/venue/${id}?date=…&time=…` — which is exactly
 * what the embeddable widget's Book Now button does. It starts with `${`, not
 * `/`, so a pattern anchored on the leading slash walked straight past a
 * control writing two parameters nothing reads: pick a slot in the widget,
 * press the button, and land on the venue page with nothing selected.
 *
 * Scanned by walking whole string and template literals rather than by
 * pattern-matching their insides. A regex that stops at the first quote or
 * space cannot read `…?date=${format(d, "yyyy-MM-dd")}&time=${t}` — the
 * interpolation contains both — so the narrower version reported a clean run
 * over the very bug it was widened to catch.
 *
 * URLs to other hosts stay excluded: a query aimed somewhere else is not this
 * app's to read.
 */
const LITERALS = /`(?:[^`\\]|\\.)*`|"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'/g;

/** Does this literal address this app, rather than another host? */
function isInternalUrl(body) {
  if (body.startsWith("/")) return true;
  return /^\$\{[^}]*location\.origin[^}]*\}\//.test(body);
}

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

  for (const m of text.matchAll(LITERALS)) {
    const body = m[0].slice(1, -1);
    if (!isInternalUrl(body)) continue;
    const query = body.slice(body.indexOf('?') + 1);
    if (!body.includes('?')) continue;
    // `${params.toString()}` carries keys recorded by SET_CALL already; the
    // literal keys are the ones only visible here. Anchored on `?` or `&` so
    // an `=` inside an interpolated expression is not read as a parameter.
    for (const k of query.matchAll(/(?:^|[?&])([\w-]+)=/g)) {
      note(written, k[1], `${rel}:${lineOf(m.index)}`);
    }
  }

  for (const m of text.matchAll(GET_CALL)) read.add(m[1] ?? m[2]);
}

const unread = [...written.keys()]
  .filter((p) => !read.has(p) && !INBOUND_ONLY.has(p))
  .sort();
const orphans = unread.filter((p) => !UNFINISHED.has(p));
const unfinished = unread.filter((p) => UNFINISHED.has(p));

console.log(`\nURL parameter handoff — ${written.size} written, ${read.size} read\n`);

for (const p of orphans) {
  console.log(`  ORPHAN  ?${p}=  written by ${[...written.get(p)].join(', ')}`);
  console.log(`          Nothing calls searchParams.get(${JSON.stringify(p)}). The control that`);
  console.log(`          sets it looks like it works and does nothing.`);
}

for (const p of unfinished) {
  console.log(`  UNFINISHED (reported, not failed)  ?${p}=  written by ${[...written.get(p)].join(', ')}`);
  for (const line of UNFINISHED.get(p).match(/.{1,72}(\s|$)/g) ?? []) {
    console.log(`    ${line.trim()}`);
  }
  console.log('');
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
