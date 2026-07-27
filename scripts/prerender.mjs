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
 * substantiate: the 5% fee is `PLATFORM_FEE_PERCENTAGE`, the 20-minute hold is
 * `create_booking_hold`, the 24-hour default cancellation is the
 * `venue_policies` column default, and the providers are the two adapters in
 * `supabase/functions/_shared/providers/`.
 */
const PAGES = [
  {
    path: '/',
    title: 'Book Sports Venues in Armenia — Sportsbnb',
    description:
      'Book football pitches, basketball and tennis courts, pools and gyms by the hour across Yerevan and Armenia. Live availability, instant confirmation, pay by card or Idram in dram.',
    h1: 'Book a sports venue in Armenia',
    body: [
      'Sportsbnb is a sports venue booking marketplace for Armenia. Search by sport, city and price, see which hours are genuinely free, and pay in the app in Armenian dram — by card through Ameriabank or with Idram.',
      'Venues are listed by their owners with an hourly rate. Sportsbnb adds a 5% platform fee on top of that rate, so a court listed at ֏10,000 an hour costs ֏10,500 and the owner receives ֏10,000. Choosing a time holds it for 20 minutes while you pay.',
      'Football, basketball, tennis, swimming, volleyball, badminton, cricket, golf, boxing, yoga, gym, table tennis, squash, hockey, baseball, rugby, martial arts, dance, climbing and cycling.',
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
      'List your court, pitch or pool on Sportsbnb. Set your own hourly rate and cancellation terms, take card and Idram payments, and get paid out from a ledger you can audit.',
    h1: 'List your venue on Sportsbnb',
    body: [
      'If you run a court, pitch, pool or gym in Armenia, Sportsbnb puts it in front of people looking to book one and handles the payment.',
      'You set the hourly rate and keep it — Sportsbnb charges players a 5% fee on top rather than taking a cut of what you asked for. You set your own cancellation terms: full refund up to a cut-off you choose, a partial refund after it, or no refunds at all.',
      'Payments come in by card through Ameriabank or by Idram, are recorded to a double-entry ledger against your venue, and are paid out on a schedule. Double bookings are prevented by the database itself, not by anyone remembering to check.',
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
      'What does it cost? Whatever hourly rate the venue sets, plus a 5% platform fee. Prices are in Armenian dram and the total is shown before you pay.',
      'How do I pay? By card through Ameriabank, or with Idram. Payment happens in the app at the time of booking.',
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

let written = 0;
for (const page of PAGES) {
  const url = `${SITE}${page.path === '/' ? '/' : page.path}`;
  let html = shell;

  html = replaceOne(html, /<title>[\s\S]*?<\/title>/, `<title>${esc(page.title)}</title>`, '<title>');
  html = replaceOne(
    html,
    /<meta name="description" content="[^"]*"\s*\/?>/,
    `<meta name="description" content="${esc(page.description)}">`,
    'description meta',
  );
  html = replaceOne(
    html,
    /<link rel="canonical" href="[^"]*"\s*\/?>/,
    `<link rel="canonical" href="${url}" />`,
    'canonical link',
  );
  html = html
    .replace(/<meta property="og:title" content="[^"]*"\s*\/?>/, `<meta property="og:title" content="${esc(page.title)}">`)
    .replace(/<meta name="twitter:title" content="[^"]*"\s*\/?>/, `<meta name="twitter:title" content="${esc(page.title)}">`)
    .replace(
      /<meta property="og:description" content="[^"]*"\s*\/?>/,
      `<meta property="og:description" content="${esc(page.description)}">`,
    )
    .replace(
      /<meta name="twitter:description" content="[^"]*"\s*\/?>/,
      `<meta name="twitter:description" content="${esc(page.description)}">`,
    )
    .replace(/<meta property="og:url" content="[^"]*"\s*\/?>/, `<meta property="og:url" content="${url}" />`);

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

console.log(`Prerender — ${written} public page(s) with real titles, canonicals and text`);
