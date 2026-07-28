#!/usr/bin/env node
/**
 * Real HTML for the public pages, because right now there is none.
 *
 * Measured against the live deployment before this existed:
 *
 *   $ curl https://www.sportsbnb.org/venues
 *   $ curl https://www.sportsbnb.org/faq
 *   $ curl https://www.sportsbnb.org/for-owners
 *   $ curl https://www.sportsbnb.org/about
 *
 * All four returned **byte-identical** documents — 3885 bytes, same SHA-256 —
 * containing the home page's title, the home page's description, no canonical
 * link, and **zero characters of body text**. That is what this app serves to
 * anything that does not execute JavaScript.
 *
 * Googlebot does render JavaScript, on a second pass, so it eventually sees the
 * real pages. Almost nothing else does. GPTBot, OAI-SearchBot, ClaudeBot,
 * PerplexityBot, Amazonbot and the social scrapers fetch HTML and read it as
 * given. For every one of them this marketplace is a single blank page with one
 * title, repeated at every URL — no venue, no city, no price, no sport, nothing
 * to quote and nothing to distinguish one page from another.
 *
 * ## What this does
 *
 * At build time it writes `dist/<route>/index.html` for each public route: the
 * built SPA shell with that route's title, description, canonical, Open Graph
 * and JSON-LD substituted in, plus a block of real prose describing the page.
 *
 * Vercel checks the filesystem before applying the SPA rewrite in
 * `vercel.json`, so a request for `/faq` is served `dist/faq/index.html`
 * directly and never reaches the catch-all. The document still loads the same
 * bundle from the same `<script>` tag, so a browser boots the SPA exactly as
 * before.
 *
 * That precedence is the assumption this whole file rests on, so it was
 * checked against the deployed config rather than taken from documentation.
 * The rewrite source is `/((?!api/).*)`, which matches `/assets/index-*.js` as
 * readily as it matches `/faq`. Production serves that asset as
 * `text/javascript`, not as the rewritten HTML:
 *
 *   $ curl -I https://www.sportsbnb.org/assets/index-B3ePScqx.js
 *   200  content-type: text/javascript
 *
 * If rewrites ran first, that request would return `index.html` and the app
 * would not boot at all. It boots, so the filesystem wins.
 *
 * One thing that cannot be checked before merging: the Vercel *preview*
 * deployments for this project sit behind SSO deployment protection and answer
 * 302 to `vercel.com/sso-api` for an unauthenticated request, so a preview URL
 * cannot be used to verify crawler-facing output. The artefacts in `dist/` and
 * the SPA booting from them were both verified locally instead.
 *
 * ## Why the prose is inside #root
 *
 * `src/main.tsx` uses `createRoot().render()`, not `hydrateRoot()`. React
 * replaces the container's children outright rather than trying to match them,
 * so there is no hydration mismatch to worry about and a human never sees this
 * copy — it is discarded the moment React mounts. A crawler that never mounts
 * React keeps it. That asymmetry is the entire point.
 *
 * ## What this is not
 *
 * It is not server rendering. Venue and game pages are per-record and cannot be
 * baked at build time; they still serve the shell. Making those crawlable needs
 * either SSR or an edge function that renders per request, and that is a real
 * architectural decision rather than a build step — see docs/handover.md.
 *
 * Usage:
 *   npm run build        # runs automatically via postbuild
 *   node scripts/prerender.mjs
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const DIST = join(ROOT, 'dist');
const SITE = 'https://www.sportsbnb.org';

if (!existsSync(join(DIST, 'index.html'))) {
  console.error('prerender: dist/index.html not found — run the build first.');
  process.exit(1);
}

const shell = readFileSync(join(DIST, 'index.html'), 'utf8');

/**
 * The public pages, with the copy a crawler should read.
 *
 * `description` is the meta description. `body` is what goes in the document —
 * it has to be genuinely about the page, because its whole job is to be the
 * thing an answer engine quotes. Every factual claim here is one this app can
 * substantiate: the zero commission is `platform_settings.commission_bps` (0)
 * and `PLATFORM_FEE_PERCENTAGE`, the 20-minute hold is
 * `create_booking_hold`, the 24-hour default cancellation is the
 * `venue_policies` column default, and the payment rail is the adapter in
 * `supabase/functions/_shared/providers/`.
 */
const PAGES = [
  {
    path: '/',
    title: 'Book Sports Venues in Armenia — Sportsbnb',
    description:
      'Book football pitches, basketball and tennis courts, pools and gyms by the hour across Yerevan and Armenia. Live availability, instant confirmation, pay securely by card in dram.',
    h1: 'Book a sports venue in Armenia',
    body: [
      'Sportsbnb is a sports venue booking marketplace for Armenia. Search by sport, city and price, see which hours are genuinely free, and pay in the app in Armenian dram, securely by card.',
      'Venues are listed by their owners with an hourly rate, and that rate is what you pay. Sportsbnb charges no commission and no booking fee, so a court listed at ֏10,000 an hour costs ֏10,000 and the owner receives all of it. Choosing a time holds it for 20 minutes while you pay.',
      // The twelve in SPORTS_OPTIONS, which is what VenueForm offers an owner —
      // not the twenty in sportTypes. A venue cannot be listed for the other
      // eight, so naming them here would advertise inventory that cannot exist.
      'Football, basketball, tennis, swimming, volleyball, badminton, rugby, gym, cricket, golf, running and cycling.',
    ],
  },
  {
    path: '/venues',
    title: 'Sports Venues in Yerevan & Armenia — Book by the Hour',
    description:
      'Browse every sports venue on Sportsbnb. Filter by sport, city and price, compare hourly rates in dram, read reviews, and book the hour you want.',
    h1: 'Sports venues in Armenia',
    body: [
      'Every venue listed on Sportsbnb, filterable by sport, by city and by hourly price. Each listing shows what the venue costs per hour in Armenian dram, which sports it is set up for, what facilities it has, and what previous players rated it.',
      'Search accepts a free-text query matched against venue name, street address and city, so searching for a district or a city name works as well as searching for a venue by name.',
    ],
  },
  {
    path: '/venues/map',
    title: 'Sports Venue Map — Armenia',
    description:
      'The same venues on a map. Find a court or pitch near you in Yerevan and across Armenia, with hourly prices in dram.',
    h1: 'Venues on the map',
    body: [
      'The same inventory as the venue list, placed on a map so you can pick by where you actually are rather than by name.',
    ],
  },
  {
    path: '/games',
    title: 'Open Pickup Games to Join — Armenia',
    description:
      'Join an open pickup game near you. Football, basketball, volleyball and more, with the date, time, skill level and price per player set by the host.',
    h1: 'Open games near you',
    body: [
      'Games hosted by other players, open for anyone to request a place. Each one lists the sport, the venue or location, the date and time, the skill level it is pitched at, how many places are left, and the price per player.',
      'Hosting is free. If a game has a price per player, that is the host recovering the cost of the court.',
    ],
  },
  {
    path: '/nearby',
    title: 'Free Public Sports Fields Near You — Armenia',
    description:
      'Public pitches and courts across Armenia that cost nothing to use, submitted and verified by the community.',
    h1: 'Free public fields',
    body: [
      'Not every place to play needs booking. These are public pitches, courts and open grounds across Armenia that anyone can use for free, submitted by players and checked before they are listed.',
      'They are listed separately from bookable venues on purpose: nothing here is reserved, and nothing here is paid for.',
    ],
  },
  {
    path: '/teams',
    title: 'Find or Create a Sports Team — Armenia',
    description:
      'Find a team to join or start your own. Set the sport, the size and whether it is open to anyone, and invite players with a link.',
    h1: 'Teams',
    body: [
      'Public teams looking for players, and the form to create one of your own. A team has a sport, a size, and either open membership or an invite link that only reaches the people you send it to.',
    ],
  },
  {
    path: '/community',
    title: 'Players, Teams and Activity — Sportsbnb Community',
    description:
      'See who is playing near you, what games are being organised, and how the local sports community is doing.',
    h1: 'Community',
    body: [
      'Players near you, recent activity, and the games and teams being organised around Armenia.',
    ],
  },
  {
    path: '/for-owners',
    title: 'List Your Sports Venue — Sportsbnb for Owners',
    description:
      'List your court, pitch or pool on Sportsbnb. Set your own hourly rate and cancellation terms, take card payments, and get paid out from a ledger you can audit.',
    h1: 'List your venue on Sportsbnb',
    body: [
      'If you run a court, pitch, pool or gym in Armenia, Sportsbnb puts it in front of people looking to book one and handles the payment.',
      'You set the hourly rate and keep all of it — Sportsbnb takes no commission, charges players nothing on top, and has no listing or monthly fee. You set your own cancellation terms: full refund up to a cut-off you choose, a partial refund after it, or no refunds at all.',
      'Payments come in by card, are recorded to a double-entry ledger against your venue, and are paid out on a schedule. Double bookings are prevented by the database itself, not by anyone remembering to check.',
    ],
  },
  {
    path: '/faq',
    title: 'Frequently Asked Questions — Sportsbnb',
    description:
      'How booking works, what it costs, how cancellations and refunds are handled, and how to list a venue on Sportsbnb.',
    h1: 'Frequently asked questions',
    body: [
      'How do I book a venue? Search for one, pick a date, choose a free hour, and pay. The slot is held for 20 minutes while you complete payment and is confirmed as soon as it goes through.',
      'What does it cost? Exactly the hourly rate the venue sets — there is no platform fee or commission on top. Prices are in Armenian dram and the total is shown before you pay.',
      'How do I pay? Securely by card — Visa or Mastercard. Payment happens in the app at the time of booking, on the payment provider\u2019s own page, so your card details never reach Sportsbnb.',
      'Can I cancel? That depends on the venue. The default is a full refund up to 24 hours before the booking starts; some owners offer a partial refund after that, and some make bookings non-refundable. The terms are shown before you pay and stored with the booking.',
      'How do I list my venue? Create an owner account and add your venue with its rate, sports and photos. There is no listing fee.',
    ],
  },
  {
    path: '/about',
    title: 'About Sportsbnb',
    description:
      'Sportsbnb is a sports venue booking marketplace in Armenia, connecting players with courts, pitches and pools by the hour.',
    h1: 'About Sportsbnb',
    body: [
      'Sportsbnb exists because finding somewhere to play in Armenia meant phoning around. Venues had no way to show what was free and players had no way to see it.',
      'The platform lists venues with real availability, takes payment in dram, and pays owners out of an auditable ledger.',
    ],
  },
  {
    path: '/contact',
    title: 'Contact Sportsbnb',
    description: 'Get in touch with the Sportsbnb team about a booking, a venue listing, or anything else.',
    h1: 'Contact us',
    body: ['Questions about a booking, listing a venue, or anything else — send us a message and we will reply.'],
  },
  {
    path: '/blog',
    title: 'Sportsbnb Blog — Venues, Booking and Sport in Armenia',
    description: 'Articles on where to play in Armenia, how booking works, and the local sports scene.',
    h1: 'Blog',
    body: ['Writing about venues, booking, and playing sport in Armenia.'],
  },
  { path: '/privacy', title: 'Privacy Policy — Sportsbnb', description: 'How Sportsbnb collects, uses and protects your personal data.', h1: 'Privacy policy', body: ['How Sportsbnb collects, uses and protects your personal data.'] },
  { path: '/terms', title: 'Terms of Service — Sportsbnb', description: 'The terms that apply to using Sportsbnb as a player or a venue owner.', h1: 'Terms of service', body: ['The terms that apply to using Sportsbnb as a player or a venue owner.'] },
  { path: '/cookies', title: 'Cookie Policy — Sportsbnb', description: 'Which cookies Sportsbnb sets and what they are for.', h1: 'Cookie policy', body: ['Which cookies Sportsbnb sets and what they are for.'] },
];

const esc = (s) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Replace a tag that already exists in the shell, or fail loudly. */
function replaceOne(html, pattern, replacement, what) {
  if (!pattern.test(html)) {
    throw new Error(
      `prerender: no ${what} in dist/index.html to replace. The shell changed; ` +
        `this script substitutes rather than appends so that it cannot silently ` +
        `emit two of the same tag.`,
    );
  }
  return html.replace(pattern, replacement);
}

/**
 * The document Vercel's catch-all rewrite serves for everything else.
 *
 * This is the fix for a regression this script caused. Writing the home page's
 * prerender to `dist/index.html` was correct for `/` and wrong for every route
 * that falls through to the rewrite in `vercel.json` — `/venue/:id`,
 * `/game/:id`, `/team/:id`, `/blog/:slug` and any typo'd URL. Those started
 * receiving the home page's prose *and* its canonical, so the served HTML told
 * a crawler that every venue page in the marketplace was the home page. That
 * is strictly worse than the empty shell they got before: a wrong canonical
 * is a claim, an absent one is only a gap.
 *
 * So the rewrite now points at this file instead. It is the untouched build
 * shell — generic title, generic description, **no canonical** — which is
 * honest about a page whose identity is not known until React resolves the
 * record. It stays indexable, because the routes it serves are ones we want
 * indexed; it simply does not assert anything false about them.
 *
 * Making those pages genuinely crawlable needs per-request rendering. That is
 * still deferred, and docs/handover.md §10 says so.
 */
const SHELL_FILE = 'app-shell.html';
{
  let neutral = shell;
  // The canonical is the whole point: the shell must not claim to be a page.
  neutral = neutral.replace(/<link rel="canonical"[^>]*>\n?\s*/, '');
  neutral = neutral.replace(/<meta property="og:url"[^>]*>\n?\s*/, '');
  writeFileSync(join(DIST, SHELL_FILE), neutral);
}

let written = 0;
for (const page of PAGES) {
  const url = `${SITE}${page.path === '/' ? '/' : page.path}`;
  let html = shell;

  html = replaceOne(html, /<title>[\s\S]*?<\/title>/, `<title>${esc(page.title)}</title>`, '<title>');
  html = replaceOne(
    html,
    /<meta name="description" content="[^"]*"[^>]*>/,
    `<meta name="description" content="${esc(page.description)}" data-rh="true">`,
    'description meta',
  );
  html = replaceOne(
    html,
    /<link rel="canonical" href="[^"]*"[^>]*>/,
    `<link rel="canonical" href="${url}" data-rh="true" />`,
    'canonical link',
  );
  html = html
    .replace(/<meta property="og:title" content="[^"]*"[^>]*>/, `<meta property="og:title" content="${esc(page.title)}" data-rh="true">`)
    .replace(/<meta name="twitter:title" content="[^"]*"[^>]*>/, `<meta name="twitter:title" content="${esc(page.title)}" data-rh="true">`)
    .replace(
      /<meta property="og:description" content="[^"]*"[^>]*>/,
      `<meta property="og:description" content="${esc(page.description)}" data-rh="true">`,
    )
    .replace(
      /<meta name="twitter:description" content="[^"]*"[^>]*>/,
      `<meta name="twitter:description" content="${esc(page.description)}" data-rh="true">`,
    )
    .replace(/<meta property="og:url" content="[^"]*"[^>]*>/, `<meta property="og:url" content="${url}" data-rh="true" />`);

  // The prose, inside #root. React throws it away on mount; a crawler keeps it.
  const content =
    `<h1>${esc(page.h1)}</h1>\n` +
    page.body.map((p) => `      <p>${esc(p)}</p>`).join('\n') +
    `\n      <nav aria-label="Sportsbnb">\n` +
    PAGES.filter((p) => p.path !== page.path)
      .map((p) => `        <a href="${p.path}">${esc(p.h1)}</a>`)
      .join('\n') +
    `\n      </nav>`;
  html = replaceOne(
    html,
    /<div id="root"><\/div>/,
    `<div id="root">\n      ${content}\n    </div>`,
    'empty #root div',
  );

  const dir = page.path === '/' ? DIST : join(DIST, page.path.replace(/^\//, ''));
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'index.html'), html);
  written += 1;
}

console.log(
  `Prerender — ${written} public page(s) with real titles, canonicals and text, ` +
    `plus ${SHELL_FILE} for the catch-all rewrite`,
);
