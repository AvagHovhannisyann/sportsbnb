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
import founderAvag from "@/assets/founder-avag.jpg";
import founderGor from "@/assets/founder-gor.jpg";
import founderIrina from "@/assets/founder-irina.jpg";

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

  const [stats, setStats] = useState([
    { value: "—", label: "Venues Listed" },
    { value: "—", label: "Games Created" },
    { value: "—", label: "Teams Formed" },
    { value: "—", label: "Average Rating" },
  ]);

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
        : "—";
      setStats([
        { value: venueCount.toString(), label: "Venues Listed" },
        { value: gameCount.toString(), label: "Games Created" },
        { value: teamCount.toString(), label: "Teams Formed" },
        { value: avgRating !== "—" ? `${avgRating}★` : "—", label: "Average Rating" },
      ]);
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
    { icon: Zap, title: "Instant Confirmation", desc: "Book and get confirmed in under 10 seconds." },
    { icon: Shield, title: "Secure Payments", desc: "PCI-compliant processing with refund protection." },
    { icon: Star, title: "Verified Venues", desc: "Every facility reviewed and quality-checked." },
    { icon: Users, title: "Find Teammates", desc: "AI-powered matchmaking for your skill level." },
    { icon: Calendar, title: "Real-Time Availability", desc: "See open slots updated live, never double-booked." },
    { icon: Bot, title: "AI Recommendations", desc: "Smart suggestions based on your sport and location." },
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
          count: `${results[i].count ?? 0} venues`,
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

  const featureRows = [
    [
      { icon: Search, label: "Smart Search" }, { icon: Calendar, label: "Instant Booking" },
      { icon: MapPin, label: "Interactive Map" }, { icon: Bot, label: "AI Matchmaking" },
      { icon: Trophy, label: "Leaderboards" }, { icon: Award, label: "XP & Achievements" },
      { icon: Bell, label: "Notifications" }, { icon: Clock, label: "Waitlist" },
      { icon: Star, label: "Reviews" }, { icon: TrendingUp, label: "Dynamic Pricing" },
      { icon: BrainCircuit, label: "Smart Scheduling" }, { icon: CloudSun, label: "Weather" },
    ],
    [
      { icon: BarChart3, label: "Analytics" }, { icon: Image, label: "Photo Gallery" },
      { icon: Layers, label: "Multi-Court" }, { icon: Gamepad2, label: "Open Games" },
      { icon: Users, label: "Teams" }, { icon: MessageCircle, label: "Chat" },
      { icon: CreditCard, label: "Payments" }, { icon: Repeat, label: "Recurring" },
      { icon: Split, label: "Split Payments" }, { icon: Flame, label: "Streaks" },
      { icon: GitCompare, label: "Venue Compare" }, { icon: UserCircle, label: "Player Profiles" },
    ],
    [
      { icon: UserPlus, label: "Referrals" }, { icon: Shield, label: "Verified Venues" },
      { icon: Wifi, label: "Real-Time" }, { icon: Map, label: "Geolocation" },
      { icon: Globe, label: "Multi-Currency" }, { icon: Sparkles, label: "AI Recommendations" },
      { icon: Building, label: "Owner Dashboard" }, { icon: Zap, label: "Embeddable Widgets" },
      { icon: Swords, label: "Challenges" }, { icon: Activity, label: "Live Occupancy" },
      { icon: Lock, label: "Two-Factor Auth" },
    ],
  ];

  return (
    <div className="flex flex-col">
      <SEOHead
        canonical="/"
        jsonLd={createWebsiteJsonLd()}
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
                    WhatsApp-first booking
                  </span>
                  <span className="hidden sm:inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Star className="h-3.5 w-3.5 fill-warning text-warning" />
                    Loved by local players
                  </span>
                </motion.div>

                <motion.h1
                  variants={fadeUp}
                  transition={sectionTransition}
                  className="font-display text-[2.75rem] sm:text-6xl md:text-7xl lg:text-[5.75rem] leading-[0.92] font-bold text-foreground tracking-tightest text-balance mb-6 md:mb-8"
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
                  Browse verified sports venues, see real availability, and message the owner on
                  WhatsApp in one tap. Built for players who'd rather play than schedule.
                </motion.p>

                <motion.div
                  variants={fadeUp}
                  transition={sectionTransition}
                  className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-12 md:mb-14"
                >
                  <Link to="/venues">
                    <Button size="xl" className="w-full sm:w-auto gap-2 shadow-lg hover:shadow-xl">
                      Browse venues
                      <ArrowRight className="h-5 w-5" />
                    </Button>
                  </Link>
                  <Link to="/for-owners">
                    <Button size="xl" variant="outline" className="w-full sm:w-auto">
                      <Building className="h-5 w-5" />
                      List your venue
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
                      <span className="font-semibold text-foreground">{stats[0].value}</span>{" "}
                      verified venues across the network
                    </p>
                  </div>
                </motion.div>
              </motion.div>
            </div>

            {/* RIGHT — Photo collage with floating cards */}
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.7, ease: [0.25, 0.1, 0.25, 1] }}
              className="lg:col-span-5 relative h-[420px] sm:h-[520px] lg:h-[640px]"
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
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Live now</p>
                  <p className="text-sm font-semibold text-foreground truncate">12 courts available nearby</p>
                </div>
              </div>

              {/* Floating WhatsApp card */}
              <div className="absolute bottom-8 -right-3 lg:-right-8 bg-card border border-border rounded-2xl shadow-xl p-3.5 pr-5 flex items-center gap-3 max-w-[280px]">
                <div className="h-10 w-10 rounded-xl bg-[#25D366]/12 text-[#075E54] flex items-center justify-center shrink-0">
                  <MessageCircle className="h-5 w-5" strokeWidth={2.25} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground leading-tight">"Court free at 7pm — see you!"</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Reply via WhatsApp · 12s ago</p>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Search bar — overlaps tonal switch */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="relative -mb-12 md:-mb-16 z-20"
          >
            <HeroSearch />
          </motion.div>
        </div>
      </section>

      {/* ── Stats strip — flush against tinted band ── */}
      <section className="bg-surface-1 border-y border-border pt-20 md:pt-24 pb-10 md:pb-14">
        <div className="container">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            transition={sectionTransition}
            className="grid grid-cols-2 md:grid-cols-4 gap-y-8 md:divide-x md:divide-border"
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
                        <p className="text-white/65 text-xs md:text-sm mt-1 font-medium">{venue.count}</p>
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

      {/* ── For Venue Owners ── */}
      <section className="py-20 md:py-36 bg-secondary">
        <div className="container">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={staggerContainer}
            className="grid lg:grid-cols-2 gap-12 lg:gap-24 items-center"
          >
            <motion.div variants={fadeUp} transition={sectionTransition}>
              <p className="text-sm font-semibold text-primary tracking-widest uppercase mb-3 md:mb-4">
                For Venue Owners
              </p>
              <h2 className="text-3xl md:text-5xl lg:text-6xl font-bold text-secondary-foreground tracking-tighter leading-[1.05] mb-5 md:mb-8">
                Fill your courts.
                <br />
                Grow your business.
              </h2>
              <p className="text-base md:text-lg text-secondary-foreground/60 mb-8 md:mb-12 leading-relaxed max-w-lg">
                Join facility owners who manage bookings, reach new customers, and maximize revenue — all from a single dashboard.
              </p>

              <div className="space-y-5 md:space-y-6 mb-8 md:mb-12">
                {forOwners.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.title} className="flex gap-5">
                      <div className="shrink-0 w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-primary/15 flex items-center justify-center text-primary">
                        <Icon className="h-6 w-6 md:h-7 md:w-7" strokeWidth={1.5} />
                      </div>
                      <div>
                        <h3 className="font-semibold text-secondary-foreground text-base md:text-lg mb-1">{item.title}</h3>
                        <p className="text-sm md:text-base text-secondary-foreground/60">{item.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <Link to="/list-venue">
                  <Button size="lg" className="h-14 px-10 text-base rounded-full gap-2">
                    List your venue free
                    <ArrowRight className="h-5 w-5" />
                  </Button>
                </Link>
                <Link to="/for-owners">
                  <Button size="lg" variant="heroOutline" className="h-14 px-10 text-base rounded-full">
                    Learn more
                  </Button>
                </Link>
              </div>
            </motion.div>

            <motion.div
              variants={fadeUp}
              transition={{ ...sectionTransition, duration: 0.8 } as any}
              className="relative hidden lg:block"
            >
              <div className="aspect-[4/5] rounded-[2rem] overflow-hidden shadow-2xl">
                <img src={venueBasketball} alt="Basketball venue interior" className="w-full h-full object-cover" loading="lazy" />
              </div>
              <div className="absolute -inset-6 -z-10 bg-primary/10 rounded-[3rem] blur-3xl" />
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ── Testimonials ── */}
      {testimonials.length > 0 && (
      <section className="py-20 md:py-36 bg-background">
        <div className="container">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={staggerContainer}
          >
            <motion.div variants={fadeUp} transition={sectionTransition} className="text-center mb-12 md:mb-20">
              <p className="text-sm font-semibold text-primary tracking-widest uppercase mb-3 md:mb-4">
                What Players Say
              </p>
              <h2 className="text-3xl md:text-5xl lg:text-7xl font-bold text-foreground tracking-tighter">
                Loved by the community.
              </h2>
            </motion.div>

            <motion.div variants={fadeUp} transition={sectionTransition} className="grid md:grid-cols-3 gap-4 md:gap-6 max-w-5xl mx-auto">
              {testimonials.map((t) => (
                <div key={t.name} className="bg-card border border-border/40 rounded-2xl md:rounded-3xl p-6 md:p-8">
                  <div className="flex gap-1 mb-4">
                    {Array.from({ length: t.rating }).map((_, i) => (
                      <Star key={i} className="h-4 w-4 text-primary fill-primary" />
                    ))}
                  </div>
                  <p className="text-sm md:text-base text-foreground leading-relaxed mb-6">"{t.text}"</p>
                  <div>
                    <p className="font-semibold text-foreground text-sm">{t.name}</p>
                  </div>
                </div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </section>
      )}

      {/* ── Platform Features ── */}
      <section className="py-20 md:py-32 bg-muted/20 overflow-hidden">
        <div className="container">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={staggerContainer}
          >
            <motion.div variants={fadeUp} transition={sectionTransition} className="text-center mb-10 md:mb-16">
              <h2 className="text-3xl md:text-5xl lg:text-7xl font-bold text-foreground tracking-tighter">
                35+ features.{" "}
                <span className="text-primary">Zero friction.</span>
              </h2>
            </motion.div>

            {featureRows.map((row, rowIdx) => (
              <motion.div key={rowIdx} variants={fadeUp} transition={sectionTransition} className="flex flex-wrap justify-center gap-2 md:gap-3 mb-2 md:mb-3">
                {row.map((f) => {
                  const Icon = f.icon;
                  return (
                    <div key={f.label} className="group flex items-center gap-2 rounded-full border border-border/40 bg-background/60 px-4 py-2.5 md:px-5 md:py-3 hover:bg-primary/10 hover:border-primary/30 transition-colors">
                      <Icon className="h-4 w-4 text-primary shrink-0" strokeWidth={2} />
                      <span className="text-xs md:text-sm font-medium text-foreground whitespace-nowrap">{f.label}</span>
                    </div>
                  );
                })}
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── Mission & Vision ── */}
      <section className="py-20 md:py-36 bg-background">
        <div className="container">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={staggerContainer}
          >
            <motion.div variants={fadeUp} transition={sectionTransition} className="text-center mb-12 md:mb-20">
              <h2 className="text-3xl md:text-5xl lg:text-7xl font-bold text-foreground tracking-tighter">
                What drives us.
              </h2>
            </motion.div>

            <motion.div variants={fadeUp} transition={sectionTransition} className="grid md:grid-cols-2 gap-4 md:gap-8 max-w-5xl mx-auto">
              <div className="bg-card border border-border/40 rounded-3xl p-8 md:p-12">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-6">
                  <Target className="h-6 w-6" strokeWidth={1.5} />
                </div>
                <h3 className="text-2xl md:text-3xl font-bold text-foreground mb-4 tracking-tight">Our Mission</h3>
                <p className="text-base md:text-lg text-muted-foreground leading-relaxed">
                  To make it easy for anyone to find, organize, and join sports activity — removing the friction that prevents active people from playing regularly.
                </p>
              </div>

              <div className="bg-card border border-border/40 rounded-3xl p-8 md:p-12">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-6">
                  <Eye className="h-6 w-6" strokeWidth={1.5} />
                </div>
                <h3 className="text-2xl md:text-3xl font-bold text-foreground mb-4 tracking-tight">Our Vision</h3>
                <p className="text-base md:text-lg text-muted-foreground leading-relaxed">
                  A world where finding a game is as easy as opening an app — one trusted place to discover, connect, and stay active.
                </p>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="relative py-24 md:py-40 overflow-hidden">
        <div className="absolute inset-0">
          <img
            src={heroImage}
            alt="Sports complex"
            className="w-full h-full object-cover"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/75 via-black/65 to-black/80" />
        </div>
        <div className="container relative z-10">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={staggerContainer}
            className="max-w-3xl mx-auto text-center"
          >
            <motion.p variants={fadeUp} transition={sectionTransition} className="text-sm font-semibold text-primary tracking-widest uppercase mb-4">
              Get Started Today
            </motion.p>
            <motion.h2 variants={fadeUp} transition={sectionTransition} className="text-3xl md:text-5xl lg:text-7xl font-bold text-primary-foreground tracking-tighter mb-5 md:mb-8">
              Your next game<br />is one click away.
            </motion.h2>
            <motion.p variants={fadeUp} transition={sectionTransition} className="text-base md:text-xl text-primary-foreground/60 mb-8 md:mb-12 max-w-md mx-auto">
              Join players and venues already on Sportsbnb. Free to start, no credit card required.
            </motion.p>
            <motion.div variants={fadeUp} transition={sectionTransition} className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center mb-20 md:mb-0">
              {!isLoading && !user ? (
                <Link to="/signup">
                  <Button size="xl" className="w-full sm:w-auto rounded-full font-semibold gap-2 shadow-2xl">
                    Create free account
                    <ArrowRight className="h-5 w-5" />
                  </Button>
                </Link>
              ) : (
                <Link to="/dashboard">
                  <Button size="xl" className="w-full sm:w-auto rounded-full font-semibold gap-2 shadow-2xl">
                    Go to Dashboard
                    <ArrowRight className="h-5 w-5" />
                  </Button>
                </Link>
              )}
              <Link to="/venues">
                <Button variant="ghost" size="xl" className="w-full sm:w-auto rounded-full border border-primary-foreground/20 text-primary-foreground/90 hover:text-primary-foreground hover:bg-primary-foreground/10">
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
