import { Link } from "react-router-dom";
import SEOHead from "@/components/seo/SEOHead";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  Building,
  Calendar,
  BarChart3,
  Globe,
  Shield,
  CreditCard,
  Clock,
  Users,
  CheckCircle,
  Smartphone,
  Zap,
  MessageCircle,
  Settings,
  Star,
  TrendingUp,
  Code,
  CalendarSync,
} from "lucide-react";
import { motion } from "framer-motion";
import Layout from "@/components/layout/Layout";
import venueBasketball from "@/assets/venue-basketball.jpg";
import venueFootball from "@/assets/venue-football.jpg";
import venueTennis from "@/assets/venue-tennis.jpg";

const ease = [0.25, 0.1, 0.25, 1] as const;

const fadeUp = {
  initial: { opacity: 0, y: 48 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-120px" } as const,
  transition: { duration: 0.9, ease },
};

const stagger = (delay: number) => ({
  ...fadeUp,
  transition: { duration: 0.8, ease, delay },
});

const ForOwnersPage = () => {
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

  const stats = [
    { value: "40%", label: "More bookings on average" },
    { value: "5%", label: "Simple platform commission" },
    { value: "0", label: "Monthly fees or hidden costs" },
    { value: "24/7", label: "Customer support" },
  ];

  const onboardingSteps = [
    { step: "1", title: "Create your account", description: "Sign up as a venue owner in under 2 minutes. No credit card required." },
    { step: "2", title: "Add your venue", description: "Upload photos, set prices, define hours, and configure your policies." },
    { step: "3", title: "Add your payout details", description: "Your Armenian bank account or Idram wallet — that's where your earnings land." },
    { step: "4", title: "Go live", description: "Once approved, your venue is visible to thousands of active players." },
  ];

  const testimonials = [
    {
      quote: "We went from managing bookings on paper to a fully automated system. Revenue is up 35% in three months.",
      name: "Arena Sports Complex",
      role: "Football & Basketball Venue",
    },
    {
      quote: "The calendar sync alone saves us hours every week. Our staff can focus on the facility instead of phone calls.",
      name: "City Tennis Club",
      role: "Tennis & Padel Venue",
    },
    {
      quote: "The booking widget on our website has been a game-changer. Players book directly without any friction.",
      name: "Olympic Swimming Center",
      role: "Aquatics Facility",
    },
  ];

  return (
    <Layout>
      <SEOHead
        title="List Your Sports Venue — Grow Revenue"
        description="List your sports facility on Sportsbnb. Reach thousands of active players, automate bookings, and increase revenue by up to 40%. Free to get started."
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
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease, delay: 0.2 }}
              className="text-sm md:text-base font-medium tracking-widest uppercase text-white/60 mb-4 md:mb-6"
            >
              For Venue Owners
            </motion.p>

            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease, delay: 0.35 }}
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
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease, delay: 0.55 }}
              className="text-base md:text-xl lg:text-2xl text-white/70 leading-relaxed max-w-2xl mx-auto mb-8 md:mb-12"
            >
              Fill your courts, automate your bookings, and grow your business — with zero monthly fees.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease, delay: 0.7 }}
              className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center"
            >
              <Link to="/list-venue">
                <Button size="xl" className="w-full sm:w-auto rounded-full font-semibold shadow-2xl">
                  List your venue free
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link to="/contact">
                <Button
                  variant="ghost"
                  size="xl"
                  className="w-full sm:w-auto rounded-full font-semibold text-white/90 hover:text-white hover:bg-white/10 border border-white/20"
                >
                  Talk to our team
                </Button>
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── Stats ── */}
      <section className="py-16 md:py-24 bg-background border-b border-border/50">
        <div className="container">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5 md:gap-6 max-w-4xl mx-auto">
            {stats.map((stat, index) => (
              <motion.div key={stat.label} {...stagger(index * 0.1)} className="text-center">
                <p className="text-3xl md:text-5xl lg:text-6xl font-bold text-primary tracking-tighter mb-2">{stat.value}</p>
                <p className="text-sm md:text-base text-muted-foreground">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── All Features ── */}
      <section className="py-16 md:py-24 bg-background">
        <div className="container">
          <motion.div {...fadeUp} className="text-center mb-10 md:mb-14">
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
                  {...stagger(index * 0.05)}
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
      <section className="py-16 md:py-24 bg-secondary">
        <div className="container">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-24 items-center max-w-6xl mx-auto">
            <motion.div {...fadeUp}>
              <p className="text-sm font-semibold text-primary tracking-widest uppercase mb-3 md:mb-4">
                Simple & Transparent
              </p>
              <h2 className="text-3xl md:text-5xl lg:text-6xl font-bold text-secondary-foreground tracking-tighter leading-[1.05] mb-5 md:mb-8">
                No monthly fees.<br />Ever.
              </h2>
              <p className="text-base md:text-xl text-secondary-foreground/70 leading-relaxed mb-8">
                We only succeed when you do. Sportsbnb charges a simple 5% commission on each booking — that's it. No setup fees, no subscriptions, no hidden costs.
              </p>
              <div className="space-y-4">
                {[
                  "You set your own prices — we add 5% on top for the player",
                  "You receive 100% of your listed price — the 5% is what the player pays on top",
                  "Players see the final price upfront — no surprises",
                  "Weekly payouts to your bank account or Idram wallet",
                  "No minimum commitment — cancel anytime",
                ].map((item, i) => (
                  <motion.div key={i} {...stagger(i * 0.08)} className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" strokeWidth={1.5} />
                    <span className="text-secondary-foreground/80 text-sm md:text-base">{item}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            <motion.div {...stagger(0.2)} className="bg-secondary-foreground/5 rounded-3xl p-8 md:p-12 text-center">
              <p className="text-secondary-foreground/60 text-sm font-medium uppercase tracking-widest mb-4">Commission</p>
              <p className="text-6xl md:text-8xl font-bold text-primary tracking-tighter mb-2">5%</p>
              <p className="text-secondary-foreground/70 text-base md:text-lg mb-8">per booking, paid by the player</p>
              <div className="border-t border-secondary-foreground/10 pt-6 space-y-3">
                <div className="flex justify-between text-sm md:text-base">
                  <span className="text-secondary-foreground/60">Monthly fee</span>
                  <span className="text-secondary-foreground font-semibold">$0</span>
                </div>
                <div className="flex justify-between text-sm md:text-base">
                  <span className="text-secondary-foreground/60">Setup fee</span>
                  <span className="text-secondary-foreground font-semibold">$0</span>
                </div>
                <div className="flex justify-between text-sm md:text-base">
                  <span className="text-secondary-foreground/60">Hidden costs</span>
                  <span className="text-secondary-foreground font-semibold">$0</span>
                </div>
              </div>
              <Link to="/list-venue" className="block mt-8">
                <Button size="lg" className="w-full rounded-full font-semibold">
                  Get started free
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── How to Get Started ── */}
      <section className="py-16 md:py-24 bg-background">
        <div className="container">
          <motion.div {...fadeUp} className="text-center mb-10 md:mb-14">
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
              <motion.div key={item.step} {...stagger(index * 0.12)} className="text-center">
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
          <motion.div {...fadeUp} className="text-center mb-10 md:mb-14">
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
              <motion.div key={item.label} {...stagger(index * 0.12)} className="relative aspect-[4/5] rounded-2xl md:rounded-3xl overflow-hidden group">
                <img src={item.img} alt={item.label} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-5 md:p-8">
                  <h3 className="text-white text-lg md:text-2xl font-semibold tracking-tight">{item.label}</h3>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section className="py-16 md:py-24 bg-background">
        <div className="container">
          <motion.div {...fadeUp} className="text-center mb-10 md:mb-14">
            <p className="text-sm font-semibold text-primary tracking-widest uppercase mb-3 md:mb-4">
              Trusted by Venues
            </p>
            <h2 className="text-3xl md:text-5xl lg:text-7xl font-bold text-foreground tracking-tighter">
              What owners say.
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-4 md:gap-6 max-w-5xl mx-auto">
            {testimonials.map((t, index) => (
              <motion.div
                key={t.name}
                {...stagger(index * 0.12)}
                className="bg-muted/20 rounded-2xl md:rounded-3xl p-6 md:p-10 flex flex-col"
              >
                <div className="flex gap-1 mb-4 md:mb-6">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 md:h-5 md:w-5 fill-primary text-primary" />
                  ))}
                </div>
                <p className="text-foreground text-sm md:text-lg leading-relaxed mb-6 md:mb-8 flex-1">
                  "{t.quote}"
                </p>
                <div>
                  <p className="font-semibold text-foreground text-sm md:text-base">{t.name}</p>
                  <p className="text-muted-foreground text-xs md:text-sm">{t.role}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Partnership CTA ── */}
      <section className="py-16 md:py-24 bg-secondary">
        <div className="container">
          <motion.div {...fadeUp} className="max-w-3xl mx-auto text-center">
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
              <Link to="/list-venue">
                <Button size="xl" className="w-full sm:w-auto rounded-full font-semibold">
                  List your venue free
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link to="/contact">
                <Button
                  variant="secondaryOutline"
                  size="xl"
                  className="w-full sm:w-auto rounded-full font-semibold"
                >
                  Contact partnerships
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </Layout>
  );
};

export default ForOwnersPage;
