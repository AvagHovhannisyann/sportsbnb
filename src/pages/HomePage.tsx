import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import {
  ArrowRight, Search, Calendar, Users, Building, CheckCircle, Shield, Star,
  Zap, Target, Eye, Heart, Sparkles, Globe, MapPin, Trophy, Bell, Clock,
  BarChart3, Image, Gamepad2, MessageCircle, CreditCard, Repeat, Layers,
  Bot, Wifi, Map, UserPlus, Award, TrendingUp, Split, Flame, CloudSun,
  GitCompare, UserCircle, BrainCircuit, Swords, Activity, Lock, Play,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useRegion } from "@/hooks/useRegion";
import { supabase } from "@/integrations/supabase/client";
import HeroSearch from "@/components/home/HeroSearch";
import NearbyPlayers from "@/components/home/NearbyPlayers";
import SEOHead, { createWebsiteJsonLd } from "@/components/seo/SEOHead";
import { motion } from "framer-motion";
import heroImage from "@/assets/hero-landing.jpg";
import venueFootball from "@/assets/venue-football.jpg";
import venueTennis from "@/assets/venue-tennis.jpg";
import venueBasketball from "@/assets/venue-basketball.jpg";
import venueSwimming from "@/assets/venue-swimming.jpg";

const fadeUp = {
  hidden: { opacity: 0, y: 32 },
  visible: { opacity: 1, y: 0 },
};

const staggerContainer = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
};

const sectionTransition = { duration: 0.6, ease: [0.25, 0.1, 0.25, 1] as const };

const HomePage = () => {
  const { user, isLoading } = useAuth();
  const { isArmenia, isUS, regionLabel } = useRegion();

  const [stats, setStats] = useState<{ value: string; label: string }[]>([]);
  const [statsLoaded, setStatsLoaded] = useState(false);

  useEffect(() => {
    const fetchStats = async () => {
      const [venuesRes, gamesRes, teamsRes, ratingsRes] = await Promise.all([
        supabase.from("venues").select("id", { count: "exact", head: true }).eq("is_active", true),
        supabase.from("games").select("id", { count: "exact", head: true }),
        supabase.from("teams").select("id", { count: "exact", head: true }),
        supabase.from("venues").select("rating").eq("is_active", true).gt("rating", 0),
      ]);
      const venueCount = venuesRes.count ?? 0;
      const gameCount = gamesRes.count ?? 0;
      const teamCount = teamsRes.count ?? 0;
      const ratings = ratingsRes.data ?? [];
      const avgRating = ratings.length > 0
        ? (ratings.reduce((sum, v) => sum + Number(v.rating), 0) / ratings.length).toFixed(1)
        : null;
      const next: { value: string; label: string }[] = [];
      if (venueCount > 0) next.push({ value: venueCount.toString(), label: "Venues Listed" });
      if (gameCount > 0) next.push({ value: gameCount.toString(), label: "Games Created" });
      if (teamCount > 0) next.push({ value: teamCount.toString(), label: "Teams Formed" });
      if (avgRating) next.push({ value: `${avgRating}★`, label: "Average Rating" });
      setStats(next);
      setStatsLoaded(true);
    };
    fetchStats();
  }, []);

  const howItWorks = [
    { icon: Search, title: "Find Your Venue", description: "Browse verified facilities with real-time availability and transparent pricing.", step: "01" },
    { icon: Calendar, title: "Book Instantly", description: "Reserve your slot in seconds with secure payment — no phone calls needed.", step: "02" },
    { icon: Users, title: "Play Together", description: "Join open games, create teams, and grow your sports network effortlessly.", step: "03" },
  ];

  const forOwners = [
    { icon: Building, title: "List Your Venue", description: "Reach active players searching for facilities in your area." },
    { icon: BarChart3, title: "Smart Dashboard", description: "One place for schedule, pricing, analytics, and customer management." },
    { icon: TrendingUp, title: "Grow Revenue", description: "Fill empty time slots automatically and increase your bookings." },
  ];

  const benefits = [
    { icon: Zap, title: "Instant Booking", desc: "Pick a slot, pay in-app, and your court is locked in seconds." },
    { icon: Shield, title: "Verified Owners", desc: "Every venue listing is reviewed before going live." },
    { icon: Star, title: "Real Reviews", desc: "Ratings come from players who actually booked and played." },
    { icon: Users, title: "Find Teammates", desc: "Join open games and connect with players near you." },
    { icon: Calendar, title: "Live Availability", desc: "See up-to-date open slots from venue owners." },
    { icon: Bot, title: "Smart Recommendations", desc: "Suggestions based on your sport and location." },
  ];

  const [featuredVenues, setFeaturedVenues] = useState([
    { name: "Football", image: venueFootball, count: "—" },
    { name: "Tennis", image: venueTennis, count: "—" },
    { name: "Basketball", image: venueBasketball, count: "—" },
    { name: "Swimming", image: venueSwimming, count: "—" },
  ]);

  useEffect(() => {
    const fetchCategoryCounts = async () => {
      const sports = ["Football", "Tennis", "Basketball", "Swimming"];
      const images = [venueFootball, venueTennis, venueBasketball, venueSwimming];
      const results = await Promise.all(
        sports.map((sport) =>
          supabase.from("venues").select("id", { count: "exact", head: true }).eq("is_active", true).contains("sports", [sport])
        )
      );
      setFeaturedVenues(
        sports.map((sport, i) => ({
          name: sport,
          image: images[i],
          count: (results[i].count ?? 0) > 0 ? `${results[i].count} venues` : "",
        }))
      );
    };
    fetchCategoryCounts();
  }, []);

  const [testimonials, setTestimonials] = useState<{name: string; text: string; rating: number}[]>([]);

  useEffect(() => {
    const fetchReviews = async () => {
      const { data } = await supabase
        .from("reviews")
        .select("comment, rating, user_id")
        .gte("rating", 4)
        .not("comment", "is", null)
        .order("created_at", { ascending: false })
        .limit(3);
      if (data && data.length > 0) {
        const profileIds = data.map((r) => r.user_id);
        const { data: profiles } = await supabase
          .from("profiles_public")
          .select("user_id, full_name")
          .in("user_id", profileIds);
        const profileMap: Record<string, string> = {};
        (profiles ?? []).forEach((p) => { if (p.user_id) profileMap[p.user_id] = p.full_name || "Player"; });
        setTestimonials(
          data.map((r) => ({
            name: profileMap[r.user_id] || "Player",
            text: r.comment!,
            rating: r.rating,
          }))
        );
      }
    };
    fetchReviews();
  }, []);

  const featureGroups = [
    {
      eyebrow: "Find & Book",
      title: "Discover venues in seconds",
      description: "Search verified venues and reach the owner instantly — no calls, no friction.",
      items: [
        { icon: Search, label: "Smart Search" },
        { icon: CreditCard, label: "Secure In-App Payment" },
        { icon: Shield, label: "Verified Venues" },
        { icon: Map, label: "Interactive Map" },
      ],
    },
    {
      eyebrow: "Play & Connect",
      title: "Find your team, join a game",
      description: "Open games, teams, and chat — built so you spend more time playing.",
      items: [
        { icon: Gamepad2, label: "Open Games" },
        { icon: Users, label: "Teams" },
        { icon: MessageCircle, label: "Chat" },
        { icon: UserCircle, label: "Player Profiles" },
      ],
    },
    {
      eyebrow: "For Owners",
      title: "Run your venue like a pro",
      description: "One cockpit for leads, listing health, and growth — zero commissions.",
      items: [
        { icon: Building, label: "Owner Dashboard" },
        { icon: Bell, label: "Lead Inbox" },
        { icon: BarChart3, label: "Analytics" },
        { icon: Activity, label: "Listing Health" },
      ],
    },
    {
      eyebrow: "Smart Features",
      title: "Powered by AI",
      description: "Recommendations, matchmaking, and coaching that actually understand the game.",
      items: [
        { icon: Sparkles, label: "AI Recommendations" },
        { icon: Bot, label: "Matchmaking" },
        { icon: CloudSun, label: "Weather" },
        { icon: BrainCircuit, label: "AI Coach" },
      ],
    },
  ];

  return (
    <div className="flex flex-col">
      <SEOHead
        canonical="/"
        jsonLd={[
          createWebsiteJsonLd(),
          {
            "@context": "https://schema.org",
            "@type": "Organization",
            name: "Sportsbnb",
            url: "https://www.sportsbnb.org",
            logo: "https://www.sportsbnb.org/favicon.png",
            sameAs: [],
          },
        ]}
      />
      <Helmet>
        <link rel="preload" as="image" href={heroImage} />
      </Helmet>

      {/* ── Hero — asymmetric split, editorial ── */}
      <section className="relative overflow-hidden bg-background pt-8 md:pt-10">
        {/* radial accent */}
        <div className="absolute inset-x-0 top-0 h-[60%] bg-radial-fade pointer-events-none" />

        <div className="container relative">
          <div className="grid lg:grid-cols-12 gap-8 lg:gap-12 items-end pt-10 md:pt-16 pb-10 md:pb-14">
            {/* LEFT — Headline + meta */}
            <div className="lg:col-span-7 relative">
              <motion.div
                initial="hidden"
                animate="visible"
                variants={staggerContainer}
                transition={{ staggerChildren: 0.1, delayChildren: 0.1 }}
              >
                <motion.div variants={fadeUp} transition={sectionTransition} className="mb-7 md:mb-9 flex items-center gap-3">
                  <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-foreground-soft shadow-xs">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                    Instant booking · Pay in-app
                  </span>
                  <span className="hidden sm:inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Star className="h-3.5 w-3.5 fill-warning text-warning" />
                    Loved by local players
                  </span>
                </motion.div>

                <motion.h1
                  variants={fadeUp}
                  transition={sectionTransition}
                  className="font-display text-[2.25rem] xs:text-[2.5rem] sm:text-6xl md:text-7xl lg:text-[5.75rem] leading-[0.95] sm:leading-[0.92] font-bold text-foreground tracking-tightest text-balance mb-5 md:mb-8"
                >
                  Find a court.{" "}
                  <span className="relative inline-block">
                    <span className="relative z-10 italic font-medium text-primary">Play today.</span>
                    <span className="absolute bottom-1.5 left-0 right-0 h-3 md:h-4 bg-primary/15 -z-0 rounded-sm" />
                  </span>
                  <br />
                  <span className="text-foreground-soft">No phone calls.</span>
                </motion.h1>

                <motion.p
                  variants={fadeUp}
                  transition={sectionTransition}
                  className="text-base md:text-lg text-foreground-soft leading-relaxed max-w-xl mb-9 md:mb-11"
                >
                  Browse verified sports venues, see live availability, and lock in your slot with
                  secure in-app payment — card or Idram. Built for players who'd rather play than schedule.
                </motion.p>

                <motion.div
                  variants={fadeUp}
                  transition={sectionTransition}
                  className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-10 md:mb-14"
                >
                  <Link to="/venues" className="w-full sm:w-auto">
                    <Button size="xl" className="w-full sm:w-auto gap-2 shadow-lg hover:shadow-xl">
                      Browse venues
                      <ArrowRight className="h-5 w-5" />
                    </Button>
                  </Link>
                  <Link to="/for-owners" className="w-full sm:w-auto">
                    <Button size="xl" variant="ghost" className="w-full sm:w-auto text-foreground-soft hover:text-foreground sm:variant-outline">
                      <Building className="h-5 w-5" />
                      I'm a venue owner
                    </Button>
                  </Link>
                </motion.div>

                {/* Inline social proof */}
                <motion.div
                  variants={fadeUp}
                  transition={sectionTransition}
                  className="flex items-center gap-5"
                >
                  <div className="flex -space-x-2.5">
                    {[venueFootball, venueTennis, venueBasketball].map((src, i) => (
                      <div
                        key={i}
                        className="h-9 w-9 rounded-full border-2 border-background overflow-hidden bg-surface-3"
                      >
                        <img src={src} alt="" className="w-full h-full object-cover" loading="lazy" />
                      </div>
                    ))}
                  </div>
                  <div>
                    <div className="flex items-center gap-1 mb-0.5">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="h-3.5 w-3.5 fill-warning text-warning" />
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Built for players in your city — message owners directly.
                    </p>
                  </div>
                </motion.div>
              </motion.div>
            </div>

            {/* RIGHT — Photo collage with floating cards (desktop/tablet only — saves mobile fold) */}
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.7, ease: [0.25, 0.1, 0.25, 1] }}
              className="hidden lg:block lg:col-span-5 relative h-[640px]"
            >
              {/* main photo */}
              <div className="absolute inset-0 rounded-[2rem] overflow-hidden shadow-2xl border border-border">
                <img
                  src={heroImage}
                  alt="Athletes playing on a modern sports court at golden hour"
                  className="w-full h-full object-cover"
                  loading="eager"
                  fetchPriority="high"
                />
                <div className="absolute inset-0 bg-gradient-to-tr from-secondary/40 via-transparent to-transparent" />
              </div>

              {/* secondary tile (asymmetric overlap) */}
              <div className="hidden sm:block absolute -left-8 lg:-left-14 bottom-10 w-44 lg:w-52 aspect-[3/4] rounded-2xl overflow-hidden shadow-xl border-4 border-background rotate-[-4deg]">
                <img src={venueTennis} alt="Tennis court" className="w-full h-full object-cover" loading="lazy" />
              </div>

              {/* Floating availability card */}
              <div className="absolute top-6 -left-4 lg:-left-10 bg-card border border-border rounded-2xl shadow-xl p-3.5 pr-5 flex items-center gap-3 max-w-[260px]">
                <div className="h-9 w-9 rounded-xl bg-primary-soft text-primary flex items-center justify-center shrink-0">
                  <Activity className="h-4 w-4" strokeWidth={2.25} />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Real-time</p>
                  <p className="text-sm font-semibold text-foreground truncate">Live availability, no calls</p>
                </div>
              </div>

              {/* Floating booking-confirmed card */}
              <div className="glass absolute bottom-8 -right-3 lg:-right-8 rounded-2xl p-3.5 pr-5 flex items-center gap-3 max-w-[280px]">
                <div className="h-10 w-10 rounded-xl bg-primary-soft text-primary flex items-center justify-center shrink-0">
                  <CheckCircle className="h-5 w-5" strokeWidth={2.25} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground leading-tight">Booking confirmed — 19:00</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Paid <span className="stat-numeral">֏8,400</span> · just now</p>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Search bar — overlaps tonal switch */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="relative mt-2 mb-8 md:mb-0 md:-mb-16 z-20"
          >
            <HeroSearch />
          </motion.div>
        </div>
      </section>

      {/* ── Stats strip — only when we have real data ── */}
      {stats.length > 0 && (
        <section className="bg-surface-1 border-y border-border pt-20 md:pt-24 pb-10 md:pb-14">
          <div className="container">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeUp}
              transition={sectionTransition}
              className={`grid gap-y-8 md:divide-x md:divide-border ${
                stats.length === 1 ? "grid-cols-1" :
                stats.length === 2 ? "grid-cols-2" :
                stats.length === 3 ? "grid-cols-2 md:grid-cols-3" :
                "grid-cols-2 md:grid-cols-4"
              }`}
            >
              {stats.map((stat, i) => (
                <div
                  key={stat.label}
                  className={`md:px-8 ${i === 0 ? "md:pl-0" : ""} ${i === stats.length - 1 ? "md:pr-0" : ""}`}
                >
                  <p className="font-display text-4xl md:text-5xl lg:text-6xl font-bold text-foreground tracking-tightest leading-none">
                    {stat.value}
                  </p>
                  <p className="text-xs md:text-sm text-muted-foreground mt-2 font-medium uppercase tracking-wider">
                    {stat.label}
                  </p>
                </div>
              ))}
            </motion.div>
          </div>
        </section>
      )}

      {/* ── Categories — asymmetric bento ── */}
      <section className="py-24 md:py-36 bg-background">
        <div className="container">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={staggerContainer}
          >
            <motion.div
              variants={fadeUp}
              transition={sectionTransition}
              className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-10 md:mb-14"
            >
              <div className="max-w-2xl">
                <p className="text-eyebrow mb-3">Browse by sport</p>
                <h2 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold text-foreground tracking-tightest leading-[1.02] text-balance">
                  Every sport has a court.{" "}
                  <span className="text-foreground-soft italic font-medium">Pick yours.</span>
                </h2>
              </div>
              <Link
                to="/venues"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-foreground hover:text-primary transition-colors group self-start md:self-end shrink-0"
              >
                See all venues
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </motion.div>

            <motion.div
              variants={fadeUp}
              transition={sectionTransition}
              className="grid grid-cols-2 md:grid-cols-6 md:grid-rows-2 gap-3 md:gap-4 md:h-[520px]"
            >
              {featuredVenues.map((venue, i) => {
                // Bento sizing: tile 0 = wide+tall, 1 = tall, 2 = wide, 3 = small
                const span = [
                  "md:col-span-3 md:row-span-2",
                  "md:col-span-3 md:row-span-1",
                  "md:col-span-2 md:row-span-1",
                  "md:col-span-1 md:row-span-1",
                ][i];
                return (
                  <Link
                    key={venue.name}
                    to="/venues"
                    className={`group relative overflow-hidden rounded-2xl block ${span} ${i > 1 ? "aspect-[3/4] md:aspect-auto" : "aspect-[4/5] md:aspect-auto"}`}
                  >
                    <img
                      src={venue.image}
                      alt={`${venue.name} venues on Sportsbnb`}
                      className="w-full h-full object-cover group-hover:scale-[1.06] transition-transform duration-700 ease-out"
                      loading="lazy"
                      decoding="async"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
                    <div className="absolute inset-0 ring-1 ring-inset ring-white/10 rounded-2xl" />
                    <div className="absolute bottom-0 left-0 right-0 p-4 md:p-6 flex items-end justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="font-display font-semibold text-white text-lg md:text-2xl tracking-extra-tight leading-tight">
                          {venue.name}
                        </h3>
                        {venue.count && <p className="text-white/65 text-xs md:text-sm mt-1 font-medium">{venue.count}</p>}
                      </div>
                      <span className="hidden md:inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-foreground translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all">
                        <ArrowRight className="h-4 w-4" />
                      </span>
                    </div>
                  </Link>
                );
              })}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ── How It Works — left-aligned editorial ── */}
      <section className="py-24 md:py-36 section-tinted border-y border-border">
        <div className="container">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={staggerContainer}
            className="grid lg:grid-cols-12 gap-10 lg:gap-16"
          >
            <motion.div variants={fadeUp} transition={sectionTransition} className="lg:col-span-5 lg:sticky lg:top-28 lg:self-start">
              <p className="text-eyebrow mb-3">How it works</p>
              <h2 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold text-foreground tracking-tightest leading-[1.02] mb-5 md:mb-6 text-balance">
                Three taps,<br />
                <span className="text-foreground-soft italic font-medium">one game.</span>
              </h2>
              <p className="text-base md:text-lg text-foreground-soft leading-relaxed mb-8 max-w-md">
                Skip the calls, the screenshots, and the group-chat back-and-forth. Sportsbnb is built for the way players actually book.
              </p>
              <Link to="/venues">
                <Button size="lg" className="gap-2">
                  Start exploring
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </motion.div>

            <div className="lg:col-span-7 space-y-3 md:space-y-4">
              {howItWorks.map((step, i) => {
                const Icon = step.icon;
                return (
                  <motion.div
                    key={step.title}
                    variants={fadeUp}
                    transition={sectionTransition}
                    className="group relative bg-card border border-border rounded-2xl p-6 md:p-7 hover:shadow-md hover:border-border-strong transition-all"
                  >
                    <div className="flex items-start gap-5 md:gap-6">
                      <div className="shrink-0 flex flex-col items-center gap-2">
                        <span className="font-display text-xs font-bold text-primary tracking-wider">
                          {step.step}
                        </span>
                        <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-primary-soft text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                          <Icon className="h-5 w-5 md:h-6 md:w-6" strokeWidth={2} />
                        </div>
                      </div>
                      <div className="flex-1 pt-1">
                        <h3 className="font-display text-xl md:text-2xl font-semibold text-foreground tracking-extra-tight mb-2">
                          {step.title}
                        </h3>
                        <p className="text-sm md:text-base text-foreground-soft leading-relaxed">
                          {step.description}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>

          <div className="mt-12 md:mt-16 flex justify-center">
            <NearbyPlayers />
          </div>
        </div>
      </section>

      {/* ── Why Sportsbnb — asymmetric grid w/ feature spotlight ── */}
      <section className="py-24 md:py-36 bg-background">
        <div className="container">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={staggerContainer}
          >
            <motion.div
              variants={fadeUp}
              transition={sectionTransition}
              className="max-w-3xl mb-12 md:mb-16"
            >
              <p className="text-eyebrow mb-3">Why Sportsbnb</p>
              <h2 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold text-foreground tracking-tightest leading-[1.02] text-balance">
                Built for players who<br className="hidden md:block" />{" "}
                <span className="italic font-medium text-foreground-soft">just want to play.</span>
              </h2>
            </motion.div>

            <motion.div
              variants={fadeUp}
              transition={sectionTransition}
              className="grid md:grid-cols-6 gap-4 md:gap-5"
            >
              {benefits.map((benefit, i) => {
                const Icon = benefit.icon;
                // First card spans 2 cols + 2 rows (visual spotlight); rest = 2 cols
                const isSpotlight = i === 0;
                return (
                  <div
                    key={benefit.title}
                    className={`group relative overflow-hidden rounded-2xl border border-border bg-card p-6 md:p-7 transition-all hover:border-border-strong hover:shadow-md ${
                      isSpotlight
                        ? "md:col-span-3 md:row-span-2 md:p-9 bg-gradient-to-br from-primary-soft via-card to-card"
                        : "md:col-span-3 lg:col-span-2"
                    }`}
                  >
                    {isSpotlight && (
                      <div className="absolute -top-12 -right-12 h-40 w-40 rounded-full bg-primary/10 blur-2xl" />
                    )}
                    <div
                      className={`relative inline-flex items-center justify-center rounded-xl bg-primary text-primary-foreground mb-5 ${
                        isSpotlight ? "h-14 w-14" : "h-11 w-11"
                      }`}
                    >
                      <Icon className={isSpotlight ? "h-6 w-6" : "h-5 w-5"} strokeWidth={2} />
                    </div>
                    <h3
                      className={`font-display font-semibold text-foreground tracking-extra-tight mb-2 ${
                        isSpotlight ? "text-2xl md:text-3xl leading-tight" : "text-lg"
                      }`}
                    >
                      {benefit.title}
                    </h3>
                    <p
                      className={`text-foreground-soft leading-relaxed ${
                        isSpotlight ? "text-base md:text-lg max-w-md" : "text-sm"
                      }`}
                    >
                      {benefit.desc}
                    </p>
                  </div>
                );
              })}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ── For Venue Owners — dark editorial split ── */}
      <section className="relative py-24 md:py-36 bg-secondary overflow-hidden">
        <div className="absolute inset-0 bg-grid-soft opacity-[0.04] pointer-events-none" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 h-px w-[80%] bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

        <div className="container relative">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={staggerContainer}
            className="grid lg:grid-cols-12 gap-12 lg:gap-16 items-center"
          >
            <motion.div variants={fadeUp} transition={sectionTransition} className="lg:col-span-6">
              <span className="inline-flex items-center gap-2 rounded-full border border-secondary-foreground/15 bg-secondary-foreground/[0.06] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-secondary-foreground/80 mb-6">
                For venue owners
              </span>
              <h2 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold text-secondary-foreground tracking-tightest leading-[1.02] mb-6 md:mb-7 text-balance">
                Fill empty courts.<br />
                <span className="italic font-medium text-secondary-foreground/80">Keep every booking.</span>
              </h2>
              <p className="text-base md:text-lg text-secondary-foreground/65 mb-10 leading-relaxed max-w-lg">
                Get discovered by local players, manage availability in one place, and get paid automatically for every booking — payouts straight to your bank or Idram.
              </p>

              <div className="grid sm:grid-cols-2 gap-x-8 gap-y-6 mb-10 md:mb-12">
                {forOwners.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.title} className="flex gap-4">
                      <div className="shrink-0 w-11 h-11 rounded-xl bg-primary/15 ring-1 ring-primary/20 flex items-center justify-center text-primary">
                        <Icon className="h-5 w-5" strokeWidth={2} />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-display font-semibold text-secondary-foreground text-base mb-1">{item.title}</h3>
                        <p className="text-sm text-secondary-foreground/60 leading-relaxed">{item.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <Link to="/add-venue">
                  <Button size="lg" className="gap-2">
                    List your venue free
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link to="/for-owners">
                  <Button size="lg" variant="heroOutline">
                    Learn more
                  </Button>
                </Link>
              </div>
            </motion.div>

            {/* Visual side — image with metric overlays */}
            <motion.div
              variants={fadeUp}
              transition={{ ...sectionTransition, duration: 0.8 } as any}
              className="lg:col-span-6 relative hidden lg:block"
            >
              <div className="relative aspect-[5/6] rounded-[1.75rem] overflow-hidden shadow-2xl border border-secondary-foreground/10">
                <img src={venueBasketball} alt="Venue interior at golden hour" className="w-full h-full object-cover" loading="lazy" />
                <div className="absolute inset-0 bg-gradient-to-tr from-secondary/60 via-transparent to-transparent" />
              </div>

              {/* Floating value card — owner benefit */}
              <div className="absolute -left-6 top-12 bg-card border border-border rounded-2xl shadow-xl p-4 w-60">
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-8 w-8 rounded-xl bg-primary-soft text-primary flex items-center justify-center">
                    <TrendingUp className="h-4 w-4" strokeWidth={2.25} />
                  </div>
                  <p className="text-sm font-semibold text-foreground">Zero commission</p>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">You keep 100% of your listed price — the small service fee is paid by the player.</p>
              </div>

              {/* Floating payout card */}
              <div className="glass absolute -right-4 bottom-10 rounded-2xl p-4 w-64">
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-7 w-7 rounded-xl bg-primary-soft text-primary flex items-center justify-center">
                    <CreditCard className="h-4 w-4" strokeWidth={2.25} />
                  </div>
                  <p className="text-sm font-semibold text-foreground">Automatic payouts</p>
                </div>
                <p className="text-xs text-muted-foreground">Earnings land in your bank or Idram — <span className="stat-numeral">֏42,000</span> this week.</p>
              </div>

              <div className="absolute -inset-8 -z-10 bg-primary/15 rounded-[2.5rem] blur-3xl" />
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ── Testimonials — magazine layout ── */}
      {testimonials.length > 0 && (
      <section className="py-24 md:py-36 bg-background">
        <div className="container">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={staggerContainer}
          >
            <motion.div
              variants={fadeUp}
              transition={sectionTransition}
              className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-12 md:mb-16"
            >
              <div>
                <p className="text-eyebrow mb-3">Voices from the community</p>
                <h2 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold text-foreground tracking-tightest leading-[1.02] text-balance">
                  Real players.<br />
                  <span className="italic font-medium text-foreground-soft">Real reviews.</span>
                </h2>
              </div>
            </motion.div>

            <motion.div
              variants={fadeUp}
              transition={sectionTransition}
              className="grid md:grid-cols-3 gap-4 md:gap-6"
            >
              {testimonials.map((t, i) => (
                <figure
                  key={t.name}
                  className={`group relative bg-card border border-border rounded-2xl p-7 md:p-8 hover:shadow-md transition-all ${
                    i === 1 ? "md:translate-y-6" : ""
                  }`}
                >
                  <span className="absolute -top-4 left-7 font-display text-6xl text-primary/30 leading-none select-none">"</span>
                  <div className="flex gap-0.5 mb-5">
                    {Array.from({ length: t.rating }).map((_, j) => (
                      <Star key={j} className="h-4 w-4 text-warning fill-warning" />
                    ))}
                  </div>
                  <blockquote className="text-base md:text-[17px] text-foreground leading-relaxed mb-6 font-medium">
                    {t.text}
                  </blockquote>
                  <figcaption className="flex items-center gap-3 pt-5 border-t border-border">
                    <div className="h-9 w-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                      {t.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-foreground text-sm">{t.name}</p>
                      <p className="text-xs text-muted-foreground">Verified player</p>
                    </div>
                  </figcaption>
                </figure>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </section>
      )}

      {/* ── Platform Features — grouped use-case journey ── */}
      <section className="py-20 md:py-32 section-tinted border-y border-border overflow-hidden">
        <div className="container">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={staggerContainer}
          >
            <motion.div
              variants={fadeUp}
              transition={sectionTransition}
              className="max-w-3xl mb-10 md:mb-14"
            >
              <p className="text-eyebrow mb-3">Everything you need</p>
              <h2 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold text-foreground tracking-tightest leading-[1.02] text-balance">
                Discover. Book. Play.{" "}
                <span className="italic font-medium text-foreground-soft">All in one place.</span>
              </h2>
            </motion.div>

            {/* Secure payment spotlight banner */}
            <motion.div
              variants={fadeUp}
              transition={sectionTransition}
              className="mb-8 md:mb-10 relative overflow-hidden rounded-2xl border border-border bg-card p-5 md:p-7"
            >
              <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-6">
                <div className="shrink-0 h-12 w-12 md:h-14 md:w-14 rounded-2xl bg-primary-soft text-primary flex items-center justify-center">
                  <Lock className="h-6 w-6 md:h-7 md:w-7" strokeWidth={2.25} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] md:text-[11px] font-bold uppercase tracking-[0.16em] text-primary mb-1">
                    Book &amp; pay in the app
                  </p>
                  <h3 className="font-display text-xl md:text-2xl font-semibold text-foreground tracking-extra-tight leading-tight mb-1">
                    Your slot is locked the moment you pay
                  </h3>
                  <p className="text-sm md:text-[15px] text-foreground-soft leading-relaxed">
                    No phone calls. No double bookings. Pay securely with your card or Idram — refunds follow the venue's cancellation policy automatically.
                  </p>
                </div>
              </div>
            </motion.div>

            <div className="grid sm:grid-cols-2 gap-4 md:gap-5">
              {featureGroups.map((group) => (
                <motion.div
                  key={group.title}
                  variants={fadeUp}
                  transition={sectionTransition}
                  className="group relative bg-card border border-border rounded-2xl p-6 md:p-7 hover:border-border-strong hover:shadow-md transition-all"
                >
                  <p className="text-[10px] md:text-[11px] font-bold uppercase tracking-[0.16em] text-primary mb-3">
                    {group.eyebrow}
                  </p>
                  <h3 className="font-display text-xl md:text-2xl font-semibold text-foreground tracking-extra-tight leading-tight mb-2">
                    {group.title}
                  </h3>
                  <p className="text-sm text-foreground-soft leading-relaxed mb-5 md:mb-6">
                    {group.description}
                  </p>
                  <div className="grid grid-cols-2 gap-2 md:gap-2.5">
                    {group.items.map((f) => {
                      const Icon = f.icon;
                      return (
                        <div
                          key={f.label}
                          className="flex items-center gap-2 rounded-xl border border-border bg-surface-1 px-3 py-2.5"
                        >
                          <Icon className="h-3.5 w-3.5 text-primary shrink-0" strokeWidth={2.25} />
                          <span className="text-xs md:text-[13px] font-semibold text-foreground truncate">{f.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Mission & Vision — quieter, pull-quote feel ── */}
      <section className="py-24 md:py-36 bg-background">
        <div className="container">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={staggerContainer}
            className="max-w-5xl mx-auto"
          >
            <motion.div variants={fadeUp} transition={sectionTransition} className="grid md:grid-cols-12 gap-10 md:gap-14 items-start">
              <div className="md:col-span-5">
                <p className="text-eyebrow mb-3">What drives us</p>
                <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-foreground tracking-tightest leading-[1.05]">
                  Sport should be a tap away — not a hassle.
                </h2>
              </div>
              <div className="md:col-span-7 space-y-8">
                <div className="border-l-2 border-primary pl-6">
                  <h3 className="font-display text-lg font-semibold text-foreground mb-2 flex items-center gap-2">
                    <Target className="h-4 w-4 text-primary" />
                    Mission
                  </h3>
                  <p className="text-base md:text-lg text-foreground-soft leading-relaxed">
                    Make it effortless for anyone to find, organize, and join sport — removing every barrier between people and play.
                  </p>
                </div>
                <div className="border-l-2 border-border pl-6">
                  <h3 className="font-display text-lg font-semibold text-foreground mb-2 flex items-center gap-2">
                    <Eye className="h-4 w-4 text-primary" />
                    Vision
                  </h3>
                  <p className="text-base md:text-lg text-foreground-soft leading-relaxed">
                    A world where finding a game is as easy as opening an app — one trusted place to discover, connect, and stay active.
                  </p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ── Final CTA — solid color, brand-forward ── */}
      <section className="relative py-24 md:py-36 bg-secondary overflow-hidden">
        <div className="absolute inset-0 bg-grid-soft opacity-[0.05] pointer-events-none" />
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 h-[500px] w-[500px] rounded-full bg-primary/15 blur-3xl pointer-events-none" />

        <div className="container relative z-10">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={staggerContainer}
            className="max-w-3xl mx-auto text-center"
          >
            <motion.h2
              variants={fadeUp}
              transition={sectionTransition}
              className="font-display text-display-xl text-secondary-foreground mb-6 md:mb-8 text-balance"
            >
              Your next game is{" "}
              <span className="italic font-medium text-primary">one tap away.</span>
            </motion.h2>
            <motion.p
              variants={fadeUp}
              transition={sectionTransition}
              className="text-base md:text-xl text-secondary-foreground/65 mb-10 md:mb-12 max-w-md mx-auto leading-relaxed"
            >
              Free to start. No card required. Just play more.
            </motion.p>
            <motion.div
              variants={fadeUp}
              transition={sectionTransition}
              className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center mb-20 md:mb-0"
            >
              {!isLoading && !user ? (
                <Link to="/signup">
                  <Button size="xl" className="w-full sm:w-auto gap-2 shadow-2xl">
                    Create free account
                    <ArrowRight className="h-5 w-5" />
                  </Button>
                </Link>
              ) : (
                <Link to="/dashboard">
                  <Button size="xl" className="w-full sm:w-auto gap-2 shadow-2xl">
                    Go to dashboard
                    <ArrowRight className="h-5 w-5" />
                  </Button>
                </Link>
              )}
              <Link to="/venues">
                <Button variant="heroOutline" size="xl" className="w-full sm:w-auto bg-secondary-foreground/[0.06] border-secondary-foreground/20 text-secondary-foreground hover:bg-secondary-foreground/10 hover:border-secondary-foreground/30">
                  Explore venues
                </Button>
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
