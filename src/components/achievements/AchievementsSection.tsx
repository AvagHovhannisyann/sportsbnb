import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { useAchievements, useUserAchievements, useLeaderboard } from "@/hooks/useAchievements";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy, Medal } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const AchievementsSection = () => {
  const { user, profile } = useAuth();
  const { data: achievements = [], isLoading: achLoading } = useAchievements();
  const { data: userAchievements = [], isLoading: uaLoading } = useUserAchievements(user?.id);
  const { data: leaderboard = [], isLoading: lbLoading } = useLeaderboard();

  const earnedIds = new Set(userAchievements.map((ua: any) => ua.achievement_id));
  const xp = (profile as any)?.xp || 0;
  const level = (profile as any)?.level || 1;
  const xpToNext = (level * 100) - xp;
  const xpProgress = ((xp % 100) / 100) * 100;

  if (achLoading || uaLoading) {
    return (
      <Card>
        <CardContent className="p-6 space-y-4">
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
                <h3 className="font-bold text-lg text-foreground">Level {level}</h3>
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
              return (
                <Card key={ach.id} className={earned ? "border-primary/30 bg-primary/5" : "opacity-60"}>
                  <CardContent className="p-4 text-center">
                    <div className="text-3xl mb-2">{ach.icon}</div>
                    <h4 className="font-semibold text-sm text-foreground">{ach.name}</h4>
                    <p className="text-xs text-muted-foreground mt-1">{ach.description}</p>
                    <Badge variant={earned ? "default" : "outline"} className="mt-2 text-xs">
                      {earned ? `+${ach.xp_reward} XP` : `${ach.xp_reward} XP`}
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
                <div className="space-y-3">
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
