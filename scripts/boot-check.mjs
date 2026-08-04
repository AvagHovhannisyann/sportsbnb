#!/usr/bin/env node
/**
 * Loads the production build in a browser and asserts the app actually starts.
 *
 * Nothing in this repository did that, and it cost the site a live outage.
 *
 * ## What happened
 *
 * `src/integrations/supabase/client.ts` calls `createClient(SUPABASE_URL, …)` at
 * module scope, reading `import.meta.env.VITE_SUPABASE_URL`. Vite inlines that
 * **at build time**. Build with it unset and the bundle contains
 * `createClient(undefined, undefined)`, which throws `supabaseUrl is required`
 * during module evaluation — before `main.tsx` runs, before React mounts.
 *
 * A committed `.env` used to supply the value by accident. Phase 0 removed it,
 * correctly. Nothing replaced it in the host, so the first production build
 * after the merge shipped a bundle that could not boot, and every page of the
 * live site was dead.
 *
 * ## Why every existing check passed
 *
 * Two independent reasons, and both are the point of this file:
 *
 * 1. **Every browser check in this repo runs against `npx vite`** — the dev
 *    server — and the `smoke` job sets `VITE_SUPABASE_URL` and friends as job
 *    env. So the config was always present wherever a browser was watching.
 * 2. **The `ci` job builds with no `VITE_*` env at all**, producing the exact
 *    broken bundle on every run — and then only greps it for forbidden strings.
 *    Nothing ever loaded it.
 *
 * So CI built the failure every single run and never looked at it. That is the
 * gap this closes: the thing that gets shipped is now the thing that gets
 * booted.
 *
 * ## Why it looked like a working page rather than a broken one
 *
 * `scripts/prerender.mjs` puts real prose inside `#root` for crawlers, on the
 * reasoning that React discards it the instant it mounts. That reasoning holds
 * exactly as long as React mounts. When it does not, the prose stays on screen —
 * so a totally dead app renders as unstyled body text under Tailwind's preflight
 * instead of the blank page a boot failure used to produce. Prerendering made
 * the failure *look like content*, which is why it reached production.
 *
 * That is the second reason this check tests for a mounted app specifically,
 * rather than for "the page has text on it".
 *
 * ## What it asserts
 *
 * - no uncaught error during page load,
 * - `#root` ends up holding the rendered app rather than the prerendered prose.
 *
 * The mount test is the presence of an element carrying a `class` attribute.
 * The app is Tailwind-classed throughout; the prerendered fallback is bare
 * `<h1>`, `<p>` and `<a>` with no attributes at all. So the distinction is
 * structural rather than a guess about any particular component.
 *
 * ## Proved it can fail
 *
 * Run against a bundle built before the fix (defaults removed from client.ts):
 *
 *     /               FAIL  Error: supabaseUrl is required.
 *     /venues         FAIL  Error: supabaseUrl is required.
 *     /venue/<uuid>   FAIL  Error: supabaseUrl is required.
 *     3 route(s) failed to boot
 *
 * and after it, all three pass. A check that has never been seen red is a check
 * nobody should trust.
 *
 * Usage, after `npm run build`:
 *   node scripts/boot-check.mjs
 */
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, extname, normalize } from 'node:path';
import { chromium } from '@playwright/test';

const DIST = process.env.DIST_DIR ?? 'dist';

if (!existsSync(join(DIST, 'index.html'))) {
  console.error(`\n${DIST}/index.html not found — run \`npm run build\` first.\n`);
  process.exit(1);
}

/**
 * Routes worth booting: the home page, a prerendered listing page, and a
 * dynamic route that falls through to the catch-all shell.
 *
 * All three load the same entry bundle, so any one of them catches a
 * module-evaluation throw. They are here because they take *different paths
 * through the hosting rules* — `dist/index.html`, `dist/venues/index.html` and
 * `dist/app-shell.html` — and a config that boots one of those documents but
 * not another is exactly the kind of thing worth noticing.
 */
const ROUTES = ['/', '/venues', '/venue/11111111-1111-1111-1111-111111111111'];

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
};

/**
 * Serves `dist/` the way `vercel.json` does: filesystem first, then the
 * catch-all rewrite to `app-shell.html`. Getting that order right matters —
 * it is the assumption `prerender.mjs` rests on, and serving the SPA shell for
 * `/assets/*.js` would break the boot for a reason unrelated to the app.
 */
const server = createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const rel = normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[/\\])+/, '');

  // `/_vercel/*` is served by the platform at runtime, not from `dist/`.
  //
  // `<Analytics />` injects `<script src="/_vercel/insights/script.js">`. That
  // file exists on Vercel and nowhere else, so without this the catch-all
  // answers it with `app-shell.html` — HTML, status 200, parsed as JavaScript
  // by the browser. The result is `SyntaxError: Unexpected token '<'` on every
  // prerendered route, which failed this check while the app underneath was
  // mounting perfectly.
  //
  // That is precisely the failure mode the comment above warns about for
  // `/assets/*.js`: a hosting rule breaking the boot for a reason unrelated to
  // the app. An empty script with the right content-type models what the
  // platform actually serves closely enough — the tag loads, nothing runs, and
  // the check goes back to measuring the app.
  //
  // Note this is not an error filter. Nothing is being suppressed: a real
  // uncaught error still fails the run, including one from this script if it
  // ever ships something that throws.
  if (rel.startsWith('/_vercel/') || rel.startsWith('_vercel/')) {
    res.writeHead(200, { 'content-type': TYPES['.js'] });
    res.end('');
    return;
  }

  const candidates = [join(DIST, rel), join(DIST, rel, 'index.html')];
  let file = candidates.find((p) => existsSync(p) && statSync(p).isFile());
  if (!file) file = join(DIST, 'app-shell.html');
  res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' });
  res.end(readFileSync(file));
});

await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}`;

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
const results = [];

for (const route of ROUTES) {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e.message ?? e).split('\n')[0]));

  await page.goto(`${base}${route}`, { waitUntil: 'load', timeout: 60000 });

  // Wait for the app rather than for a fixed delay: a slow mount is not a
  // failure, and a fixed delay would make this flaky on a loaded runner.
  let mounted = false;
  try {
    await page.waitForFunction(
      () => !!document.querySelector('#root [class]:not([class=""])'),
      undefined,
      { timeout: 20000 },
    );
    mounted = true;
  } catch {
    mounted = false;
  }

  results.push({ route, mounted, error: errors[0] });
  await page.close();
}

await browser.close();
server.close();

console.log(`\nBoot check — production build in ${DIST}/\n`);
let failed = 0;
for (const { route, mounted, error } of results) {
  if (mounted && !error) {
    console.log(`    ok  ${route}`);
  } else {
    failed += 1;
    console.log(`  FAIL  ${route}  ${error ?? 'React never mounted (#root still holds the prerendered fallback)'}`);
  }
}
console.log(
  failed === 0
    ? `\nThe built app boots on ${results.length} route(s)\n`
    : `\n${failed} route(s) failed to boot — this bundle would serve a dead site\n`,
);

process.exit(failed === 0 ? 0 : 1);
