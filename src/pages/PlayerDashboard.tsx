import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Calendar, Clock, MapPin, Users, Loader2, Plus, Flame, Trophy, MessageCircle, CalendarCheck, Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Layout from "@/components/layout/Layout";
import AIRecommendations from "@/components/venue/AIRecommendations";
import PlayerStatsCard from "@/components/player/PlayerStatsCard";
import ReferralCard from "@/components/referral/ReferralCard";
import AchievementsSection from "@/components/achievements/AchievementsSection";
import GameMatchmakingCard from "@/components/games/GameMatchmakingCard";
import { UpcomingPlansCard } from "@/components/player/UpcomingPlansCard";
import { NextMoveCard } from "@/components/dashboard/NextMoveCard";
import { SportsDNACard } from "@/components/player/SportsDNACard";
import { useAuth } from "@/hooks/useAuth";
import { useUserGames } from "@/hooks/useGames";
import { useMyLeads } from "@/hooks/useLeads";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { formatTimeOfDay } from "@/lib/time";

const PlayerDashboard = () => {
  const navigate = useNavigate();
  const { user, profile, isLoading: authLoading } = useAuth();
  const { data: userGames, isLoading: gamesLoading } = useUserGames(user?.id);
  const { data: myLeads = [] } = useMyLeads();

  useEffect(() => {
    if (!authLoading && !user) navigate("/login");
    if (!authLoading && user && profile && !profile.onboarding_completed) navigate("/onboarding/player");
  }, [user, profile, authLoading, navigate]);

  const allUserGames = [
    ...(userGames?.hosted || []).map((g) => ({ ...g, isHost: true })),
    ...(userGames?.joined || []).map((g) => ({ ...g, isHost: false })),
  ].sort((a, b) => new Date(a.game_date).getTime() - new Date(b.game_date).getTime());

  const upcomingGames = allUserGames.filter(
    (g) => new Date(g.game_date) >= new Date(new Date().toDateString()) && g.status === "open"
  ).slice(0, 3);

  const pendingInquiries = myLeads.filter((l) => l.lead_outcome === "pending").length;
  const confirmedCount = myLeads.filter((l) => l.lead_outcome === "confirmed").length;

  // Removed: a `nextMove` object built here from nextGame / pending leads and
  // then never rendered — the visible suggestion comes from NextMoveCard's
  // edge function. Dead since that card landed, and it had gone stale in the
  // meantime: one branch read "Sent … via WhatsApp · code {booking_code}",
  // describing a handoff flow that no longer exists.

  if (authLoading) {
    return (
      <Layout>
        <div className="container py-16 text-center"><p className="text-muted-foreground">Loading...</p></div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="bg-background min-h-screen">
        <div className="container py-8 space-y-8">
          {/* Header */}
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="page-title">
                Welcome back{profile?.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""}!
              </h1>
              <p className="text-muted-foreground">Your sports cockpit at a glance.</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="gap-1.5 py-1.5 px-3 border-amber-500/30 text-amber-600 bg-amber-500/10">
                <Trophy className="h-3.5 w-3.5" /> Level {profile?.level ?? 1}
              </Badge>
              <Badge variant="outline" className="gap-1.5 py-1.5 px-3 border-primary/30 text-primary bg-primary/10">
                <Flame className="h-3.5 w-3.5" /> {profile?.xp ?? 0} XP
              </Badge>
            </div>
          </div>

          {/* The player's own numbers first. These come from queries that are
              usually already cached; the AI suggestion below is an edge
              function call measured in seconds, and it used to sit here — so
              the top of the logged-in dashboard was a spinner while everything
              real waited underneath it. */}
          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-border bg-border md:grid-cols-4">
            {[
              { label: "Awaiting reply", value: pendingInquiries, icon: MessageCircle, to: "/messages" },
              { label: "Confirmed bookings", value: confirmedCount, icon: CalendarCheck, to: "/profile" },
              { label: "Games hosted", value: userGames?.hosted?.length ?? 0, icon: Flag, to: "/games" },
              { label: "Games joined", value: userGames?.joined?.length ?? 0, icon: Users, to: "/games" },
            ].map((s) => (
              <Link
                key={s.label}
                to={s.to}
                className="group bg-card px-5 py-5 transition-colors hover:bg-surface-1 focus-ring"
              >
                <div className="mb-3 flex items-center justify-between">
                  <s.icon className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-primary" />
                  {/* A zero is a prompt, not a score. Dimming it stops four
                      empty counters from reading as the loudest thing on a new
                      player's dashboard. */}
                  {s.value > 0 && (
                    <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden="true" />
                  )}
                </div>
                <div
                  className={cn(
                    "stat-numeral text-3xl font-bold leading-none tabular-nums",
                    s.value > 0 ? "text-foreground" : "text-muted-foreground/50",
                  )}
                >
                  {s.value}
                </div>
                <div className="mt-1.5 text-sm text-muted-foreground">{s.label}</div>
              </Link>
            ))}
          </div>

          {/* AI-powered Next Move — supplementary, so it follows the facts. */}
          <NextMoveCard />

          {/* Upcoming Plans + Games */}
          <div className="grid lg:grid-cols-2 gap-6">
            <UpcomingPlansCard />
            <Card className="min-w-0">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Your Games</CardTitle>
                <Link to="/games" className="text-sm text-primary hover:underline">Find more</Link>
              </CardHeader>
              <CardContent className="space-y-3">
                {gamesLoading ? (
                  <div className="py-8 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
                ) : upcomingGames.length > 0 ? (
                  upcomingGames.map((game) => (
                    <Link key={game.id} to={`/game/${game.id}`}>
                      <div className="p-3 rounded-lg border border-border hover:bg-muted/40 transition-colors">
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="secondary">{game.sport}</Badge>
                              {game.isHost && <Badge variant="outline">Hosting</Badge>}
                            </div>
                            <p className="font-medium text-foreground truncate">{game.title}</p>
                          </div>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground shrink-0">
                            <Users className="h-4 w-4" />
                            <span>{game.max_players}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1"><Calendar className="h-3 w-3" />{format(new Date(game.game_date), "EEE, MMM d")}</div>
                          <div className="flex items-center gap-1"><Clock className="h-3 w-3" />{formatTimeOfDay(game.game_time)}</div>
                          {/* min-w-0 or `truncate` is decorative: a flex item
                              defaults to min-width:auto, so the location kept
                              its full intrinsic width, pushed the card past
                              the grid track and scrolled the dashboard
                              sideways at 375px. */}
                          <div className="flex min-w-0 items-center gap-1 truncate"><MapPin className="h-3 w-3" />{game.location}</div>
                        </div>
                      </div>
                    </Link>
                  ))
                ) : (
                  <div className="py-8 text-center text-muted-foreground">
                    <p className="mb-3">No upcoming games</p>
                    <div className="flex gap-2 justify-center">
                      <Link to="/games"><Button size="sm" variant="outline">Find games</Button></Link>
                      <Link to="/create-game"><Button size="sm"><Plus className="h-4 w-4 mr-1" />Create</Button></Link>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Stats / Referrals / Matchmaking / Achievements */}
          <div className="grid md:grid-cols-2 gap-6">
            <SportsDNACard />
            <PlayerStatsCard />
          </div>
          <ReferralCard />
          <div className="grid md:grid-cols-2 gap-6">
            <GameMatchmakingCard />
            <AchievementsSection />
          </div>

          {/* AI Recs */}
          <AIRecommendations />
        </div>
      </div>
    </Layout>
  );
};

export default PlayerDashboard;
