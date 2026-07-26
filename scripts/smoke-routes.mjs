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

// Let Playwright resolve its own browser by default — hardcoding a path made
// this work only inside one container and fail on a CI runner, where
// `playwright install` puts Chromium under ~/.cache/ms-playwright. Set
// CHROMIUM_PATH only to override a specific binary.
const EXEC = process.env.CHROMIUM_PATH || undefined;
const BASE = process.env.SMOKE_BASE_URL ?? 'http://127.0.0.1:4173';

// Supabase namespaces its session in localStorage by project ref, so the key
// has to match whatever VITE_SUPABASE_URL the app was built with. Hardcoding
// one ref meant the session stub silently did nothing anywhere else — every
// guarded route would just redirect to /login and still report "clean".
const PROJECT_REF =
  process.env.SMOKE_PROJECT_REF ??
  (process.env.VITE_SUPABASE_URL ?? '').match(/https?:\/\/([^.]+)\./)?.[1] ??
  'skwzaxqhgrysbsuqkuyp';
const AUTH_KEY = `sb-${PROJECT_REF}-auth-token`;
const UID='00000000-0000-0000-0000-000000000001';
const userType = process.argv[2];
const ROUTES = process.argv.slice(3);
const b = await chromium.launch(EXEC ? { executablePath: EXEC } : {});
let bad = 0;
for (const route of ROUTES) {
  // Geolocation is granted deliberately. /nearby only evaluates its map
  // markers once a user location exists, and that path is where a
  // "ReferenceError: google is not defined" crash hid — reachable on CI,
  // invisible locally, purely because the runner happened to resolve a
  // position. Granting it makes the branch deterministic instead of lucky.
  const ctx = await b.newContext({
    viewport: { width: 1440, height: 900 },
    permissions: ['geolocation'],
    geolocation: { latitude: 40.1792, longitude: 44.4991 }, // Yerevan
  });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(String(e).split('\n')[0].slice(0,100)));
  await p.addInitScript((authKey)=>{const exp=Math.floor(Date.now()/1000)+3600;
    localStorage.setItem(authKey,JSON.stringify({access_token:'stub',
      token_type:'bearer',expires_at:exp,expires_in:3600,refresh_token:'stub',
      user:{id:'00000000-0000-0000-0000-000000000001',aud:'authenticated',role:'authenticated',
      email:'u@example.com',app_metadata:{},user_metadata:{},created_at:new Date(0).toISOString()}}));}, AUTH_KEY);
  // Array for list endpoints; single object only where the app uses maybeSingle.
  await p.route('**/rest/v1/**', r=>r.fulfill({status:200,contentType:'application/json',body:'[]'}));
  await p.route('**/rest/v1/profiles**', r=>{
    const u=r.request().url();
    const single = /user_id=eq\./.test(u) && !/xp=gt/.test(u);
    const row={id:'p1',user_id:UID,user_type:userType,onboarding_completed:true,
      full_name:'Demo',username:'demo',xp:120,level:2,created_at:new Date(0).toISOString()};
    r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(single?row:[row])});
  });
  await p.route('**/rest/v1/user_roles**', r=>r.fulfill({status:200,contentType:'application/json',
    body: userType==='admin' ? JSON.stringify([{role:'admin'}]) : '[]'}));
  try {
    await p.goto(BASE + route, { waitUntil:'domcontentloaded', timeout:15000 });
    await p.waitForTimeout(2500);
    const m = await p.evaluate(()=>({ path: location.pathname,
      textLen: document.body.innerText.trim().length,
      sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth,
      boundary: /Something went wrong on this page/.test(document.body.innerText) }));
    const probs = [];
    if (errs.length) probs.push(`pageerror: ${errs[0]}`);
    if (m.boundary) probs.push('ERROR BOUNDARY CAUGHT A CRASH');
    if (m.textLen < 40) probs.push(`blank (${m.textLen})`);
    if (m.sw > m.cw) probs.push(`h-overflow ${m.sw}>${m.cw}`);
    // A guarded route bouncing to /login means the session stub did not take,
    // which would otherwise be reported as a clean pass.
    if (m.path === '/login' && route !== '/login') probs.push('redirected to /login — session stub not applied');
    if (probs.length) { bad++; console.log(`FAIL ${route} -> ${m.path}  ${probs.join(' | ')}`); }
  } catch (e) { bad++; console.log(`FAIL ${route}  ${String(e).split('\n')[0].slice(0,70)}`); }
  await p.close();
}
console.log(`\n${ROUTES.length-bad}/${ROUTES.length} clean (${userType})`);
await b.close();
process.exit(bad === 0 ? 0 : 1);
