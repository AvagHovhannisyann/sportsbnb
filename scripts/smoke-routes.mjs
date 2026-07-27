#!/usr/bin/env node
/**
 * Route smoke test.
 *
 * Loads every route with a stubbed Supabase session and empty REST responses,
 * then fails a route if it throws, trips the error boundary, renders blank, or
 * scrolls horizontally. It is not a functional test — it answers one question:
 * "does anything in the app fall over when you open it?"
 *
 * That question turned out to be worth asking. Run across the branch it caught
 * Google Maps being fetched on every route (including /privacy and /terms),
 * which showed up as four routes never firing `load`.
 *
 * Browser: Playwright resolves its own Chromium, which is what CI gets from
 * `npx playwright install chromium`. Set CHROMIUM_PATH to point at a specific
 * binary when the local Playwright build and the installed browser disagree.
 *
 * Usage — needs `npx vite --host 127.0.0.1 --port 4173` running first:
 *
 *   node scripts/smoke-routes.mjs player /  /about /discover
 *   node scripts/smoke-routes.mjs owner  /owner-dashboard /owner/venues
 *   node scripts/smoke-routes.mjs admin  /admin /operator
 *
 * The first argument sets profiles.user_type and whether user_roles returns
 * admin, so role-guarded routes resolve instead of redirecting to /dashboard.
 *
 * Stub shape matters: /rest/v1/profiles returns a single object for
 * `user_id=eq.` lookups (the app uses maybeSingle) and an array otherwise.
 * Getting that wrong produces "leaderboard.map is not a function", which looks
 * like an app bug and is not one.
 */
import { chromium } from '@playwright/test';
// Fixtures and the stub layer are shared with `tap-targets.mjs`; see
// scripts/lib/stub-page.mjs for why they are not duplicated here.
import {
  BASE, EXEC, VIEWPORT_WIDTH, VIEWPORT_HEIGHT,
  resolveRoute, newStubbedPage,
} from './lib/stub-page.mjs';
const userType = process.argv[2];
const ROUTES = process.argv.slice(3);
const b = await chromium.launch(EXEC ? { executablePath: EXEC } : {});
let bad = 0;
for (const route of ROUTES) {
  const url = resolveRoute(route);
  const p = await newStubbedPage(b, {
    userType, width: VIEWPORT_WIDTH, height: VIEWPORT_HEIGHT,
  });
  const errs = [];
  p.on('pageerror', e => errs.push(String(e).split('\n')[0].slice(0,100)));
  try {
    await p.goto(BASE + url, { waitUntil:'domcontentloaded', timeout:15000 });
    await p.waitForTimeout(2500);
    // Self-test hook. A detector that cannot be shown to fire is worth
    // nothing — this one silently passed its first trial run because the
    // injected node never reached the DOM, which is exactly the failure mode
    // it exists to catch elsewhere. `SMOKE_SELFTEST=1` proves it still bites.
    if (process.env.SMOKE_SELFTEST) {
      await p.evaluate(() => {
        const d = document.createElement('div');
        d.textContent = 'value: undefined and [object Object]';
        document.body.appendChild(d);
      });
    }
    const m = await p.evaluate(()=>({ path: location.pathname,
      textLen: document.body.innerText.trim().length,
      sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth,
      boundary: /Something went wrong on this page/.test(document.body.innerText),
      // Values that are never a deliberate design choice. Every one of them
      // means a formatter or a lookup produced something it could not render,
      // and none of them throws — a page showing "Invalid Date" or "NaN" is a
      // completely successful render as far as everything else here is
      // concerned. Deliberately not including "—" or "Anonymous": both are
      // legitimate fallbacks in this app (an unrated venue, a user who has not
      // set a name), so failing on them would be noise.
      junk: ['undefined', 'null', 'NaN', '[object Object]', 'Invalid Date']
        .filter((t) => {
          const body = document.body.innerText;
          if (t === 'null' || t === 'undefined') {
            // Bounded so prose like "cancelled" or "undefined behaviour" in a
            // terms page cannot trip it.
            return new RegExp(`(^|[\\s>:,/(])${t}([\\s<:,./)]|$)`).test(body);
          }
          return body.includes(t);
        }) }));
    const probs = [];
    if (errs.length) probs.push(`pageerror: ${errs[0]}`);
    if (m.boundary) probs.push('ERROR BOUNDARY CAUGHT A CRASH');
    if (m.textLen < 40) probs.push(`blank (${m.textLen})`);
    if (m.sw > m.cw) probs.push(`h-overflow ${m.sw}>${m.cw}`);
    if (m.junk.length) probs.push(`rendered ${m.junk.map((j) => `"${j}"`).join(', ')}`);
    // A guarded route bouncing to /login means the session stub did not take,
    // which would otherwise be reported as a clean pass.
    if (m.path === '/login' && route !== '/login') probs.push('redirected to /login — session stub not applied');
    if (probs.length) { bad++; console.log(`FAIL ${route} -> ${m.path}  ${probs.join(' | ')}`); }
  } catch (e) { bad++; console.log(`FAIL ${route}  ${String(e).split('\n')[0].slice(0,70)}`); }
  await p.close();
}
console.log(`\n${ROUTES.length-bad}/${ROUTES.length} clean (${userType} @ ${VIEWPORT_WIDTH}px)`);
await b.close();
process.exit(bad === 0 ? 0 : 1);
