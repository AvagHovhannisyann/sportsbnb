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

      {/* ── Hero ── */}
      <section className="relative min-h-[100svh] flex items-center justify-center overflow-hidden bg-secondary">
        <div className="absolute inset-0">
          <img
            src={heroImage}
            alt="Modern sports complex at golden hour with athletes playing football, tennis, and basketball"
            className="w-full h-full object-cover"
            loading="eager"
            fetchPriority="high"
            width={1920}
            height={1080}
            decoding="async"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-secondary/85 via-secondary/65 to-secondary/95" />
          <div className="absolute inset-0 bg-grid-soft opacity-[0.06]" />
        </div>

        <div className="container relative z-10 py-20 pb-32 md:py-0 md:pb-36">
          <motion.div
            className="max-w-5xl mx-auto"
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
            transition={{ staggerChildren: 0.12, delayChildren: 0.15 }}
          >
            <motion.div
              variants={fadeUp}
              transition={sectionTransition}
              className="flex justify-center mb-7 md:mb-9"
            >
              <span className="inline-flex items-center gap-2 rounded-full border border-secondary-foreground/15 bg-secondary-foreground/[0.06] backdrop-blur px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-secondary-foreground/80">
                <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                Now booking via WhatsApp
              </span>
            </motion.div>

            <motion.h1
              variants={fadeUp}
              transition={sectionTransition}
              className="text-display-2xl text-secondary-foreground text-center text-balance mb-6 md:mb-8"
            >
              Book the court.
              <br />
              <span className="italic font-normal text-secondary-foreground/85">Play the game.</span>
            </motion.h1>

            <motion.p
              variants={fadeUp}
              transition={sectionTransition}
              className="text-lg md:text-xl text-secondary-foreground/65 leading-relaxed max-w-xl mx-auto text-center mb-10 md:mb-14 px-4"
            >
              The fastest way to find and book sports venues — message the owner directly, no friction.
            </motion.p>

            <motion.div
              variants={fadeUp}
              transition={sectionTransition}
              className="max-w-4xl mx-auto px-1 mb-10 md:mb-14"
            >
              <HeroSearch />
            </motion.div>

            <motion.div
              variants={fadeUp}
              transition={sectionTransition}
              className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center px-4"
            >
              <Link to="/venues">
                <Button size="xl" variant="default" className="w-full sm:w-auto gap-2">
                  Browse all venues
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </Link>
              <Link to="/for-owners">
                <Button size="xl" variant="heroOutline" className="w-full sm:w-auto">
                  <Building className="h-5 w-5" />
                  I'm a venue owner
                </Button>
              </Link>
            </motion.div>
          </motion.div>
        </div>

        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 hidden md:block">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5, duration: 0.8 }}
            className="w-6 h-10 rounded-full border border-secondary-foreground/20 flex items-start justify-center p-2"
          >
            <div className="w-1 h-2 bg-secondary-foreground/40 rounded-full animate-bounce" />
          </motion.div>
        </div>
      </section>

      {/* ── Social Proof Stats ── */}
      <section className="relative z-10 -mt-14 md:-mt-20 pb-8 md:pb-0">
        <div className="container">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            transition={sectionTransition}
            className="bg-card border border-border rounded-2xl shadow-xl p-6 md:p-10 max-w-5xl mx-auto"
          >
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:divide-x md:divide-border">
              {stats.map((stat) => (
                <div key={stat.label} className="text-center md:px-4">
                  <p className="font-display text-3xl md:text-5xl font-bold text-foreground tracking-tightest">
                    {stat.value}
                  </p>
                  <p className="text-xs md:text-sm text-muted-foreground mt-1.5 font-medium">
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Categories ── */}
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
                Popular Categories
              </p>
              <h2 className="text-3xl md:text-5xl lg:text-7xl font-bold text-foreground tracking-tighter mb-4 md:mb-6">
                Every sport. Every venue.
              </h2>
              <p className="text-base md:text-xl text-muted-foreground max-w-xl mx-auto">
                From football fields to swimming pools — find the perfect spot to play.
              </p>
            </motion.div>

            <motion.div variants={fadeUp} transition={sectionTransition} className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-5">
              {featuredVenues.map((venue) => (
                <Link key={venue.name} to="/venues" className="group relative aspect-[3/4] rounded-2xl md:rounded-3xl overflow-hidden block">
                  <img
                    src={venue.image}
                    alt={`${venue.name} venues on Sportsbnb`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                    loading="lazy"
                    decoding="async"
                    width={516}
                    height={688}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-4 md:p-6">
                    <h3 className="font-semibold text-primary-foreground text-lg md:text-2xl tracking-tight">{venue.name}</h3>
                    <p className="text-primary-foreground/60 text-xs md:text-sm mt-1">{venue.count}</p>
                  </div>
                </Link>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="py-20 md:py-36 bg-muted/20">
        <div className="container">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={staggerContainer}
          >
            <motion.div variants={fadeUp} transition={sectionTransition} className="text-center mb-12 md:mb-20">
              <p className="text-sm font-semibold text-primary tracking-widest uppercase mb-3 md:mb-4">
                How It Works
              </p>
              <h2 className="text-3xl md:text-5xl lg:text-7xl font-bold text-foreground tracking-tighter mb-4 md:mb-6">
                Book in minutes,<br className="hidden md:block" /> not hours.
              </h2>
              <p className="text-base md:text-xl text-muted-foreground max-w-xl mx-auto">
                No more phone calls, spreadsheets, or endless group chats.
              </p>
            </motion.div>

            <motion.div variants={fadeUp} transition={sectionTransition} className="grid md:grid-cols-3 gap-6 md:gap-8 max-w-5xl mx-auto mb-12 md:mb-16">
              {howItWorks.map((step) => {
                const Icon = step.icon;
                return (
                  <div key={step.title} className="relative bg-card border border-border/50 rounded-2xl md:rounded-3xl p-6 md:p-10 text-center group hover:border-primary/30 transition-colors">
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center">
                      {step.step}
                    </div>
                    <div className="w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-primary/10 text-primary mx-auto mb-5 md:mb-6 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                      <Icon className="h-7 w-7 md:h-8 md:w-8" strokeWidth={1.5} />
                    </div>
                    <h3 className="text-lg md:text-xl font-semibold text-foreground mb-2 md:mb-3 tracking-tight">{step.title}</h3>
                    <p className="text-sm md:text-base text-muted-foreground leading-relaxed">{step.description}</p>
                  </div>
                );
              })}
            </motion.div>

            <motion.div variants={fadeUp} transition={sectionTransition} className="flex flex-col items-center gap-6">
              <Link to="/venues">
                <Button size="lg" className="h-14 px-10 text-base rounded-full gap-2">
                  Start exploring venues
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </Link>
              <NearbyPlayers />
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ── Why Sportsbnb ── */}
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
                Why Sportsbnb
              </p>
              <h2 className="text-3xl md:text-5xl lg:text-7xl font-bold text-foreground tracking-tighter mb-4 md:mb-6">
                Built for players,<br className="hidden md:block" /> by players.
              </h2>
              <p className="text-base md:text-xl text-muted-foreground max-w-xl mx-auto">
                Every feature designed to eliminate friction from sport.
              </p>
            </motion.div>

            <motion.div variants={fadeUp} transition={sectionTransition} className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 max-w-6xl mx-auto">
              {benefits.map((benefit) => {
                const Icon = benefit.icon;
                return (
                  <div key={benefit.title} className="bg-card border border-border/40 rounded-2xl p-6 md:p-8 group hover:border-primary/30 hover:shadow-lg transition-all">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-4 group-hover:bg-primary/20 transition-colors">
                      <Icon className="h-6 w-6" strokeWidth={1.5} />
                    </div>
                    <h3 className="text-base md:text-lg font-semibold text-foreground mb-2">{benefit.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{benefit.desc}</p>
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
