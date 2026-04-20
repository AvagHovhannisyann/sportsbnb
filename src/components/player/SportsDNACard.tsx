import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Sparkles, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

/**
 * Spotify-Wrapped style breakdown of the player's sports identity:
 * top sports, favorite time-of-day, top venues. Pure aggregation —
 * no AI cost, no fake numbers.
 */
export function SportsDNACard() {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["sports-dna", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const [games, intents] = await Promise.all([
        supabase
          .from("game_participants")
          .select("game_id, games!inner(sport, game_time, location)")
          .eq("user_id", user!.id)
          .limit(200),
        supabase
          .from("booking_intents")
          .select("venue_name, booking_time, created_at")
          .eq("user_id", user!.id)
          .limit(200),
      ]);
      return {
        games: (games.data ?? []) as Array<{ games: { sport: string; game_time: string; location: string } }>,
        intents: intents.data ?? [],
      };
    },
  });

  const dna = useMemo(() => {
    if (!data) return null;
    const sportCounts = new Map<string, number>();
    const timeBuckets = { Morning: 0, Afternoon: 0, Evening: 0, Night: 0 };
    const venueCounts = new Map<string, number>();

    for (const g of data.games) {
      const sport = g.games?.sport;
      if (sport) sportCounts.set(sport, (sportCounts.get(sport) ?? 0) + 1);
      const t = g.games?.game_time;
      if (t) bucketTime(t, timeBuckets);
      const loc = g.games?.location;
      if (loc) venueCounts.set(loc, (venueCounts.get(loc) ?? 0) + 1);
    }
    for (const i of data.intents) {
      if (i.venue_name) venueCounts.set(i.venue_name, (venueCounts.get(i.venue_name) ?? 0) + 1);
      if (i.booking_time) bucketTime(i.booking_time, timeBuckets);
    }

    const topSports = [...sportCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4);
    const topVenues = [...venueCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
    const totalTime = Object.values(timeBuckets).reduce((a, b) => a + b, 0);
    const favoriteTime = (Object.entries(timeBuckets).sort((a, b) => b[1] - a[1])[0] ?? ["—", 0])[0];
    const totalSports = [...sportCounts.values()].reduce((a, b) => a + b, 0);

    return { topSports, topVenues, timeBuckets, totalTime, favoriteTime, totalSports };
  }, [data]);

  return (
    <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary/5 via-background to-background">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Your Sports DNA
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {isLoading ? (
          <div className="py-8 flex justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        ) : !dna || (dna.totalSports === 0 && dna.totalTime === 0) ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            Play a game or send an inquiry — your sports identity will appear here.
          </p>
        ) : (
          <>
            <div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Top sports</div>
              <div className="flex flex-wrap gap-1.5">
                {dna.topSports.length > 0 ? (
                  dna.topSports.map(([sport, count], i) => (
                    <Badge key={sport} variant={i === 0 ? "default" : "secondary"} className="text-xs">
                      {sport} · {count}
                    </Badge>
                  ))
                ) : (
                  <span className="text-sm text-muted-foreground">No games played yet</span>
                )}
              </div>
            </div>

            <div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">
                Favorite time · <span className="text-foreground font-medium">{dna.favoriteTime}</span>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {Object.entries(dna.timeBuckets).map(([label, value]) => {
                  const pct = dna.totalTime ? (value / dna.totalTime) * 100 : 0;
                  return (
                    <div key={label} className="space-y-1">
                      <div className="h-16 rounded-md bg-muted relative overflow-hidden">
                        <div
                          className="absolute bottom-0 left-0 right-0 bg-primary/80 transition-all"
                          style={{ height: `${pct}%` }}
                        />
                      </div>
                      <div className="text-[10px] text-center text-muted-foreground">{label}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Top venues</div>
              {dna.topVenues.length > 0 ? (
                <ol className="space-y-1.5">
                  {dna.topVenues.map(([name, count], i) => (
                    <li key={name} className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 min-w-0">
                        <span className="text-xs font-bold text-primary tabular-nums w-4">{i + 1}.</span>
                        <span className="truncate text-foreground">{name}</span>
                      </span>
                      <span className="text-xs text-muted-foreground tabular-nums">{count} visit{count > 1 ? "s" : ""}</span>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-sm text-muted-foreground">No venues yet.</p>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function bucketTime(time: string, buckets: { Morning: number; Afternoon: number; Evening: number; Night: number }) {
  const hour = parseInt(time.split(":")[0] ?? "0", 10);
  if (Number.isNaN(hour)) return;
  if (hour >= 5 && hour < 12) buckets.Morning++;
  else if (hour >= 12 && hour < 17) buckets.Afternoon++;
  else if (hour >= 17 && hour < 22) buckets.Evening++;
  else buckets.Night++;
}
