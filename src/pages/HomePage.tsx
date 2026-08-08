import { type HTMLAttributes, type ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Building2,
  CalendarCheck,
  Check,
  CreditCard,
  MapPin,
  ShieldCheck,
  Star,
  Zap,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import HeroSearch from "@/components/home/HeroSearch";
import { LiveInventory } from "@/components/home/LiveInventory";
import { Price } from "@/components/ui/price";
import SEOHead, { createWebsiteJsonLd } from "@/components/seo/SEOHead";
import { useAuth } from "@/hooks/useAuth";
import { useVenues } from "@/hooks/useVenues";
import heroImage from "@/assets/hero-landing.jpg";
import venueBasketball from "@/assets/venue-basketball.jpg";
import venueFootball from "@/assets/venue-football.jpg";
import venueSwimming from "@/assets/venue-swimming.jpg";
import venueTennis from "@/assets/venue-tennis.jpg";

type SectionProps = HTMLAttributes<HTMLElement> & {
  children: ReactNode;
  tone?: "base" | "raised" | "inverse";
};

const Section = ({ children, tone = "base", className = "", ...props }: SectionProps) => {
  const tones = {
    base: "bg-background",
    raised: "border-y border-border bg-surface-1",
    inverse: "bg-secondary text-secondary-foreground",
  };

  return (
    <section
      className={`${tones[tone]} py-16 sm:py-20 lg:py-24 ${className}`}
      {...props}
    >
      <div className="container px-5 md:px-6">{children}</div>
    </section>
  );
};

const Eyebrow = ({ children, inverse = false }: { children: ReactNode; inverse?: boolean }) => (
  <p
    className={`mb-4 text-xs font-semibold uppercase tracking-[0.12em] ${
      inverse ? "text-secondary-foreground/70" : "text-primary"
    }`}
  >
    {children}
  </p>
);

const HomePage = () => {
  const { user } = useAuth();
  // Shared with LiveInventory through react-query's cache, so the hero does
  // not fetch the catalogue twice to answer "is there anything to show".
  const { data: venues, isLoading: venuesLoading } = useVenues();
  const hasVenues = venuesLoading || (venues?.length ?? 0) > 0;

  const sports = [
    { name: "Football", image: venueFootball, detail: "Pitches and futsal" },
    { name: "Tennis", image: venueTennis, detail: "Clay, hard and padel" },
    { name: "Basketball", image: venueBasketball, detail: "Indoor and street" },
    { name: "Swimming", image: venueSwimming, detail: "Lanes by the hour" },
  ];

  const steps = [
    {
      icon: MapPin,
      title: "Find your court",
      body: "Filter by sport, neighbourhood, and time. Every venue is verified, with real photos and the actual price.",
    },
    {
      icon: CalendarCheck,
      title: "Pick a real slot",
      body: "Availability is live, not a guess. The slot you choose is held while you complete payment.",
    },
    {
      icon: CreditCard,
      title: "Pay and play",
      body: "Pay securely by card inside the app. Your booking is confirmed immediately and the venue knows you are coming.",
    },
  ];

  return (
    <>
      <SEOHead
        title="Book sports venues in Armenia"
        description="Find and book verified sports venues near you. Live availability, instant confirmation, and secure in-app card payment."
        jsonLd={createWebsiteJsonLd()}
      />

      <section className="border-b border-border bg-background">
        <div className="container px-5 pb-14 pt-12 md:px-6 md:pb-20 md:pt-16 lg:pt-20">
          <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-16">
            {/* No badge above the headline.
                There was a "Live availability" pill here, which said the same
                thing as the panel's live dot two columns over and cost the
                headline the first line of the page. A pill above an h1 is also
                the single most templated element on a marketing site; the
                claim it made is now made by the catalogue underneath it, which
                is better evidence than a label. */}
            <div>
              <h1 className="max-w-[12ch] text-balance font-display text-4xl font-bold leading-[1.02] tracking-tighter text-foreground sm:text-5xl lg:text-6xl">
                Book the court. <span className="text-primary">Skip the call.</span>
              </h1>

              <p className="mt-6 max-w-[46ch] text-base leading-7 text-foreground-soft sm:text-lg sm:leading-8">
                Booking a court in Armenia still means phoning someone who keeps
                a paper diary. This is the same booking, without the phone call
                — real availability, a price in dram, confirmed by card in
                seconds.
              </p>

              <div className="mt-8 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
                <Button asChild size="lg" className="group w-full sm:w-auto">
                  <Link to="/venues">
                    Browse venues
                    <ArrowRight className="h-4 w-4 transition-transform duration-150 group-hover:translate-x-0.5 motion-reduce:transition-none" aria-hidden="true" />
                  </Link>
                </Button>
                {!user && (
                  <Button asChild size="lg" variant="ghost" className="w-full justify-start px-2 sm:w-auto sm:justify-center sm:px-5">
                    <Link to="/for-owners">
                      <Building2 className="h-4 w-4" aria-hidden="true" />
                      List your venue
                    </Link>
                  </Button>
                )}
              </div>

              {/* Two facts, not two adjectives.
                  "Every venue verified" and "Confirmed in seconds" were claims
                  a reader has no way to check, and every competing marketplace
                  makes the same pair. These two are specific, true, and
                  enforced in code: the platform fee is literally zero on every
                  booking, and `create_booking_hold` puts a real 20-minute hold
                  on the slot with a database-level exclusion constraint behind
                  it, so nobody else can take it while you are paying. */}
              <div className="mt-7 flex flex-col gap-2 text-sm text-muted-foreground sm:flex-row sm:flex-wrap sm:gap-x-5">
                <span className="inline-flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                  <span>
                    <span className="stat-numeral font-semibold text-foreground">0%</span>{" "}
                    commission — the price is the venue&rsquo;s own
                  </span>
                </span>
                <span className="inline-flex items-center gap-2">
                  <Zap className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                  <span>
                    Your slot is held for{" "}
                    <span className="stat-numeral font-semibold text-foreground">20</span> minutes
                    while you pay
                  </span>
                </span>
              </div>
            </div>

            {/* The catalogue, or the photograph of one.
                `LiveInventory` renders null when there is nothing to show, so
                an empty or unreachable database falls back to the image rather
                than to a hero that says the marketplace is empty. */}
            <div className="relative">
              {hasVenues ? (
                <LiveInventory />
              ) : (
                <>
                  <div className="overflow-hidden rounded-2xl border border-border bg-card">
                    <img
                      src={heroImage}
                      alt="Floodlit five-a-side pitch at dusk with players mid-game"
                      className="aspect-[4/3] w-full object-cover"
                      loading="eager"
                    />
                  </div>

                  <div className="relative mx-3 -mt-7 flex items-center gap-3 rounded-xl border border-border bg-card p-4 shadow-md sm:mx-8">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
                      <Check className="h-5 w-5" strokeWidth={2.5} aria-hidden="true" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-display text-sm font-semibold leading-5 text-foreground sm:text-ui">
                        Confirmed — Thursday, 19:00
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground sm:text-meta">
                        Ararat Arena · 90 min ·{" "}
                        <Price amount={12000} className="text-xs sm:text-meta" />
                      </p>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="mt-12 lg:mt-14">
            <HeroSearch />
          </div>
        </div>
      </section>

      <Section tone="raised" aria-labelledby="how-heading">
        <div className="max-w-2xl">
          <Eyebrow>How it works</Eyebrow>
          <h2 id="how-heading" className="text-balance font-display text-3xl font-semibold leading-tight tracking-tight text-foreground sm:text-4xl">
            Three clear steps between you and the game.
          </h2>
        </div>

        <ol className="mt-10 grid gap-8 md:mt-12 md:grid-cols-3 md:gap-10">
          {steps.map((step, index) => (
            <li key={step.title} className="border-t border-border-strong pt-5">
              <div className="flex items-center justify-between gap-4">
                <step.icon className="h-6 w-6 text-primary" strokeWidth={1.75} aria-hidden="true" />
                <span className="font-mono text-xs tabular-nums text-muted-foreground">0{index + 1}</span>
              </div>
              <h3 className="mt-5 font-display text-lg font-semibold text-foreground">{step.title}</h3>
              <p className="mt-2 text-ui leading-7 text-foreground-soft">{step.body}</p>
            </li>
          ))}
        </ol>
      </Section>

      <Section aria-labelledby="sports-heading">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Eyebrow>What you can book</Eyebrow>
            <h2 id="sports-heading" className="max-w-xl text-balance font-display text-3xl font-semibold leading-tight tracking-tight text-foreground sm:text-4xl">
              Every sport has a court. Pick yours.
            </h2>
          </div>
          <Link
            to="/venues"
            className="focus-ring group inline-flex min-h-11 items-center gap-2 self-start rounded-lg text-sm font-semibold text-primary sm:self-auto"
          >
            See all venues
            <ArrowRight className="h-4 w-4 transition-transform duration-150 group-hover:translate-x-0.5 motion-reduce:transition-none" aria-hidden="true" />
          </Link>
        </div>

        <div className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {sports.map((sport) => (
            <Link
              key={sport.name}
              to={`/venues?sport=${encodeURIComponent(sport.name)}`}
              className="focus-ring group relative block overflow-hidden rounded-xl border border-border bg-secondary"
            >
              <img src={sport.image} alt="" loading="lazy" className="aspect-[4/5] w-full object-cover" />
              <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/15 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-4 text-white">
                <h3 className="font-display text-lg font-semibold">{sport.name}</h3>
                <p className="mt-0.5 text-sm text-white/75">{sport.detail}</p>
              </div>
            </Link>
          ))}
        </div>
      </Section>

      <Section tone="raised" aria-labelledby="lock-heading">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
          <div>
            <Eyebrow>Why it is different</Eyebrow>
            <h2 id="lock-heading" className="text-balance font-display text-3xl font-semibold leading-tight tracking-tight text-foreground sm:text-4xl">
              The slot is yours the moment you pay.
            </h2>
            <p className="mt-5 max-w-[52ch] text-base leading-7 text-foreground-soft sm:text-lg sm:leading-8">
              No messaging an owner and hoping. Payment and reservation happen
              together, so a confirmed booking means exactly that.
            </p>

            <ul className="mt-7 space-y-4">
              {[
                "Double-booking is prevented by the booking system",
                "Cancellation terms are shown before you pay",
                "Card payment and prices are handled in Armenian dram",
              ].map((item) => (
                <li key={item} className="flex gap-3 text-ui leading-6 text-foreground-soft">
                  <Check className="mt-0.5 h-5 w-5 shrink-0 text-primary" strokeWidth={2.25} aria-hidden="true" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-xl border border-border bg-card p-5 sm:p-6">
            <div className="flex items-baseline justify-between gap-4">
              <h3 className="font-display font-semibold text-foreground">Thursday, 24 July</h3>
              <span className="font-mono text-xs tabular-nums text-muted-foreground">90 min</span>
            </div>

            <ul className="mt-5 grid grid-cols-3 gap-2">
              {[
                { time: "17:00", state: "taken" },
                { time: "18:30", state: "open" },
                { time: "19:00", state: "picked" },
                { time: "20:30", state: "open" },
                { time: "21:00", state: "taken" },
                { time: "22:00", state: "open" },
              ].map(({ time, state }) => (
                <li
                  key={time}
                  className={`rounded-lg border px-2 py-2.5 text-center font-mono text-meta tabular-nums ${
                    state === "picked"
                      ? "border-primary bg-primary font-semibold text-primary-foreground"
                      : state === "taken"
                        ? "border-border bg-surface-1 text-muted-foreground line-through"
                        : "border-border-strong bg-background text-foreground"
                  }`}
                >
                  {time}
                  <span className="sr-only"> — {state === "picked" ? "selected" : state === "taken" ? "unavailable" : "available"}</span>
                </li>
              ))}
            </ul>

            <dl className="mt-6 space-y-2.5 border-t border-border pt-5 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-foreground-soft">90 minutes</dt>
                <dd className="font-mono tabular-nums text-foreground">֏12,000</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-foreground-soft">Booking fee</dt>
                <dd className="font-mono tabular-nums text-foreground">֏0</dd>
              </div>
              <div className="flex justify-between gap-4 border-t border-border pt-3 font-semibold">
                <dt className="text-foreground">Total</dt>
                <dd className="font-mono text-base tabular-nums text-foreground">֏12,000</dd>
              </div>
            </dl>

            <p className="mt-5 flex items-center justify-center gap-2 rounded-lg border border-primary/25 bg-primary-soft py-3 text-sm font-semibold text-primary">
              <Check className="h-4 w-4" strokeWidth={2.5} aria-hidden="true" />
              Slot held until 20:00
            </p>
          </div>
        </div>
      </Section>

      <Section tone="inverse" aria-labelledby="owners-heading">
        <div className="grid items-start gap-12 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-20">
          <div>
            <Eyebrow inverse>For venue owners</Eyebrow>
            <h2 id="owners-heading" className="text-balance font-display text-3xl font-semibold leading-tight tracking-tight text-secondary-foreground sm:text-4xl">
              Fill the empty hours. Keep the paperwork out of it.
            </h2>
            <p className="mt-5 max-w-[50ch] text-base leading-7 text-secondary-foreground/75 sm:text-lg sm:leading-8">
              List once, set your hours and price, then take bookings around the
              clock. We collect payment; you receive an itemised payout.
            </p>
            <Button asChild size="lg" variant="secondaryOutline" className="group mt-8 bg-secondary-foreground text-secondary hover:bg-secondary-foreground/90">
              <Link to="/for-owners">
                List your venue
                <ArrowRight className="h-4 w-4 transition-transform duration-150 group-hover:translate-x-0.5 motion-reduce:transition-none" aria-hidden="true" />
              </Link>
            </Button>
          </div>

          <dl className="grid border-y border-secondary-foreground/20 sm:grid-cols-2">
            {[
              { label: "Commission", value: "0%", note: "No listing fee or monthly cost" },
              { label: "Payouts", value: "Weekly", note: "Itemised for every booking" },
              { label: "Setup", value: "10 min", note: "Photos, hours, and price" },
              { label: "Support", value: "Direct", note: "Message players inside the app" },
            ].map(({ label, value, note }, index) => (
              <div
                key={label}
                className={`py-5 sm:p-6 ${index > 0 ? "border-t border-secondary-foreground/20 sm:border-t-0" : ""} ${index % 2 === 1 ? "sm:border-l sm:border-secondary-foreground/20" : ""} ${index > 1 ? "sm:border-t sm:border-secondary-foreground/20" : ""}`}
              >
                <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-secondary-foreground/60">{label}</dt>
                <dd className="mt-2 font-display text-2xl font-semibold tabular-nums text-secondary-foreground">{value}</dd>
                <p className="mt-1.5 text-sm leading-6 text-secondary-foreground/65">{note}</p>
              </div>
            ))}
          </dl>
        </div>
      </Section>

      <Section aria-labelledby="final-heading">
        <div className="mx-auto max-w-3xl text-center">
          <Star className="mx-auto h-5 w-5 fill-brand-tuff text-brand-tuff" aria-hidden="true" />
          <h2 id="final-heading" className="mt-5 text-balance font-display text-3xl font-semibold leading-tight tracking-tight text-foreground sm:text-4xl lg:text-5xl">
            Your next game starts with a real available slot.
          </h2>
          <p className="mx-auto mt-5 max-w-[44ch] text-base leading-7 text-foreground-soft sm:text-lg">
            Free to join. No card needed until you book.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Button asChild size="lg" className="group">
              <Link to={user ? "/venues" : "/signup"}>
                {user ? "Find a court" : "Get started"}
                <ArrowRight className="h-4 w-4 transition-transform duration-150 group-hover:translate-x-0.5 motion-reduce:transition-none" aria-hidden="true" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/venues">Browse first</Link>
            </Button>
          </div>
        </div>
      </Section>
    </>
  );
};

export default HomePage;
