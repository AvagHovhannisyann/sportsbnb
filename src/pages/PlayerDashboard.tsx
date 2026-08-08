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
        <div className="container flex min-h-[45vh] items-center justify-center py-16" role="status">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin motion-reduce:animate-none" aria-hidden="true" />
            Loading your activity…
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-background">
        <div className="container space-y-10 py-6 sm:py-8 lg:py-10">
          {/* Header */}
          <div className="grid gap-5 border-b border-border pb-7 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
            <div className="max-w-2xl">
              <p className="mb-2 text-sm font-semibold text-primary">Player home</p>
              <h1 className="page-title text-balance">
                Welcome back{profile?.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""}.
              </h1>
              <p className="mt-2 text-foreground-soft">
                Your bookings, games, and conversations—ordered by what needs attention next.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 lg:justify-end">
              <Button asChild variant="outline">
                <Link to="/venues">Browse venues</Link>
              </Button>
              <Button asChild>
                <Link to="/create-game"><Plus className="h-4 w-4" aria-hidden="true" />Create game</Link>
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2" aria-label="Player progress">
            <Badge variant="outline" className="gap-1.5 border-border bg-surface-1 px-3 py-1.5 text-foreground-soft">
              <Trophy className="h-3.5 w-3.5 text-warning" aria-hidden="true" /> Level {profile?.level ?? 1}
            </Badge>
            <Badge variant="outline" className="gap-1.5 border-border bg-surface-1 px-3 py-1.5 text-foreground-soft">
              <Flame className="h-3.5 w-3.5 text-primary" aria-hidden="true" /> {profile?.xp ?? 0} XP
            </Badge>
          </div>

          {/* The player's own numbers first. These come from queries that are
              usually already cached; the AI suggestion below is an edge
              function call measured in seconds, and it used to sit here — so
              the top of the logged-in dashboard was a spinner while everything
              real waited underneath it. */}
          <section aria-labelledby="activity-summary-title">
            <h2 id="activity-summary-title" className="sr-only">Activity summary</h2>
            <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border md:grid-cols-4">
              {[
              { label: "Awaiting reply", value: pendingInquiries, icon: MessageCircle, to: "/messages" },
              // Pointed at /profile, which has three tabs — profile,
              // notifications, security — and no bookings anywhere on it. The
              // count is of `booking_intents`, the retired WhatsApp handoff,
              // so the tile named a thing the app could not show you. /my-bookings
              // is now that page; the count still comes from the legacy rows
              // until someone decides whether it should count real bookings.
              { label: "Confirmed bookings", value: confirmedCount, icon: CalendarCheck, to: "/my-bookings" },
              { label: "Games hosted", value: userGames?.hosted?.length ?? 0, icon: Flag, to: "/games" },
              { label: "Games joined", value: userGames?.joined?.length ?? 0, icon: Users, to: "/games" },
              ].map((s) => (
              <Link
                key={s.label}
                to={s.to}
                className="group min-h-28 bg-card px-4 py-4 transition-colors duration-150 hover:bg-surface-1 focus-ring motion-reduce:transition-none sm:px-5 sm:py-5"
              >
                <div className="mb-3 flex items-center justify-between">
                  <s.icon className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-primary" />
                  {/* A zero is a prompt, not a score. Dimming it stops four
                      empty counters from reading as the loudest thing on a new
                      player's dashboard — but it was dimmed with
                      `text-muted-foreground/50`, which measures 2.68:1 on the
                      card against the 3:1 that 30px bold text needs. The
                      intent survives without the alpha: `text-muted-foreground`
                      is still visibly quieter than `text-foreground`, which is
                      the whole distinction being drawn. */}
                  {s.value > 0 && (
                    <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden="true" />
                  )}
                </div>
                <div
                  className={cn(
                    "stat-numeral text-3xl font-bold leading-none tabular-nums",
                    s.value > 0 ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  {s.value}
                </div>
                <div className="mt-1.5 text-sm text-muted-foreground">{s.label}</div>
              </Link>
              ))}
            </div>
          </section>

          {/* AI-powered Next Move — supplementary, so it follows the facts. */}
          <NextMoveCard />

          {/* Upcoming Plans + Games */}
          <section aria-labelledby="up-next-title" className="space-y-4">
            <div>
              <p className="mb-1 text-sm font-semibold text-primary">Up next</p>
              <h2 id="up-next-title" className="section-title mb-0">Plans that need your attention</h2>
            </div>
            <div className="grid gap-5 lg:grid-cols-2">
              <Card className="min-w-0">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle as="h3">Your games</CardTitle>
                <Link to="/games" className="focus-ring inline-flex min-h-11 items-center rounded-md px-2 text-sm font-semibold text-primary hover:text-primary/80">Find more</Link>
              </CardHeader>
              <CardContent className="space-y-3">
                {gamesLoading ? (
                  <div className="py-8 flex justify-center" role="status" aria-label="Loading your games">
                    <Loader2 className="h-5 w-5 animate-spin text-primary motion-reduce:animate-none" aria-hidden="true" />
                  </div>
                ) : upcomingGames.length > 0 ? (
                  upcomingGames.map((game) => (
                    <Link key={game.id} to={`/game/${game.id}`} className="focus-ring block rounded-lg">
                      <div className="rounded-lg border border-border p-3 transition-colors duration-150 hover:bg-surface-1 motion-reduce:transition-none">
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
                      <Button asChild size="sm" variant="outline">
                        <Link to="/games">Find games</Link>
                      </Button>
                      <Button asChild size="sm">
                        <Link to="/create-game"><Plus className="h-4 w-4 mr-1" />Create</Link>
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
              </Card>
              <UpcomingPlansCard />
            </div>
          </section>

          {/* Stats / Referrals / Matchmaking / Achievements */}
          <section aria-labelledby="progress-title" className="space-y-4">
            <div>
              <p className="mb-1 text-sm font-semibold text-primary">Your progress</p>
              <h2 id="progress-title" className="section-title mb-0">A clearer picture of how you play</h2>
            </div>
            <div className="grid gap-5 md:grid-cols-2">
              <SportsDNACard />
              <PlayerStatsCard />
            </div>
          </section>

          <section aria-labelledby="community-tools-title" className="space-y-4">
            <div>
              <p className="mb-1 text-sm font-semibold text-primary">Keep playing</p>
              <h2 id="community-tools-title" className="section-title mb-0">People, progress, and the next match</h2>
            </div>
            <div className="grid gap-5 md:grid-cols-2">
              <GameMatchmakingCard />
              <AchievementsSection />
            </div>
            <ReferralCard />
          </section>

          {/* AI Recs */}
          <AIRecommendations />
        </div>
      </div>
    </Layout>
  );
};

export default PlayerDashboard;
