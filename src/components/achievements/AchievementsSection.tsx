import { useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import {
  useAchievements,
  useUserAchievements,
  useLeaderboard,
  useCheckAndAwardAchievements,
} from "@/hooks/useAchievements";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy, Medal, Target, Flag, Users } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const AchievementsSection = () => {
  const { user, profile, refreshProfile } = useAuth();
  const { data: achievements = [], isLoading: achLoading } = useAchievements();
  const { data: userAchievements = [], isLoading: uaLoading } = useUserAchievements(user?.id);
  const { data: leaderboard = [], isLoading: lbLoading } = useLeaderboard();

  /**
   * Ask the server to award anything that has been earned.
   *
   * `check_and_award_achievements` is the only thing in the entire system that
   * can write `user_achievements` or raise `profiles.xp` — the client INSERT
   * policy was dropped in Phase 1 and `protect_profile_xp` rejects any other
   * writer — and nothing had ever called it. Not once, in any version of this
   * file: the mutation was defined and imported nowhere. So a player could book
   * venues, host games and write reviews and their card would read Level 1,
   * 0 XP, 0 badges, every tile greyed out, permanently. The leaderboard was
   * empty for a second, independent reason, since it filters `xp > 0` and no
   * profile's XP could ever leave 0.
   *
   * On mount is the modest version of the fix and it is enough to make the
   * feature exist. The RPC is idempotent — it skips achievements already held
   * and inserts ON CONFLICT DO NOTHING — so calling it whenever this card is
   * opened is safe. Awarding at the moment a badge is *earned* (after a
   * booking confirms, after a game is joined) would be better and is a
   * separate change to those flows.
   */
  const checkAchievements = useCheckAndAwardAchievements();
  const asked = useRef(false);
  useEffect(() => {
    if (!user?.id || asked.current) return;
    asked.current = true;
    // `refreshProfile`, not a query invalidation: useAuth holds the profile in
    // React state, so the Level and XP figures at the top of this card come
    // from there and nothing in TanStack Query can refresh them. Only when the
    // RPC actually awarded something — otherwise this is a wasted round trip on
    // every visit to the dashboard.
    checkAchievements.mutate(undefined, {
      onSuccess: (awarded) => {
        if (Array.isArray(awarded) && awarded.length > 0) void refreshProfile();
      },
    });
    // `checkAchievements` is a new object each render; keying on the user id is
    // what makes this once per player rather than once per render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const earnedIds = new Set(userAchievements.map((ua: any) => ua.achievement_id));
  const xp = (profile as any)?.xp || 0;
  const level = (profile as any)?.level || 1;
  const xpToNext = (level * 100) - xp;
  const xpProgress = ((xp % 100) / 100) * 100;

  if (achLoading || uaLoading) {
    return (
      <Card>
        <CardContent className="p-6 space-y-4" role="status" aria-label="Loading achievements">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* XP & Level */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Trophy className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-display text-lg font-semibold text-foreground">Level {level}</h3>
                <p className="text-sm text-muted-foreground">{xp} XP total</p>
              </div>
            </div>
            <Badge variant="secondary" className="text-sm">
              {earnedIds.size}/{achievements.length} badges
            </Badge>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Progress to Level {level + 1}</span>
              <span>{xpToNext > 0 ? `${xpToNext} XP needed` : "Ready!"}</span>
            </div>
            <Progress value={xpProgress} className="h-2" />
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="badges">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="badges">Achievements</TabsTrigger>
          <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
        </TabsList>

        <TabsContent value="badges" className="mt-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {achievements.map((ach: any) => {
              const earned = earnedIds.has(ach.id);
              const AchievementIcon = achievementIcons[ach.category as keyof typeof achievementIcons] ?? Trophy;
              return (
                <Card key={ach.id} className={earned ? "border-primary/30 bg-primary-soft" : "bg-surface-1"}>
                  <CardContent className="p-4 text-center">
                    <div className={cn(
                      "mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-lg border",
                      earned
                        ? "border-primary/20 bg-card text-primary"
                        : "border-border bg-card text-muted-foreground",
                    )}>
                      <AchievementIcon className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <h4 className="font-semibold text-sm text-foreground">{ach.name}</h4>
                    <p className="text-xs text-muted-foreground mt-1">{ach.description}</p>
                    <Badge variant={earned ? "default" : "outline"} className="mt-2 text-xs">
                      {earned ? `Earned · +${ach.xp_reward} XP` : `Locked · ${ach.xp_reward} XP`}
                    </Badge>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="leaderboard" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Medal className="h-5 w-5 text-primary" />
                Top Players
              </CardTitle>
            </CardHeader>
            <CardContent>
              {lbLoading ? (
                <div className="space-y-3" role="status" aria-label="Loading the leaderboard">
                  {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
                </div>
              ) : leaderboard.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No players on the leaderboard yet</p>
              ) : (
                <div className="space-y-3">
                  {leaderboard.map((player: any, i: number) => (
                    <div key={player.user_id} className="flex items-center gap-3">
                      {/* Was 🥇🥈🥉 for the top three and `#4` onward — four
                          ranks in one column drawn in two different fonts at
                          two different sizes, so the medals sat a few pixels
                          off the numerals' baseline. Every rank is a numeral
                          now; the top three get a tinted disc instead, which
                          reads at a glance without depending on colour alone
                          since the number is right there. */}
                      <div
                        className={cn(
                          "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-bold tabular-nums",
                          i === 0 && "bg-warning/15 text-warning",
                          i === 1 && "bg-muted-foreground/15 text-foreground",
                          i === 2 && "bg-chart-4/15 text-chart-4",
                          i > 2 && "text-muted-foreground",
                        )}
                      >
                        {i + 1}
                      </div>
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={player.avatar_url || undefined} />
                        <AvatarFallback className="text-xs">{player.full_name?.[0] || "?"}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{player.full_name || "Player"}</p>
                        <p className="text-xs text-muted-foreground">{player.city || "—"}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-foreground">{player.xp} XP</p>
                        <p className="text-xs text-muted-foreground">Lvl {player.level}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AchievementsSection;

const achievementIcons = {
  booking: Target,
  games: Trophy,
  hosting: Flag,
  social: Users,
} as const;
