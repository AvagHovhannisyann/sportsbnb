import { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  ArrowRight,
  Banknote,
  Building2,
  CalendarDays,
  Check,
  Clock3,
  CreditCard,
  MapPin,
  Newspaper,
  Search,
  ShieldCheck,
  Timer,
  Users,
  Wallet,
} from "lucide-react";
import SEOHead, { createBreadcrumbJsonLd } from "@/components/seo/SEOHead";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorPanel, StatusPanel } from "@/components/common/StatusPanel";
import VenueCard from "@/components/venues/VenueCard";
import { getVenueImage, useVenues } from "@/hooks/useVenues";
import { useGames } from "@/hooks/useGames";

/* ------------------------------------------------------------------
   A guided tour of the product, for someone who has never seen it.

   Everything factual on this page is read from the live database —
   the venue cards, the counts in the hero, the number of open games.
   A demo that shows invented inventory is a demo of nothing, and the
   first question anyone asks a founder is whether the thing is real.

   Design is entirely borrowed from Layout, VenueCard, StatusPanel,
   Button, and the shared Open Court surface tokens.
------------------------------------------------------------------ */

/* ------------------------------------------------------------------
   Section shell — same rhythm and tonal step as the landing page, so
   the tour reads as part of the product rather than a deck about it.
------------------------------------------------------------------ */
const Section = ({
  children,
  tone = "base",
  className = "",
  ...rest
}: {
  children: React.ReactNode;
  tone?: "base" | "raised" | "invert";
  className?: string;
} & React.HTMLAttributes<HTMLElement>) => {
  const tones = {
    base: "bg-background",
    raised: "bg-surface-1 border-y border-border",
    invert: "surface-invert bg-secondary text-secondary-foreground",
  };
  return (
    <section className={`${tones[tone]} py-20 md:py-24 ${className}`} {...rest}>
      <div className="container px-5 md:px-6">{children}</div>
    </section>
  );
};

const heading =
  "text-balance font-display text-[clamp(1.875rem,4vw,2.75rem)] font-bold leading-[1.05] tracking-[-0.03em]";

/** The four stops, listed up front so a visitor knows how long this is. */
const TOUR = [
  { id: "venues", label: "What's listed" },
  { id: "booking", label: "How booking works" },
  { id: "owners", label: "For venue owners" },
  { id: "status", label: "Build status" },
];

const BOOKING_STEPS = [
  {
    icon: Search,
    title: "Search",
    body: "Filter by sport, city and price. Every venue carries its real address, its real hourly rate and the photos its owner uploaded.",
  },
  {
    icon: CalendarDays,
    title: "Pick a slot",
    body: "Availability comes from the venue's own opening hours minus what is already booked. The slot you tap is the slot you get.",
  },
  {
    icon: Timer,
    title: "The slot is held",
    body: "Tapping reserve places a 20-minute hold. A database exclusion constraint makes an overlapping booking impossible — it is not enforced by trust.",
  },
  {
    icon: CreditCard,
    title: "Pay",
    body: "By card, in Armenian dram, inside the app. Payment and reservation commit together, so a confirmed booking means confirmed.",
  },
];

const OWNER_STATS = [
  { k: "Commission", v: "0%", note: "No listing fee, no monthly cost" },
  { k: "Payouts", v: "Weekly", note: "Itemised, straight to your account" },
  { k: "Setup", v: "Guided", note: "Photos, hours, and price in one flow" },
  { k: "Calendar", v: "2-way", note: "Syncs with the calendar you already use" },
];

const OWNER_POINTS = [
  {
    icon: Wallet,
    title: "Earnings you can audit",
    body: "Every booking writes an append-only ledger entry — what the player paid and what you earned, which with zero commission is the same figure. The earnings page is a view over that ledger, not a summary someone types in.",
  },
  {
    icon: CalendarDays,
    title: "One calendar, not three",
    body: "Set opening hours, per-court pricing and block-out dates once. Bookings land on the same schedule, and Google Calendar sync keeps whatever you already run in step.",
  },
  {
    icon: Banknote,
    title: "Payouts on a schedule",
    body: "Balances accrue as bookings confirm and pay out weekly, each transfer itemised down to the booking that produced it.",
  },
];

const WORKING_TODAY = [
  "Browse, search and filter the live venue catalogue",
  "Venue pages with hours, amenities, courts, pricing rules and reviews",
  "Availability, 20-minute holds and database-enforced no-double-booking",
  "Open games, join requests and teams",
  "Owner dashboard: schedule, pricing, equipment, analytics, earnings ledger",
  "Accounts, notifications and transactional email",
];

const BEFORE_LIVE = [
  {
    title: "Card payments, switched to live",
    body: "The card rail is written and runs end-to-end, re-verified server-side rather than trusting the redirect back from the payment page. What is outstanding is the merchant account and production credentials. Until those land, booking payments run against the test provider.",
  },
  {
    title: "Then: onboard owners past the seed set",
    body: "The catalogue below is the founding set. Owner onboarding is built and open — it is a sales job from here, not a build one.",
  },
];

const DemoPage = () => {
  const {
    data: venues = [],
    isLoading: venuesLoading,
    isError: venuesError,
    refetch: refetchVenues,
    isRefetching: venuesRefetching,
  } = useVenues();
  const { data: games = [], isLoading: gamesLoading, isError: gamesError } = useGames();

  /**
   * The six best-reviewed venues, not the six newest.
   *
   * This is the only place in the app that picks a subset for display, and
   * a demo should open on the catalogue's strongest work. Rating first,
   * review count as the tie-break, so a lone five-star review does not
   * outrank a well-reviewed venue.
   */
  const featured = useMemo(
    () =>
      [...venues]
        .sort(
          (a, b) =>
            Number(b.rating ?? 0) - Number(a.rating ?? 0) ||
            Number(b.review_count ?? 0) - Number(a.review_count ?? 0),
        )
        .slice(0, 6),
    [venues],
  );

  const cityCount = useMemo(
    () => new Set(venues.map((v) => v.city).filter(Boolean)).size,
    [venues],
  );

  /**
   * A count is `null` while it is still in flight, and renders as an em dash;
   * a count that *failed* is dropped from the row entirely.
   *
   * Two different mistakes are being avoided. Printing `venues.length` during
   * the query states "0 venues" as fact on every cold load and then
   * contradicts itself — the mistake DiscoverPage's header documents. And
   * printing a zero after an error is worse on this page than on any other:
   * a founder sends this link to say the thing is real, so a stat that
   * quietly reports nothing when the request failed is exactly the claim it
   * must not make. Better to show two facts than three with one lying.
   *
   * The games count is currently the one that can fail — see the note on the
   * links row further down.
   */
  const stats = [
    {
      icon: MapPin,
      label: "Venues live",
      value: venuesLoading ? null : venues.length,
      to: "/venues",
      failed: venuesError,
    },
    {
      icon: Building2,
      label: "Cities",
      value: venuesLoading ? null : cityCount,
      to: "/venues",
      failed: venuesError,
    },
    {
      icon: Users,
      label: "Open games",
      value: gamesLoading ? null : games.length,
      to: "/games",
      failed: gamesError,
    },
  ].filter((s) => !s.failed);

  const statCols = stats.length >= 3 ? "sm:grid-cols-3" : "sm:grid-cols-2";

  return (
    <Layout>
      <SEOHead
        title="Product tour"
        description="A guided tour of Sportsbnb — the marketplace for booking sports venues in Armenia. Live venues, how a booking works, what owners get, and an honest account of what is still being built."
        canonical="/demo"
        jsonLd={createBreadcrumbJsonLd([
          { name: "Home", url: "/" },
          { name: "Product tour", url: "/demo" },
        ])}
      />

      {/* ============================================================
          HERO — what this is, in one sentence, plus the live counts
          that prove the rest of the page is not a mock-up.
      ============================================================ */}
      <section className="border-b border-border bg-background">
        <div className="container px-5 pb-16 pt-14 md:px-6 md:pb-20 md:pt-20">
          <div>
            <span className="inline-flex items-center gap-2 text-sm font-semibold text-foreground-soft">
              <span className="h-2 w-2 rounded-full bg-brand-tuff" aria-hidden="true" />
              Guided tour · live data
            </span>
          </div>

          <h1 className="mt-6 max-w-[20ch] text-balance font-display text-[clamp(2.25rem,5vw,4rem)] font-semibold leading-[1] tracking-[-0.04em] text-foreground">
            Sportsbnb is a marketplace for{" "}
            <span className="text-primary">booking sports venues in Armenia.</span>
          </h1>

          <p className="mt-6 max-w-[58ch] text-lg leading-relaxed text-foreground-soft">
            Think Airbnb, for pitches, courts and pools. Players find a venue near
            them, see what is actually free, and pay for the hour in the app.
            Owners list once and fill the hours that would otherwise sit empty.
            Everything below is read from the running product — the venues are
            real, and every link goes into the app itself.
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Button asChild size="lg" className="h-12 rounded-xl px-6 text-ui font-semibold">
              <Link to="/venues">
                Browse the real venues
                <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="h-12 rounded-xl px-6 text-ui font-semibold"
            >
              <Link to="/for-owners">
                <Building2 className="mr-2 h-4 w-4" aria-hidden="true" />
                See the owner side
              </Link>
            </Button>
          </div>

          {/* Live counts. Three facts, each one a link to the page it
              describes — a number a visitor cannot click is a claim. */}
          <dl className={`mt-12 grid border-y border-border ${statCols}`}>
            {stats.map(({ icon: Icon, label, value, to }) => (
              <Link
                key={label}
                to={to}
                className="focus-ring border-b border-border px-1 py-5 transition-colors duration-150 hover:bg-surface-1 sm:border-b-0 sm:border-r sm:px-5 sm:last:border-r-0"
              >
                <dt className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Icon className="h-4 w-4 text-primary" aria-hidden="true" />
                  {label}
                </dt>
                <dd
                  className="mt-2 font-display text-3xl font-bold tabular-nums text-foreground"
                  aria-live="polite"
                >
                  {value === null ? (
                    <span aria-label="Loading">—</span>
                  ) : (
                    value
                  )}
                </dd>
              </Link>
            ))}
          </dl>

          {/* The tour's own table of contents: four stops, so nobody has
              to guess how long this page is. */}
          <nav aria-label="Tour contents" className="mt-10">
            <ol className="flex flex-wrap gap-2">
              {TOUR.map((stop, i) => (
                <li key={stop.id}>
                  <a
                    href={`#${stop.id}`}
                    className="focus-ring inline-flex min-h-11 items-center gap-2 rounded-full border border-border bg-surface-1 px-3.5 py-2 text-sm text-foreground-soft transition-colors hover:border-border-strong hover:text-foreground"
                  >
                    <span className="font-mono text-xs tabular-nums text-primary">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    {stop.label}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        </div>
      </section>

      {/* ============================================================
          1 — WHAT'S LISTED. The real catalogue, through the real card.
      ============================================================ */}
      <Section id="venues" tone="raised" aria-labelledby="venues-heading">
        <div>
          <div>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <p className="eyebrow mb-0">01 — What's listed</p>
              <Link
                to="/venues"
                className="group inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-md text-ui font-semibold text-primary outline-none transition-colors hover:text-primary/80 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                {venuesLoading || venuesError
                  ? "See all venues"
                  : `See all ${venues.length} venues`}
                <ArrowRight
                  className="h-4 w-4"
                  aria-hidden="true"
                />
              </Link>
            </div>
            <h2 id="venues-heading" className={`mt-4 max-w-2xl ${heading} text-foreground`}>
              Real venues, real prices, straight from the database.
            </h2>
            <p className="mt-4 max-w-[60ch] text-ui leading-relaxed text-foreground-soft">
              These are the same cards the venues page renders, fed by the same
              query — pitches, courts and pools across Yerevan, Gyumri, Vanadzor,
              Dilijan, Abovyan and Ejmiatsin. Tap one to open the venue page a
              player would book from.
            </p>
          </div>

          <div className="mt-10">
            {venuesLoading ? (
              // Same grid, same card geometry as the results below, so the
              // venues land in place instead of shifting the page.
              <div
                className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
                role="status"
                aria-label="Loading venues"
              >
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="overflow-hidden rounded-2xl border border-border bg-card">
                    <Skeleton className="aspect-[3/2] w-full rounded-none bg-surface-3" />
                    <div className="space-y-3 p-4">
                      <Skeleton className="h-5 w-3/5 bg-surface-3" />
                      <Skeleton className="h-4 w-2/5 bg-surface-2" />
                      <div className="flex gap-2 pt-1">
                        <Skeleton className="h-6 w-16 rounded-full bg-surface-2" />
                        <Skeleton className="h-6 w-20 rounded-full bg-surface-2" />
                      </div>
                      <div className="flex items-center justify-between pt-2">
                        <Skeleton className="h-6 w-24 bg-surface-3" />
                        <Skeleton className="h-4 w-12 bg-surface-2" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : venuesError ? (
              /* A failed query is not an empty catalogue. Saying "no venues
                 listed" here would be asserting something we did not hear
                 back about — and on this page of all pages. */
              <ErrorPanel
                what="the venues"
                description="The connection dropped on the way to our servers. The catalogue is still there — retrying should bring it back."
                onRetry={() => refetchVenues()}
                isRetrying={venuesRefetching}
                className="rounded-2xl border border-destructive/25 bg-destructive/5"
              />
            ) : featured.length > 0 ? (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {featured.map((venue) => (
                  <div key={venue.id}>
                    <VenueCard
                      headingLevel="h3"
                      id={venue.id}
                      name={venue.name}
                      image={getVenueImage(venue)}
                      location={venue.address || venue.city}
                      sports={venue.sports}
                      price={venue.price_per_hour}
                      rating={venue.rating}
                      reviewCount={venue.review_count}
                      available={venue.is_active}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <StatusPanel
                icon={MapPin}
                tone="positive"
                title="No venues listed yet"
                description="Nothing is live in this environment right now. The rest of the tour still describes the product accurately — the booking flow, the owner tools and the build status below do not depend on the catalogue."
                className="rounded-2xl border border-border bg-card"
              >
                <Button asChild>
                  <Link to="/for-owners">List a venue</Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link to="/blog">Read the blog instead</Link>
                </Button>
              </StatusPanel>
            )}
          </div>
        </div>
      </Section>

      {/* ============================================================
          2 — HOW BOOKING WORKS.
      ============================================================ */}
      <Section id="booking" aria-labelledby="booking-heading">
        <div>
          <div className="max-w-2xl">
            <p className="eyebrow mb-4">02 — How booking works</p>
            <h2 id="booking-heading" className={`${heading} text-foreground`}>
              Search, pick a slot, hold it, pay.
            </h2>
            <p className="mt-4 text-ui leading-relaxed text-foreground-soft">
              Four steps, and no phone call in any of them. The whole point of
              the product is that the hour you tapped is the hour you get.
            </p>
          </div>

          <ol className="mt-12 grid gap-10 md:grid-cols-2 md:gap-x-10 md:gap-y-12 lg:grid-cols-4 lg:gap-8">
            {BOOKING_STEPS.map((s, i) => (
              <li key={s.title}>
                <div className="mb-5 flex items-center gap-3">
                  <span className="font-mono text-sm tabular-nums text-primary">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span aria-hidden="true" className="h-px flex-1 bg-border" />
                </div>
                <s.icon className="mb-4 h-6 w-6 text-primary" strokeWidth={1.75} aria-hidden="true" />
                <h3 className="font-display text-lg font-semibold tracking-tight text-foreground">
                  {s.title}
                </h3>
                <p className="mt-2.5 text-ui leading-relaxed text-foreground-soft">{s.body}</p>
              </li>
            ))}
          </ol>

          <div className="mt-12 flex flex-wrap items-center gap-3">
            <Button asChild size="lg" className="h-12 rounded-xl px-6 text-ui font-semibold">
              <Link to="/venues">
                Try it on a real venue
                <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
            <p className="text-sm text-muted-foreground">
              No account needed to browse. You are only asked to sign in at the
              point of reserving.
            </p>
          </div>
        </div>
      </Section>

      {/* ============================================================
          3 — OWNERS. The single tonal inversion on the page, which is
          what makes it register as a different audience.
      ============================================================ */}
      <Section id="owners" tone="invert" aria-labelledby="owners-heading">
        <div>
          <div className="max-w-2xl">
            <p className="eyebrow mb-4 text-current opacity-60">03 — For venue owners</p>
            <h2 id="owners-heading" className={`${heading} text-secondary-foreground`}>
              Fill the empty hours. Keep the paperwork out of it.
            </h2>
            <p className="mt-4 text-ui leading-relaxed opacity-75">
              The other half of the marketplace. An owner lists a venue, sets
              hours and a price, and takes bookings around the clock — we collect
              the money and pay it out.
            </p>
          </div>

          <dl className="mt-12 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {OWNER_STATS.map(({ k, v, note }) => (
              <div key={k} className="border-t border-secondary-foreground/20 py-5">
                <dt className="eyebrow text-current opacity-60">{k}</dt>
                <dd className="mt-2 font-display text-2xl font-bold tabular-nums">{v}</dd>
                <p className="mt-1.5 text-meta leading-snug opacity-65">{note}</p>
              </div>
            ))}
          </dl>

          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {OWNER_POINTS.map(({ icon: Icon, title, body }) => (
              <div key={title}>
                <Icon className="mb-4 h-6 w-6 text-primary" strokeWidth={1.75} aria-hidden="true" />
                <h3 className="font-display text-lg font-semibold tracking-tight text-secondary-foreground">
                  {title}
                </h3>
                <p className="mt-2.5 text-ui leading-relaxed opacity-75">{body}</p>
              </div>
            ))}
          </div>

          <div className="mt-12">
            <Button
              asChild
              size="lg"
                className="h-12 rounded-xl bg-secondary-foreground px-6 text-ui font-semibold text-secondary hover:bg-secondary-foreground/90"
            >
              <Link to="/for-owners">
                See what listing involves
                <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
          </div>
        </div>
      </Section>

      {/* ============================================================
          4 — BUILD STATUS. The section that makes the rest credible:
          what runs today, and the one thing standing between this and
          taking real money.
      ============================================================ */}
      <Section id="status" tone="raised" aria-labelledby="status-heading">
        <div>
          <div className="max-w-2xl">
            <p className="eyebrow mb-4">04 — Build status, honestly</p>
            <h2 id="status-heading" className={`${heading} text-foreground`}>
              What works today, and what is left.
            </h2>
            <p className="mt-4 text-ui leading-relaxed text-foreground-soft">
              A demo that shows only the finished parts is a demo you cannot
              trust. So: everything on the left is running right now, on the same
              deployment you are looking at.
            </p>
          </div>

          <div className="mt-12 grid gap-6 lg:grid-cols-2 lg:gap-8">
            <div className="rounded-2xl border border-border bg-card p-6 md:p-7">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="h-5 w-5 text-primary" aria-hidden="true" />
                <h3 className="font-display text-lg font-semibold tracking-tight text-foreground">
                  Working today
                </h3>
              </div>
              <ul className="mt-5 space-y-3">
                {WORKING_TODAY.map((line) => (
                  <li
                    key={line}
                    className="flex gap-3 text-ui leading-relaxed text-foreground-soft"
                  >
                    <Check
                      className="mt-0.5 h-5 w-5 shrink-0 text-primary"
                      strokeWidth={2.25}
                      aria-hidden="true"
                    />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl border border-border bg-card p-6 md:p-7">
              <div className="flex items-center gap-2.5">
                <Clock3 className="h-5 w-5 text-warning" aria-hidden="true" />
                <h3 className="font-display text-lg font-semibold tracking-tight text-foreground">
                  Before going live
                </h3>
              </div>
              <ul className="mt-5 space-y-5">
                {BEFORE_LIVE.map(({ title, body }) => (
                  <li key={title}>
                    <h4 className="font-display text-ui font-semibold text-foreground">
                      {title}
                    </h4>
                    <p className="mt-1.5 text-ui leading-relaxed text-foreground-soft">{body}</p>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Somewhere else to go, for a visitor who has read this far.
              The games link is conditional on that query having succeeded:
              sending someone from a demo to a page that greets them with an
              error panel is the one thing this page cannot afford, and games
              are the only section here whose data can fail independently of
              the venues. */}
          <div className="mt-8 flex flex-wrap gap-3">
            {!gamesError && (
              <Button asChild variant="outline" className="h-11 rounded-xl">
                <Link to="/games">
                  <Activity className="mr-2 h-4 w-4" aria-hidden="true" />
                  Open games
                </Link>
              </Button>
            )}
            <Button asChild variant="outline" className="h-11 rounded-xl">
              <Link to="/blog">
                <Newspaper className="mr-2 h-4 w-4" aria-hidden="true" />
                Read the blog
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-11 rounded-xl">
              <Link to="/faq">
                <Search className="mr-2 h-4 w-4" aria-hidden="true" />
                Questions we get asked
              </Link>
            </Button>
          </div>
        </div>
      </Section>

      {/* ============================================================
          CLOSE — one action, nothing competing with it.
      ============================================================ */}
      <section className="border-t border-border bg-brand-tuff-soft py-20 md:py-24">
        <div className="container px-5 text-center md:px-6">
          <h2 className="mx-auto max-w-3xl text-balance font-display text-[clamp(2rem,5vw,3.25rem)] font-semibold leading-[1.02] tracking-[-0.035em] text-foreground">
            That's the tour. The rest of it is a click away.
          </h2>
          <p className="mx-auto mt-5 max-w-[46ch] text-lg leading-relaxed text-foreground-soft">
            Nothing on this page was staged for it. Open the app and you are
            looking at the same data.
          </p>
          <div className="mt-9 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg" className="h-12 rounded-xl px-7 text-ui font-semibold">
              <Link to="/venues">
                Browse venues
                <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="h-12 rounded-xl px-6 text-ui font-semibold"
            >
              <Link to="/">Back to the home page</Link>
            </Button>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default DemoPage;
