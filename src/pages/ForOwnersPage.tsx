import { Link } from "react-router-dom";
import SEOHead from "@/components/seo/SEOHead";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  Calendar,
  BarChart3,
  Globe,
  Shield,
  CreditCard,
  Clock,
  Users,
  CheckCircle,
  Smartphone,
  MessageCircle,
  Settings,
  Star,
  CalendarSync,
} from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import type { MotionProps, Variants } from "framer-motion";
import Layout from "@/components/layout/Layout";
import { easeOutExpo } from "@/lib/motion";
import venueBasketball from "@/assets/venue-basketball.jpg";
import venueFootball from "@/assets/venue-football.jpg";
import venueTennis from "@/assets/venue-tennis.jpg";

/* ------------------------------------------------------------------
   Motion.

   This page already moved, on a vocabulary of its own: a private
   cubic-bezier, 800–900ms entrances and a 48px rise, with the delay
   passed in raw at the call site so a twelve-item grid dealt its last
   card 550ms after its first. Nothing switched it off for
   `prefers-reduced-motion`, so the longest animations in the app were
   also the only ones that ignored the preference.

   It now speaks the same vocabulary as the rest of the app: easing
   from lib/motion (mirroring --ease-out-expo in index.css), one
   entrance duration, a stagger expressed as an *index* so the cap
   below can apply, and props omitted wholesale under reduced motion
   rather than given a zero duration — the convention HomePage and
   DiscoverPage established.
   ------------------------------------------------------------------ */

/** An element arriving. */
const ENTER = 0.42;
/** Gap between one sibling's entrance and the next. */
const STAGGER_STEP = 0.05;
/**
 * The index past which every remaining sibling shares the last delay.
 *
 * The features grid is twelve items and the pricing list five, so this
 * is the difference between a 400ms deal and a queue whose tail lands
 * long after the reader has arrived at it.
 */
const STAGGER_CAP = 7;

const reveal: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: (index: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: ENTER,
      ease: easeOutExpo,
      delay: Math.min(index, STAGGER_CAP) * STAGGER_STEP,
    },
  }),
};

const viewportOnce = { once: true, margin: "-80px" };

const ForOwnersPage = () => {
  const prefersReduced = useReducedMotion();

  /** Above the fold: nothing to scroll to, so it plays on mount. */
  const onMount = (index = 0): MotionProps =>
    prefersReduced
      ? {}
      : { variants: reveal, initial: "hidden", animate: "visible", custom: index };

  /** Everything below: plays as it comes into view, once. */
  const onScroll = (index = 0): MotionProps =>
    prefersReduced
      ? {}
      : {
          variants: reveal,
          initial: "hidden",
          whileInView: "visible",
          viewport: viewportOnce,
          custom: index,
        };

  // The one CTA embellishment on the page: the arrow leans toward where the
  // click goes. Withheld rather than undone with a `motion-reduce:` utility,
  // which would have to out-specify the class it is cancelling. Press feedback
  // comes from the shared Button, which already scales on `:active`.
  const ctaArrow = `ml-2 h-5 w-5${
    prefersReduced ? "" : " transition-transform duration-200 ease-out group-hover:translate-x-0.5"
  }`;
  // The picture moves inside its frame; the card does not.
  const showcaseZoom = `w-full h-full object-cover${
    prefersReduced ? "" : " transition-transform duration-500 ease-out group-hover:scale-105"
  }`;

  const features = [
    {
      icon: Calendar,
      title: "Visual Schedule Management",
      description: "A weekly calendar view that shows all bookings at a glance. Drag, resize, and manage your entire schedule visually — no spreadsheets needed.",
    },
    {
      icon: CreditCard,
      title: "Instant Booking & Payments",
      description: "Players book and pay online instantly by card or Idram. We collect, then pay out to your account — no cash handling, no invoicing, no chasing.",
    },
    {
      icon: BarChart3,
      title: "Analytics Dashboard",
      description: "Track revenue, booking trends, occupancy rates, and player demographics. Data-driven decisions to grow your business.",
    },
    {
      icon: Clock,
      title: "Opening Hours & Availability",
      description: "Set flexible opening hours per day, block specific dates, and control booking windows. Your venue, your rules.",
    },
    {
      icon: Globe,
      title: "Embeddable Booking Widget",
      description: "Add a booking widget to your own website via iFrame, JavaScript snippet, or direct link. Players book without leaving your site.",
    },
    {
      icon: CalendarSync,
      title: "Calendar Sync",
      description: "Full two-way sync with Google Calendar & Outlook. Plus iCal export/import for any calendar app. Never double-book again.",
    },
    {
      icon: Settings,
      title: "Custom Policies",
      description: "Set cancellation policies, buffer times, minimum/maximum durations, grace periods, and overtime rates. Complete control.",
    },
    {
      icon: MessageCircle,
      title: "Direct Messaging",
      description: "Built-in chat with players. Quick reply templates for common questions. Never miss a customer inquiry.",
    },
    {
      icon: Smartphone,
      title: "Equipment Rentals",
      description: "List equipment available for rent — balls, rackets, gear. Players can add rentals when booking. Extra revenue, zero effort.",
    },
    {
      icon: Shield,
      title: "Verified Listings",
      description: "Every venue goes through our review process. Verified badge builds trust with players and boosts your bookings.",
    },
    {
      icon: Star,
      title: "Reviews & Ratings",
      description: "Collect authentic reviews from players after each booking. Great reviews attract more players organically.",
    },
    {
      icon: Users,
      title: "Manual Bookings",
      description: "Add walk-in or phone bookings manually. Your calendar stays accurate whether bookings come online or offline.",
    },
  ];

  // Every figure here has to be traceable to the build. "40% more bookings on
  // average" and "24/7 customer support" were placeholder claims with no
  // customers and no support rota behind them; they are replaced with the
  // payout cadence (payouts-run cron) and the settlement currency, both of
  // which are facts about the system rather than promises about outcomes.
  const stats = [
    { value: "0%", label: "Commission — you keep every dram" },
    { value: "0", label: "Monthly fees or hidden costs" },
    { value: "Weekly", label: "Payouts, every booking itemised" },
    { value: "AMD", label: "Settled in dram — card or Idram" },
  ];

  const onboardingSteps = [
    { step: "1", title: "Create your account", description: "Sign up as a venue owner in under 2 minutes. No credit card required." },
    { step: "2", title: "Add your venue", description: "Upload photos, set prices, define hours, and configure your policies." },
    { step: "3", title: "Add your payout details", description: "Your Armenian bank account or Idram wallet — that's where your earnings land." },
    // "thousands of active players" is the same unmeasured claim, in the
    // visible copy this time. What is true is that approval is a real
    // step and that the listing then appears in search and on the map.
    { step: "4", title: "Go live", description: "Once approved, your venue appears in search, on the map, and is bookable by the hour." },
  ];

  return (
    <Layout>
      <SEOHead
        /* The rule stated forty lines above — every figure traceable to the
           build — was applied to the stats block and not to this description,
           which is the copy Google actually shows. It read "Reach thousands of
           active players... increase revenue by up to 40%": the same
           placeholder claim the comment says was removed, with no customers
           and no measurement behind either half of it. Replaced with the four
           facts the stats block settled on. */
        title="List Your Sports Venue in Armenia — Sportsbnb for Owners"
        description="List your court, pitch or pool on Sportsbnb. Set your own hourly rate and cancellation terms, take card and Idram payments in dram, and keep 100% of your price. Zero commission, no listing fee, no monthly cost."
        canonical="/for-owners"
      />
      {/* ── Hero ── */}
      <section className="relative min-h-[85vh] md:min-h-screen flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0">
          <img
            src={venueFootball}
            alt="Sports venue"
            className="w-full h-full object-cover scale-105"
            loading="eager"
            fetchPriority="high"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-black/80" />
        </div>

        <div className="container relative z-10 py-20 md:py-0">
          <div className="max-w-4xl mx-auto text-center">
            <motion.p
              {...onMount()}
              className="text-sm md:text-base font-medium tracking-widest uppercase text-white/60 mb-4 md:mb-6"
            >
              For Venue Owners
            </motion.p>

            <motion.h1
              {...onMount(1)}
              className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white leading-[0.95] tracking-tighter mb-6 md:mb-8"
            >
              {/* Explicit break: left to flow, "Your venue. Our" filled line one
                  and stranded "platform." on line two, splitting the phrase in
                  the wrong place. Also brought down from text-8xl (96px) to
                  match the scale the rebuilt home page settled on. */}
              Your venue.
              <br />
              <span className="text-primary">Our platform.</span>
            </motion.h1>

            <motion.p
              {...onMount(2)}
              className="text-base md:text-xl lg:text-2xl text-white/70 leading-relaxed max-w-2xl mx-auto mb-8 md:mb-12"
            >
              Fill your courts, automate your bookings, and grow your business — with zero monthly fees.
            </motion.p>

            <motion.div
              {...onMount(3)}
              className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center"
            >
              <Button asChild size="xl" className="group w-full sm:w-auto rounded-full font-semibold shadow-2xl">
                <Link to="/list-venue">
                  List your venue free
                  <ArrowRight className={ctaArrow} />
                </Link>
              </Button>
              <Button asChild
                  variant="ghost"
                  size="xl"
                  className="w-full sm:w-auto rounded-full font-semibold text-white/90 hover:text-white hover:bg-white/10 border border-white/20"
                >
                <Link to="/contact">Talk to our team</Link>
              </Button>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── Stats ── */}
      <section className="py-16 md:py-24 bg-background border-b border-border/50">
        <div className="container">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5 md:gap-6 max-w-4xl mx-auto">
            {stats.map((stat, index) => (
              <motion.div key={stat.label} {...onScroll(index)} className="text-center">
                {/* Sized down from lg:text-6xl: the band was built for short
                    numerals, and a word-length value ("Weekly") ran straight
                    into its neighbour at 60px. The dram sign also left the
                    value slot — U+058F has no coverage in either bundled font,
                    so it is not a glyph to hang a headline number on. */}
                <p className="mb-2 text-3xl font-bold tracking-tighter text-primary md:text-4xl lg:text-5xl">
                  {stat.value}
                </p>
                <p className="text-sm md:text-base text-muted-foreground">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── All Features ── */}
      <section className="py-16 md:py-24 bg-background">
        <div className="container">
          <motion.div {...onScroll()} className="text-center mb-10 md:mb-14">
            <p className="text-sm font-semibold text-primary tracking-widest uppercase mb-3 md:mb-4">
              Everything You Need
            </p>
            <h2 className="text-3xl md:text-5xl lg:text-7xl font-bold text-foreground tracking-tighter mb-4 md:mb-6">
              Powerful tools,<br className="hidden md:block" /> zero complexity.
            </h2>
            <p className="text-base md:text-xl text-muted-foreground max-w-xl mx-auto">
              One dashboard to manage your entire sports facility business.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 max-w-6xl mx-auto">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={feature.title}
                  {...onScroll(index)}
                  className="group bg-muted/20 hover:bg-muted/40 transition-colors rounded-2xl md:rounded-3xl p-5 md:p-6"
                >
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-5">
                    <Icon className="h-6 w-6" strokeWidth={1.5} />
                  </div>
                  <h3 className="text-lg md:text-xl font-semibold text-foreground mb-2 tracking-tight">{feature.title}</h3>
                  <p className="text-sm md:text-base text-muted-foreground leading-relaxed">{feature.description}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Pricing Model ── */}
      <section className="surface-invert py-16 md:py-24 bg-secondary">
        <div className="container">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-24 items-center max-w-6xl mx-auto">
            <motion.div {...onScroll()}>
              <p className="text-sm font-semibold text-primary tracking-widest uppercase mb-3 md:mb-4">
                Simple & Transparent
              </p>
              <h2 className="text-3xl md:text-5xl lg:text-6xl font-bold text-secondary-foreground tracking-tighter leading-[1.05] mb-5 md:mb-8">
                Zero commission.<br />Ever.
              </h2>
              <p className="text-base md:text-xl text-secondary-foreground/70 leading-relaxed mb-8">
                Sportsbnb takes no cut of your bookings. Not a percentage, not a listing fee, not a monthly subscription — you set a price, the player pays it, and all of it is yours.
              </p>
              <div className="space-y-4">
                {[
                  "You set your own prices — we add nothing on top",
                  "You receive 100% of every booking, down to the dram",
                  "Players pay exactly the price they see — no surprises",
                  "Weekly payouts to your bank account or Idram wallet",
                  "No minimum commitment — cancel anytime",
                ].map((item, i) => (
                  <motion.div key={i} {...onScroll(i)} className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" strokeWidth={1.5} />
                    <span className="text-secondary-foreground/80 text-sm md:text-base">{item}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            <motion.div {...onScroll(1)} className="bg-secondary-foreground/5 rounded-3xl p-8 md:p-12 text-center">
              <p className="text-secondary-foreground/60 text-sm font-medium uppercase tracking-widest mb-4">Commission</p>
              <p className="text-6xl md:text-8xl font-bold text-primary tracking-tighter mb-2">0%</p>
              <p className="text-secondary-foreground/70 text-base md:text-lg mb-8">on every booking — you keep the lot</p>
              <div className="border-t border-secondary-foreground/10 pt-6 space-y-3">
                <div className="flex justify-between text-sm md:text-base">
                  <span className="text-secondary-foreground/60">Monthly fee</span>
                  <span className="text-secondary-foreground font-semibold">֏0</span>
                </div>
                <div className="flex justify-between text-sm md:text-base">
                  <span className="text-secondary-foreground/60">Setup fee</span>
                  <span className="text-secondary-foreground font-semibold">֏0</span>
                </div>
                <div className="flex justify-between text-sm md:text-base">
                  <span className="text-secondary-foreground/60">Hidden costs</span>
                  <span className="text-secondary-foreground font-semibold">֏0</span>
                </div>
              </div>
              <Button asChild size="lg" className="group mt-8 w-full rounded-full font-semibold">
                <Link to="/list-venue">
                  Get started free
                  <ArrowRight className={ctaArrow} />
                </Link>
              </Button>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── How to Get Started ── */}
      <section className="py-16 md:py-24 bg-background">
        <div className="container">
          <motion.div {...onScroll()} className="text-center mb-10 md:mb-14">
            <p className="text-sm font-semibold text-primary tracking-widest uppercase mb-3 md:mb-4">
              Getting Started
            </p>
            <h2 className="text-3xl md:text-5xl lg:text-7xl font-bold text-foreground tracking-tighter mb-4 md:mb-6">
              Live in 4 simple steps.
            </h2>
            <p className="text-base md:text-xl text-muted-foreground max-w-xl mx-auto">
              From sign-up to your first booking in under 10 minutes.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-4 gap-5 md:gap-6 max-w-5xl mx-auto">
            {onboardingSteps.map((item, index) => (
              <motion.div key={item.step} {...onScroll(index)} className="text-center">
                <div className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-primary text-primary-foreground text-xl md:text-2xl font-bold flex items-center justify-center mx-auto mb-5 md:mb-6">
                  {item.step}
                </div>
                <h3 className="text-lg md:text-xl font-semibold text-foreground mb-2 tracking-tight">{item.title}</h3>
                <p className="text-sm md:text-base text-muted-foreground leading-relaxed">{item.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Showcase Image ── */}
      <section className="py-16 md:py-24 bg-muted/20 overflow-hidden">
        <div className="container">
          <motion.div {...onScroll()} className="text-center mb-10 md:mb-14">
            <h2 className="text-3xl md:text-5xl lg:text-7xl font-bold text-foreground tracking-tighter">
              Built for facilities<br className="hidden md:block" /> <span className="text-primary">of every size.</span>
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-4 md:gap-6 max-w-6xl mx-auto">
            {[
              { img: venueFootball, label: "Football Fields" },
              { img: venueTennis, label: "Tennis & Padel Courts" },
              { img: venueBasketball, label: "Multi-Sport Complexes" },
            ].map((item, index) => (
              <motion.div key={item.label} {...onScroll(index)} className="relative aspect-[4/5] rounded-2xl md:rounded-3xl overflow-hidden group">
                <img src={item.img} alt={item.label} loading="lazy" decoding="async" className={showcaseZoom} />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-5 md:p-8">
                  <h3 className="text-white text-lg md:text-2xl font-semibold tracking-tight">{item.label}</h3>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="surface-invert py-16 md:py-24 bg-secondary">
        <div className="container">
          <motion.div {...onScroll()} className="max-w-3xl mx-auto text-center">
            <p className="text-sm font-semibold text-primary tracking-widest uppercase mb-3 md:mb-4">
              Partnership
            </p>
            <h2 className="text-3xl md:text-5xl lg:text-7xl font-bold text-secondary-foreground tracking-tighter mb-5 md:mb-8">
              Let's grow<br />together.
            </h2>
            <p className="text-base md:text-xl text-secondary-foreground/60 mb-8 md:mb-12 max-w-lg mx-auto leading-relaxed">
              We're not just a booking platform — we're your growth partner. More visibility, more players, more revenue. No risk, no commitment.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
              <Button asChild size="xl" className="group w-full sm:w-auto rounded-full font-semibold">
                <Link to="/list-venue">
                  List your venue free
                  <ArrowRight className={ctaArrow} />
                </Link>
              </Button>
              <Button asChild
                  variant="secondaryOutline"
                  size="xl"
                  className="w-full sm:w-auto rounded-full font-semibold"
                >
                <Link to="/contact">Contact partnerships</Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>
    </Layout>
  );
};

export default ForOwnersPage;
