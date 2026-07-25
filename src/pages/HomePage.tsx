import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  ArrowRight, Check, MapPin, ShieldCheck, Zap, CalendarCheck,
  CreditCard, Building2, Star, Activity,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import HeroSearch from "@/components/home/HeroSearch";
import SEOHead, { createWebsiteJsonLd } from "@/components/seo/SEOHead";
import { motion, useReducedMotion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import heroImage from "@/assets/hero-landing.jpg";
import venueFootball from "@/assets/venue-football.jpg";
import venueTennis from "@/assets/venue-tennis.jpg";
import venueBasketball from "@/assets/venue-basketball.jpg";
import venueSwimming from "@/assets/venue-swimming.jpg";

/* ------------------------------------------------------------------
   Motion: one reveal, reused everywhere, and switched off wholesale
   when the visitor asks for reduced motion. A single consistent
   entrance reads as intent; a different animation per section reads
   as decoration.
------------------------------------------------------------------ */
const EASE = [0.22, 1, 0.36, 1] as const;

const reveal = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE } },
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
};

const viewportOnce = { once: true, margin: "-80px" };

/* ------------------------------------------------------------------
   Section shell. Every band shares one rhythm and one tonal step, so
   the page has a spine instead of eight independently-invented
   layouts. `invert` is used exactly once — that scarcity is what
   makes it land.
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
    <section className={`${tones[tone]} py-20 md:py-28 ${className}`} {...rest}>
      <div className="container px-5 md:px-6">{children}</div>
    </section>
  );
};

const Eyebrow = ({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <p
    className={`mb-4 font-mono text-[11px] font-medium uppercase tracking-[0.2em] text-primary ${className}`}
  >
    {children}
  </p>
);

const HomePage = () => {
  const { user } = useAuth();
  const prefersReduced = useReducedMotion();
  const [venueCount, setVenueCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    supabase
      .from("venues")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true)
      .then(({ count }) => {
        if (!cancelled) setVenueCount(count ?? 0);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Under reduced motion we render the final state outright rather than
  // animating into it, so no content depends on an animation that never runs.
  const revealProps = prefersReduced
    ? {}
    : { initial: "hidden", whileInView: "visible", viewport: viewportOnce, variants: stagger };

  const sports = [
    { name: "Football", image: venueFootball, detail: "Pitches & futsal" },
    { name: "Tennis", image: venueTennis, detail: "Clay, hard & padel" },
    { name: "Basketball", image: venueBasketball, detail: "Indoor & street" },
    { name: "Swimming", image: venueSwimming, detail: "Lanes by the hour" },
  ];

  const steps = [
    {
      icon: MapPin,
      title: "Find your court",
      body: "Filter by sport, neighbourhood and time. Every venue is verified, with real photos and the actual price.",
    },
    {
      icon: CalendarCheck,
      title: "Pick a real slot",
      body: "Availability is live, not a guess. The slot you tap is the slot you get — held for twenty minutes while you pay.",
    },
    {
      icon: CreditCard,
      title: "Pay and play",
      body: "Card or Idram, inside the app. Confirmed instantly, and the venue knows you're coming.",
    },
  ];

  return (
    <>
      <SEOHead
        title="Book sports venues in Armenia"
        description="Find and book verified sports venues near you. Live availability, instant confirmation, and secure in-app payment by card or Idram."
        jsonLd={createWebsiteJsonLd()}
      />

      {/* ============================================================
          HERO — one sentence, one action. The product is shown, not
          described: the card underneath is a real booking state.
      ============================================================ */}
      <section className="relative overflow-hidden bg-background">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-40 left-1/2 h-[560px] w-[900px] -translate-x-1/2 rounded-full bg-primary/12 blur-[130px]"
        />

        <div className="container relative px-5 pb-16 pt-14 md:px-6 md:pb-24 md:pt-20">
          <div className="grid items-center gap-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-16">
            <motion.div
              initial={prefersReduced ? undefined : "hidden"}
              animate={prefersReduced ? undefined : "visible"}
              variants={stagger}
            >
              <motion.div variants={reveal}>
                <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface-1 px-3.5 py-1.5 font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-foreground-soft">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-70" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
                  </span>
                  Live availability
                </span>
              </motion.div>

              <motion.h1
                variants={reveal}
                className="mt-6 text-balance font-display text-[clamp(2.5rem,5.2vw,4.25rem)] font-bold leading-[0.98] tracking-[-0.04em] text-foreground"
              >
                Book the court.
                <br />
                <span className="text-primary">Skip the call.</span>
              </motion.h1>

              <motion.p
                variants={reveal}
                className="mt-6 max-w-[46ch] text-[1.0625rem] leading-relaxed text-foreground-soft"
              >
                Verified sports venues across Armenia, with live availability and
                instant confirmation. Pay by card or Idram — your slot is locked
                the moment you do.
              </motion.p>

              <motion.div variants={reveal} className="mt-9 flex flex-wrap items-center gap-3">
                <Button asChild size="lg" className="h-12 rounded-xl px-6 text-[15px] font-semibold">
                  <Link to="/venues">
                    Browse venues
                    <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden="true" />
                  </Link>
                </Button>
                {/* No inset on mobile: stacked under the primary button, the
                    ghost's own padding pushed its label ~30px right of the one
                    above it and read as an accidental indent. */}
                {!user && (
                  <Button
                    asChild
                    size="lg"
                    variant="ghost"
                    className="h-12 rounded-xl px-0 text-[15px] font-semibold md:px-5"
                  >
                    <Link to="/for-owners">
                      <Building2 className="mr-2 h-4 w-4" aria-hidden="true" />
                      List your venue
                    </Link>
                  </Button>
                )}
              </motion.div>

              <motion.p
                variants={reveal}
                className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground"
              >
                <span className="inline-flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-primary" aria-hidden="true" />
                  Every venue verified
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Zap className="h-4 w-4 text-primary" aria-hidden="true" />
                  Confirmed in seconds
                </span>
              </motion.p>
            </motion.div>

            <motion.div
              initial={prefersReduced ? undefined : { opacity: 0, scale: 0.97 }}
              animate={prefersReduced ? undefined : { opacity: 1, scale: 1 }}
              transition={{ duration: 0.9, ease: EASE, delay: 0.15 }}
              className="relative"
            >
              <div className="relative overflow-hidden rounded-[1.75rem] border border-border shadow-2xl">
                <img
                  src={heroImage}
                  alt="Floodlit five-a-side pitch at dusk with players mid-game"
                  className="aspect-[4/3] w-full object-cover"
                  loading="eager"
                />
                <div
                  aria-hidden="true"
                  className="absolute inset-0 bg-gradient-to-t from-background/80 via-background/10 to-transparent"
                />
              </div>

              <div className="glass absolute -bottom-5 left-4 right-4 rounded-2xl p-4 md:left-8 md:right-8">
                <div className="flex items-center gap-3.5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
                    <Check className="h-5 w-5" strokeWidth={2.5} aria-hidden="true" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-display text-[15px] font-semibold leading-tight text-foreground">
                      Confirmed — Thursday, 19:00
                    </p>
                    <p className="mt-0.5 text-[13px] text-muted-foreground">
                      Ararat Arena · 90 min ·{" "}
                      <span className="font-mono tabular-nums">֏12,000</span>
                    </p>
                  </div>
                </div>
              </div>

              {venueCount !== null && venueCount > 0 && (
                <div className="glass absolute -top-4 right-2 hidden items-center gap-2.5 rounded-xl px-3.5 py-2.5 sm:flex md:right-6">
                  <Activity className="h-4 w-4 text-primary" aria-hidden="true" />
                  <span className="font-mono text-xs tabular-nums text-foreground">
                    {venueCount} venues live
                  </span>
                </div>
              )}
            </motion.div>
          </div>
        </div>

        {/* Search at the seam: the first thing you can actually do,
            rather than something buried below the fold. */}
        <div className="container relative px-5 pb-14 md:px-6 md:pb-20">
          <HeroSearch />
        </div>
      </section>

      {/* ============================================================
          HOW IT WORKS
      ============================================================ */}
      <Section tone="raised" aria-labelledby="how-heading">
        <motion.div {...revealProps}>
          <motion.div variants={reveal} className="max-w-2xl">
            <Eyebrow>How it works</Eyebrow>
            <h2
              id="how-heading"
              className="text-balance font-display text-[clamp(1.875rem,4vw,2.75rem)] font-bold leading-[1.05] tracking-[-0.03em] text-foreground"
            >
              Three taps between you and the game.
            </h2>
          </motion.div>

          <ol className="mt-12 grid gap-10 md:mt-14 md:grid-cols-3 md:gap-8">
            {steps.map((step, i) => (
              <motion.li key={step.title} variants={reveal}>
                <div className="mb-5 flex items-center gap-3">
                  <span className="font-mono text-sm tabular-nums text-primary">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span aria-hidden="true" className="h-px flex-1 bg-border" />
                </div>
                <step.icon
                  className="mb-4 h-6 w-6 text-primary"
                  strokeWidth={1.75}
                  aria-hidden="true"
                />
                <h3 className="font-display text-lg font-semibold tracking-tight text-foreground">
                  {step.title}
                </h3>
                <p className="mt-2.5 text-[15px] leading-relaxed text-foreground-soft">
                  {step.body}
                </p>
              </motion.li>
            ))}
          </ol>
        </motion.div>
      </Section>

      {/* ============================================================
          SPORTS — image-led, not a row of text chips.
      ============================================================ */}
      <Section aria-labelledby="sports-heading">
        <motion.div {...revealProps}>
          {/* The "see all" link rides the eyebrow row rather than bottom-aligning
              against the heading: with a two-line heading the latter left it
              floating in the middle of the block with no edge to relate to. */}
          <motion.div variants={reveal}>
            <div className="flex items-center justify-between gap-4">
              <Eyebrow className="mb-0">What you can book</Eyebrow>
              <Link
                to="/venues"
                className="group inline-flex shrink-0 items-center gap-1.5 rounded-md text-[15px] font-semibold text-primary outline-none transition-colors hover:text-primary/80 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                See all venues
                <ArrowRight
                  className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </Link>
            </div>
            <h2
              id="sports-heading"
              className="mt-4 max-w-xl text-balance font-display text-[clamp(1.875rem,4vw,2.75rem)] font-bold leading-[1.05] tracking-[-0.03em] text-foreground"
            >
              Every sport has a court. Pick yours.
            </h2>
          </motion.div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {sports.map((sport) => (
              <motion.div key={sport.name} variants={reveal}>
                <Link
                  to={`/venues?sport=${encodeURIComponent(sport.name)}`}
                  className="group relative block cursor-pointer overflow-hidden rounded-2xl border border-border outline-none transition-colors hover:border-border-strong focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  <img
                    src={sport.image}
                    alt=""
                    loading="lazy"
                    className="aspect-[4/5] w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
                  />
                  {/* Scrim weighted to the bottom third: the caption has to stay
                      legible over a bright basketball floor as well as a dark
                      pitch, and a linear scrim reaching high enough to do that
                      leaves every image looking veiled. */}
                  <div
                    aria-hidden="true"
                    className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/50 via-45% to-transparent"
                  />
                  <div className="absolute inset-x-0 bottom-0 p-4">
                    <h3 className="font-display text-lg font-semibold text-white">{sport.name}</h3>
                    <p className="mt-0.5 text-[13px] text-white/70">{sport.detail}</p>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </Section>

      {/* ============================================================
          THE DIFFERENCE — the one claim worth a whole section, shown
          as the actual booking UI rather than asserted in bullets.
      ============================================================ */}
      <Section tone="raised" aria-labelledby="lock-heading">
        <motion.div {...revealProps} className="grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
          <motion.div variants={reveal}>
            <Eyebrow>Why it's different</Eyebrow>
            <h2
              id="lock-heading"
              className="text-balance font-display text-[clamp(1.875rem,4vw,2.75rem)] font-bold leading-[1.05] tracking-[-0.03em] text-foreground"
            >
              The slot is yours the moment you pay.
            </h2>
            <p className="mt-5 max-w-[52ch] text-[1.0625rem] leading-relaxed text-foreground-soft">
              No messaging an owner and hoping. No turning up to find someone
              else on the pitch. Payment and reservation happen together, so a
              confirmed booking means exactly that.
            </p>

            <ul className="mt-8 space-y-3.5">
              {[
                "Double-booking is impossible — enforced by the database, not by trust",
                // "refunds applied automatically" was my own overstatement,
                // written into this rebuild. It holds for card payments —
                // Ameria exposes RefundPayment — but idram.ts returns
                // { ok: false, manual: true }: Idram has no refund API, so
                // those are processed by hand in the merchant cabinet. The
                // claim that survives both rails is the one about disclosure.
                "Cancellation terms shown before you pay, never discovered afterwards",
                "Card or Idram, both settled in Armenian dram",
              ].map((line) => (
                <li
                  key={line}
                  className="flex gap-3 text-[15px] leading-relaxed text-foreground-soft"
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
          </motion.div>

          <motion.div variants={reveal}>
            <div className="rounded-2xl border border-border bg-card p-5 shadow-xl md:p-6">
              <div className="flex items-baseline justify-between">
                <h3 className="font-display text-base font-semibold text-foreground">
                  Thursday, 24 July
                </h3>
                <span className="font-mono text-xs tabular-nums text-muted-foreground">90 min</span>
              </div>

              <ul className="mt-5 grid grid-cols-3 gap-2">
                {[
                  { t: "17:00", s: "taken" },
                  { t: "18:30", s: "open" },
                  { t: "19:00", s: "picked" },
                  { t: "20:30", s: "open" },
                  { t: "21:00", s: "taken" },
                  { t: "22:00", s: "open" },
                ].map(({ t, s }) => (
                  <li
                    key={t}
                    className={[
                      "rounded-lg border px-2 py-2.5 text-center font-mono text-[13px] tabular-nums",
                      s === "picked"
                        ? "border-primary bg-primary font-semibold text-primary-foreground"
                        : s === "taken"
                          ? "border-border bg-surface-3 text-muted-foreground line-through"
                          : "border-border bg-surface-2 text-foreground",
                    ].join(" ")}
                  >
                    {t}
                    <span className="sr-only">
                      {s === "picked"
                        ? " — selected"
                        : s === "taken"
                          ? " — unavailable"
                          : " — available"}
                    </span>
                  </li>
                ))}
              </ul>

              <dl className="mt-6 space-y-2.5 border-t border-border pt-5 text-[15px]">
                <div className="flex justify-between">
                  <dt className="text-foreground-soft">90 minutes</dt>
                  <dd className="font-mono tabular-nums text-foreground">֏12,000</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-foreground-soft">Service fee</dt>
                  <dd className="font-mono tabular-nums text-foreground">֏600</dd>
                </div>
                <div className="flex justify-between border-t border-border pt-3">
                  <dt className="font-display font-semibold text-foreground">Total</dt>
                  <dd className="font-mono text-lg font-semibold tabular-nums text-foreground">
                    ֏12,600
                  </dd>
                </div>
              </dl>

              {/* Status, not an action. Styled as a solid primary bar it was
                  indistinguishable from the real CTAs elsewhere on the page,
                  inviting a click on a static illustration. */}
              <p className="mt-5 flex items-center justify-center gap-2 rounded-xl border border-primary/25 bg-primary/10 py-3 text-[15px] font-semibold text-primary">
                <Check className="h-4 w-4" strokeWidth={2.5} aria-hidden="true" />
                Slot held until 20:00
              </p>
            </div>
          </motion.div>
        </motion.div>
      </Section>

      {/* ============================================================
          OWNERS — the single tonal inversion on the page. Used once,
          which is what makes it register as a different audience.
      ============================================================ */}
      <Section tone="invert" aria-labelledby="owners-heading">
        <motion.div {...revealProps} className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
          <motion.div variants={reveal}>
            <p className="mb-4 font-mono text-[11px] font-medium uppercase tracking-[0.2em] opacity-60">
              For venue owners
            </p>
            <h2
              id="owners-heading"
              className="text-balance font-display text-[clamp(1.875rem,4vw,2.75rem)] font-bold leading-[1.05] tracking-[-0.03em] text-secondary-foreground"
            >
              Fill the empty hours. Keep the paperwork out of it.
            </h2>
            <p className="mt-5 max-w-[50ch] text-[1.0625rem] leading-relaxed opacity-75">
              List once, set your hours and price, then take bookings around the
              clock. We collect payment; you get a weekly payout with every
              booking itemised.
            </p>
            <Button
              asChild
              size="lg"
              className="mt-8 h-12 rounded-xl bg-secondary-foreground px-6 text-[15px] font-semibold text-secondary hover:bg-secondary-foreground/90"
            >
              <Link to="/for-owners">
                List your venue
                <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
          </motion.div>

          <motion.dl variants={reveal} className="grid grid-cols-2 gap-4">
            {[
              { k: "Commission", v: "5%", note: "No listing fee, no monthly cost" },
              { k: "Payouts", v: "Weekly", note: "Itemised, straight to your account" },
              { k: "Setup", v: "10 min", note: "Photos, hours, price — that's it" },
              { k: "Support", v: "Direct", note: "Message players inside the app" },
            ].map(({ k, v, note }) => (
              <div key={k} className="rounded-2xl bg-secondary-foreground/5 p-5">
                <dt className="font-mono text-[11px] uppercase tracking-[0.14em] opacity-60">{k}</dt>
                <dd className="mt-2 font-display text-2xl font-bold tabular-nums">{v}</dd>
                <p className="mt-1.5 text-[13px] leading-snug opacity-65">{note}</p>
              </div>
            ))}
          </motion.dl>
        </motion.div>
      </Section>

      {/* ============================================================
          CLOSE — one action, nothing competing with it.
      ============================================================ */}
      <section className="relative overflow-hidden bg-background py-24 md:py-32">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute bottom-[-30%] left-1/2 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-primary/12 blur-[130px]"
        />
        <motion.div {...revealProps} className="container relative px-5 text-center md:px-6">
          <motion.h2
            variants={reveal}
            className="mx-auto max-w-3xl text-balance font-display text-[clamp(2rem,5vw,3.5rem)] font-bold leading-[1.02] tracking-[-0.035em] text-foreground"
          >
            Your next game is one tap away.
          </motion.h2>
          <motion.p
            variants={reveal}
            className="mx-auto mt-5 max-w-[44ch] text-[1.0625rem] leading-relaxed text-foreground-soft"
          >
            Free to join. No card needed until you book.
          </motion.p>
          <motion.div variants={reveal} className="mt-9 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg" className="h-12 rounded-xl px-7 text-[15px] font-semibold">
              <Link to={user ? "/venues" : "/signup"}>
                {user ? "Find a court" : "Get started"}
                <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="h-12 rounded-xl px-6 text-[15px] font-semibold"
            >
              <Link to="/venues">Browse first</Link>
            </Button>
          </motion.div>

          <motion.p
            variants={reveal}
            className="mt-8 inline-flex items-center gap-2 text-sm text-muted-foreground"
          >
            <Star className="h-4 w-4 fill-primary text-primary" aria-hidden="true" />
            Built for players in Yerevan — message venue owners directly
          </motion.p>
        </motion.div>
      </section>
    </>
  );
};

export default HomePage;
