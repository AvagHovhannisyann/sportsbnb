#!/usr/bin/env node
/**
 * Shared browser harness for the route-based audits.
 *
 * `smoke-routes.mjs` grew this stub layer — a faked Supabase session plus one
 * plausible row per table the detail pages read — and it is the reason those
 * audits see populated pages instead of empty states. A second audit
 * (`tap-targets.mjs`) needs exactly the same thing, and two copies of two
 * hundred lines of fixtures is two copies that drift: the moment one gains a
 * column the other does not, the two scripts are measuring different apps.
 *
 * So it lives here, and both import it.
 *
 * The fixtures are deliberately populated rather than minimal. Nullable columns
 * left null exercise fallback branches, but every column a page *renders*
 * carries a value — an audit against a page full of em-dashes measures nothing.
 * That cuts both ways, and it is the single biggest source of false findings in
 * this work: when a populated page looks broken, suspect the fixture first.
 */
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
  // Chat. Without these, /messages renders an empty list and the code that
  // builds each conversation's title and subtitle never runs — the route
  // passed while the thing worth testing was skipped, which is the same gap
  // the dynamic routes had. Found by rendering /messages by hand and seeing a
  // literal "undefined" that the smoke run could not have reached.
  chat_rooms: {
    id: '77777777-7777-7777-7777-777777777777', type: 'venue',
    reference_id: IDS.venue, name: 'Smoke Arena',
    created_at: NOW, updated_at: NOW,
  },
  chat_members: {
    id: '88888888-8888-8888-8888-888888888888',
    room_id: '77777777-7777-7777-7777-777777777777',
    user_id: UID, role: 'member', joined_at: NOW,
  },
  chat_messages: {
    id: '99999999-9999-9999-9999-999999999999',
    room_id: '77777777-7777-7777-7777-777777777777',
    // `message_text`, not `content` — the column name this fixture used to
    // invent. Typecheck caught it when the messages list started reading
    // the real column, which is the kind of thing a stub quietly hides.
    sender_id: UID, message_text: 'Is the pitch free on Thursday?',
    message_type: 'text', created_at: NOW,
  },
  // Rows for the tables the detail and list pages join against. Without
  // these the harness answers `[]` and the page renders its empty branch —
  // "clean" then means "the interesting code did not run". 33 tables the app
  // queries were in that state; these are the ones that carry visible content.
  reviews: {
    id: 'aaaaaaaa-0000-4000-8000-000000000001', venue_id: IDS.venue,
    user_id: UID, rating: 5, comment: 'Great surface, lights are excellent.',
    created_at: NOW, updated_at: NOW,
  },
  game_participants: {
    id: 'aaaaaaaa-0000-4000-8000-000000000002', game_id: IDS.game,
    user_id: UID, status: 'confirmed', created_at: NOW,
  },
  team_members: {
    id: 'aaaaaaaa-0000-4000-8000-000000000003', team_id: IDS.team,
    user_id: UID, role: 'member', joined_at: NOW,
  },
  venue_hours: {
    id: 'aaaaaaaa-0000-4000-8000-000000000004', venue_id: IDS.venue,
    day_of_week: 0, open_time: '08:00:00', close_time: '23:00:00',
    is_closed: false,
  },
  venue_images: {
    id: 'aaaaaaaa-0000-4000-8000-000000000005', venue_id: IDS.venue,
    image_url: '', display_order: 0, created_at: NOW,
  },
  // Mirrors the real column list. Every NOT NULL column is present; the three
  // nullable ones are left null on purpose, because a stub that fills in
  // every field only ever tests the happy path — and `overtime_rate_per_minute`,
  // `early_arrival_policy` and `early_arrival_minutes` are nullable in the
  // schema despite having defaults, so a row can genuinely carry nulls.
  venue_policies: {
    id: 'aaaaaaaa-0000-4000-8000-000000000006', venue_id: IDS.venue,
    cancellation_policy: 'flexible', cancellation_hours: 24, refund_type: 'full',
    min_duration_hours: 1, max_duration_hours: 8, time_slot_increment: 60,
    booking_window_days: 30, buffer_minutes: 0, grace_period_minutes: 15,
    venue_rules: null, checkin_instructions: 'Gate code on arrival.',
    overtime_rate_per_minute: null, early_arrival_policy: null,
    early_arrival_minutes: null,
    created_at: NOW, updated_at: NOW,
  },
  // Owner money surfaces and the notification bell. Column lists taken from
  // information_schema on the live project, not invented — the last fixture I
  // guessed at crashed a page and cost a round proving it was my fault.
  payouts: {
    id: 'aaaaaaaa-0000-4000-8000-000000000007', owner_id: UID,
    amount_minor: 720000, currency: 'AMD', status: 'pending',
    period_start: '2030-01-01', period_end: '2030-01-31',
    method: 'bank', destination_snapshot: null, reference: null,
    initiated_by: null, paid_at: null, created_at: NOW, updated_at: NOW,
  },
  ledger_entries: {
    id: 1, entry_type: 'platform_commission', payment_id: IDS.payment,
    booking_id: IDS.booking, payout_id: null, owner_id: UID,
    amount_minor: 720000, currency: 'AMD', memo: 'Booking earning',
    created_at: NOW,
  },
  owner_payout_accounts: {
    owner_id: UID, method: 'bank_transfer', details: { destination: 'AM00 0000 0000 0000', holder: 'Smoke Arena LLC' },
    verified: false, created_at: NOW, updated_at: NOW,
  },
  notifications: {
    id: 'aaaaaaaa-0000-4000-8000-000000000008', user_id: UID,
    type: 'booking', title: 'Booking confirmed',
    message: 'Your booking at Smoke Arena is confirmed.',
    link: '/dashboard', is_read: false, created_at: NOW,
  },
  venue_courts: {
    id: 'aaaaaaaa-0000-4000-8000-000000000009', venue_id: IDS.venue,
    name: 'Court 1', sport: 'Football', is_active: true,
    price_per_hour: 8000, created_at: NOW, updated_at: NOW,
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

// `[?&]id=eq.` rather than `id=eq.` on purpose — `venue_id=eq.` contains the
// latter, and answering a foreign-key filter with a bare object is how you get
// "x.map is not a function" and spend an afternoon blaming the app.
const isSingleLookup = (url) => /[?&](id|slug)=eq\./.test(url);

export { IDS, ROWS, NOW, BASE, EXEC, UID, VIEWPORT_WIDTH, VIEWPORT_HEIGHT };

/** Resolves `:name` segments in a route against the stub ids. */
export const resolveRoute = (route) => route.replace(/:(\w+)/g, (m, k) => IDS[k] ?? m);

/**
 * A list response: the canonical row, then two variants of it.
 *
 * Every list endpoint used to answer with `[row]` — exactly one item, on every
 * grid in the app. So nothing that only exists at two or more rows had ever
 * been loaded in CI: no ordering, no column alignment, no "N of M", and no
 * control that hides itself below a threshold. The venues sort control was the
 * case that exposed this — it renders only when there is more than one result,
 * so the accessible-name sweep walked straight past it and still reported the
 * route clean.
 *
 * The canonical row stays first and keeps its id, so `/venue/:venue` and every
 * other detail route still resolve. The variants differ in the fields lists
 * actually order and align on — name, price, rating, review count, date — and
 * deliberately include a zero-review row, since "unrated" and "rated zero" are
 * a distinction real ranking code gets wrong.
 */
const listOf = (row) => {
  if (!row || typeof row !== 'object' || !('id' in row)) return [row];
  const variant = (n, over) => ({
    ...row,
    ...over,
    // Keep it a syntactically valid uuid, distinct from the canonical one.
    id: `${n}${String(row.id).slice(1)}`,
    ...(row.name ? { name: `${row.name} ${n}` } : {}),
  });
  return [
    row,
    variant(8, {
      ...(row.price_per_hour !== undefined ? { price_per_hour: 2500 } : {}),
      ...(row.rating !== undefined ? { rating: 0 } : {}),
      ...(row.review_count !== undefined ? { review_count: 0 } : {}),
    }),
    variant(9, {
      ...(row.price_per_hour !== undefined ? { price_per_hour: 24000 } : {}),
      ...(row.rating !== undefined ? { rating: 4.9 } : {}),
      ...(row.review_count !== undefined ? { review_count: 137 } : {}),
    }),
  ];
};

/**
 * A page with the session stubbed and every REST table answered.
 *
 * Geolocation is granted deliberately. /nearby only evaluates its map markers
 * once a user location exists, and that path is where a "google is not
 * defined" crash hid — reachable on CI, invisible locally, purely because the
 * runner happened to resolve a position. Granting it makes the branch
 * deterministic instead of lucky.
 */
export async function newStubbedPage(browser, { userType, width, height }) {
  const ctx = await browser.newContext({
    viewport: { width, height },
    permissions: ['geolocation'],
    geolocation: { latitude: 40.1792, longitude: 44.4991 }, // Yerevan
  });
  const p = await ctx.newPage();
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
    const row={id:'p1',user_id:UID,full_name:'Demo Player',username:'demo',
      avatar_url:null,city:'Yerevan',xp:120,level:2,created_at:NOW};
    r.fulfill({status:200,contentType:'application/json',
      body:JSON.stringify(isSingleLookup(r.request().url())?row:[row])});
  });
  for (const [table,row] of Object.entries(ROWS)) {
    await p.route(`**/rest/v1/${table}**`, r=>r.fulfill({status:200,
      contentType:'application/json',
      body:JSON.stringify(isSingleLookup(r.request().url())?row:listOf(row))}));
  }
  return p;
}

/**
 * Waits until nothing full-screen is covering the app, then a beat more.
 *
 * `SplashScreen` holds a `fixed inset-0 z-[9999]` panel over the whole
 * viewport for 1800ms and then fades it for 500ms — 2.3 seconds during which
 * every page in the app looks like a flat `bg-background` rectangle with a
 * spinner on it. The DOM underneath is complete the whole time, so the audits
 * that read the DOM never noticed. The ones that look at *pixels* or ask
 * `elementFromPoint` what is on top were measuring the splash:
 *
 *   - `focus-visible.mjs` settled for 1500ms, so its 2.4.11 check reported the
 *     logo link "entirely covered" on 27 routes. It was — by the splash.
 *   - `glass-contrast.mjs` settled for 700ms and took its first screenshots
 *     around 1100ms, and picked its scroll offsets by sampling backdrop
 *     luminance, which during the splash is one flat colour at every offset.
 *
 * Both are the same mistake as measuring a page before its scroll reveals
 * fire: a state no reader is ever looking at. Rather than pushing each
 * script's fixed delay past 2.3s and leaving it to rot the next time that
 * duration changes, this asks the page directly.
 *
 * Deliberately generic — any full-viewport fixed overlay counts, not
 * `SplashScreen` by name — so a future modal-style loader is covered too.
 * Caps out rather than throwing: a route that legitimately shows a
 * full-screen overlay should still be measured, just with the fact recorded
 * by whatever check runs next.
 */
export async function waitForAppReady(page, { timeout = 8000 } = {}) {
  const deadline = Date.now() + timeout;
  for (;;) {
    const covered = await page
      .evaluate(() => {
        const area = innerWidth * innerHeight;
        for (const el of document.querySelectorAll('body *')) {
          const cs = getComputedStyle(el);
          if (cs.position !== 'fixed' && cs.position !== 'absolute') continue;
          if (cs.visibility === 'hidden' || cs.display === 'none') continue;
          if (parseFloat(cs.opacity) === 0) continue;
          const r = el.getBoundingClientRect();
          if (r.width * r.height >= area * 0.9) return true;
        }
        return false;
      })
      .catch(() => false);
    if (!covered || Date.now() > deadline) break;
    await page.waitForTimeout(150);
  }
  // The fade leaves the element at opacity 0 for a frame or two before React
  // unmounts it; settle past that rather than racing the transition.
  await page.waitForTimeout(250);
}
