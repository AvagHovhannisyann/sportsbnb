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
// Viewport, so the same route list can be swept at mobile widths. Overflow is
// already checked per route, which makes this the cheapest way to cover a
// surface that had only ever been spot-checked on a handful of pages.
const VIEWPORT_WIDTH = Number(process.env.SMOKE_WIDTH ?? 1440);
const VIEWPORT_HEIGHT = Number(process.env.SMOKE_HEIGHT ?? 900);

const PROJECT_REF =
  process.env.SMOKE_PROJECT_REF ??
  (process.env.VITE_SUPABASE_URL ?? '').match(/https?:\/\/([^.]+)\./)?.[1] ??
  'skwzaxqhgrysbsuqkuyp';
const AUTH_KEY = `sb-${PROJECT_REF}-auth-token`;
const UID='00000000-0000-0000-0000-000000000001';

// Fixed ids for the entity stubs below, so the route list can address them:
//
//   node scripts/smoke-routes.mjs player /venue/:venue /blog/:slug
//
// A `:name` segment in a route is substituted with the matching id below, so
// the route list stays readable instead of carrying five raw UUIDs.
//
// Dynamic routes were the whole uncovered half of the router — /venue/:id,
// /game/:id, /team/:id, /blog/:slug and the entire checkout chain never once
// loaded in CI, which is precisely the shape of gap that hid the /nearby
// crash. They need rows, not an empty array: a detail page handed `[]` renders
// its not-found branch and passes without ever running the code being smoked.
const IDS = {
  venue:   '11111111-1111-1111-1111-111111111111',
  game:    '22222222-2222-2222-2222-222222222222',
  team:    '33333333-3333-3333-3333-333333333333',
  booking: '44444444-4444-4444-4444-444444444444',
  payment: '55555555-5555-5555-5555-555555555555',
  slug:    'smoke-post',
};

const NOW = new Date(0).toISOString();

// One plausible row per table the detail pages read. Deliberately populated
// rather than minimal — nullable columns left null exercise the fallback
// branches, but every column the page *renders* carries a value, so the smoke
// covers layout and formatting rather than a page full of em-dashes.
const ROWS = {
  venues: {
    id: IDS.venue, owner_id: UID, name: 'Smoke Arena',
    description: 'A stub venue used by the route smoke test.',
    address: '1 Test Street', city: 'Yerevan', zip_code: '0001',
    image_url: null, sports: ['Football', 'Basketball'], price_per_hour: 8000,
    is_indoor: true, amenities: ['Parking', 'Showers', 'WiFi'], is_active: true,
    rating: 4.6, review_count: 12, latitude: 40.1792, longitude: 44.4991,
    location_confirmed: true, phone: '+37410000000', contact_name: 'Demo Owner',
    whatsapp_enabled: false, sms_enabled: false,
    created_at: NOW, updated_at: NOW,
  },
  games: {
    id: IDS.game, host_id: UID, title: 'Smoke five-a-side',
    description: 'A stub game.', sport: 'Football', skill_level: 'intermediate',
    play_mode: 'casual', status: 'open', location: 'Smoke Arena, Yerevan',
    game_date: '2030-01-01', game_time: '18:00:00', duration_hours: 1,
    max_players: 10, price_per_player: 2000, is_public: true,
    latitude: 40.1792, longitude: 44.4991, venue_id: IDS.venue, team_id: null,
    created_at: NOW, updated_at: NOW,
  },
  teams: {
    id: IDS.team, owner_id: UID, name: 'Smoke FC',
    description: 'A stub team.', sport: 'Football', team_size: 11,
    visibility: 'public', invite_code: 'SMOKE1', logo_url: null,
    created_at: NOW, updated_at: NOW,
  },
  blog_posts: {
    id: '66666666-6666-6666-6666-666666666666', slug: IDS.slug,
    title: 'Smoke post', excerpt: 'A stub blog post.',
    content: '# Smoke post\n\nBody text for the route smoke test.',
    author_name: 'Demo', cover_image_url: null, created_by: UID,
    is_published: true, published_at: NOW, target_keyword: null,
    created_at: NOW, updated_at: NOW,
  },
  bookings: {
    id: IDS.booking, user_id: UID, venue_id: IDS.venue, venue_uuid: IDS.venue,
    venue_name: 'Smoke Arena', booking_date: '2030-01-01',
    booking_time: '18:00:00', starts_at: '2030-01-01T18:00:00Z',
    ends_at: '2030-01-01T19:00:00Z', duration_hours: 1, status: 'pending_payment',
    total_price: 8000, amount_minor: 800000, platform_fee_minor: 80000,
    owner_amount_minor: 720000, currency: 'AMD', source: 'web',
    expires_at: '2030-01-01T17:20:00Z', court_id: null, team_id: null,
    customer_name: 'Demo', customer_email: 'u@example.com',
    customer_phone: null, notes: null, payment_intent_id: null,
    created_by_owner_id: null, recurring_booking_id: null,
    cancellation_policy: null, created_at: NOW, updated_at: NOW,
  },
  payments: {
    id: IDS.payment, user_id: UID, booking_id: IDS.booking, game_id: null,
    provider: 'mock', status: 'pending', order_ref: 1001,
    amount_minor: 800000, refunded_minor: 0, currency: 'AMD',
    provider_payment_id: null, provider_payload: null, idempotency_key: null,
    error_code: null, paid_at: null, created_at: NOW, updated_at: NOW,
  },
};

// A lookup by primary key returns the object; anything else returns a list.
// `[?&]id=eq.` rather than `id=eq.` on purpose — `venue_id=eq.` contains the
// latter, and answering a foreign-key filter with a bare object is how you get
// "x.map is not a function" and spend an afternoon blaming the app.
const isSingleLookup = (url) => /[?&](id|slug)=eq\./.test(url);

const userType = process.argv[2];
const ROUTES = process.argv.slice(3);
const b = await chromium.launch(EXEC ? { executablePath: EXEC } : {});
let bad = 0;
for (const route of ROUTES) {
  const url = route.replace(/:(\w+)/g, (m, k) => IDS[k] ?? m);
  // Geolocation is granted deliberately. /nearby only evaluates its map
  // markers once a user location exists, and that path is where a
  // "ReferenceError: google is not defined" crash hid — reachable on CI,
  // invisible locally, purely because the runner happened to resolve a
  // position. Granting it makes the branch deterministic instead of lucky.
  const ctx = await b.newContext({
    viewport: { width: VIEWPORT_WIDTH, height: VIEWPORT_HEIGHT },
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
  // TeamDetailsPage reads the owner through profiles_public with maybeSingle;
  // the generic `[]` above satisfies the request but not the shape.
  await p.route('**/rest/v1/profiles_public**', r=>{
    const row={id:'p1',user_id:UID,full_name:'Demo',username:'demo',
      avatar_url:null,xp:120,level:2,created_at:NOW};
    r.fulfill({status:200,contentType:'application/json',
      body:JSON.stringify(isSingleLookup(r.request().url())?row:[row])});
  });
  for (const [table,row] of Object.entries(ROWS)) {
    await p.route(`**/rest/v1/${table}**`, r=>r.fulfill({status:200,
      contentType:'application/json',
      body:JSON.stringify(isSingleLookup(r.request().url())?row:[row])}));
  }
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
