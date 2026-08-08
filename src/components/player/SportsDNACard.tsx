import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Sparkles, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ErrorPanel } from "@/components/common/StatusPanel";

/**
 * Spotify-Wrapped style breakdown of the player's sports identity:
 * top sports, favorite time-of-day, top venues. Pure aggregation —
 * no AI cost, no fake numbers.
 */
export function SportsDNACard() {
  const { user } = useAuth();

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
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
      // Rethrow. `?? []` on both of these meant a failed request aggregated
      // to nothing and rendered "your sports identity will appear here" — an
      // active player told their history was empty because a query errored.
      if (games.error) throw games.error;
      if (intents.error) throw intents.error;
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
    <Card>
      <CardHeader>
        <CardTitle as="h3" className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" aria-hidden="true" />
          Your sports pattern
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {isLoading ? (
          <div className="py-8 flex justify-center" role="status" aria-label="Loading your sports profile">
            <Loader2 className="h-5 w-5 animate-spin text-primary motion-reduce:animate-none" aria-hidden="true" />
          </div>
        ) : isError ? (
          <ErrorPanel
            what="your sports history"
            description="Your bookings and games are unaffected — this panel just summarises them."
            onRetry={() => refetch()}
            isRetrying={isFetching}
            className="py-4"
          />
        ) : !dna || (dna.totalSports === 0 && dna.totalTime === 0) ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            Book a court or join a game — your sports identity will appear here.
          </p>
        ) : (
          <>
            <div>
              <div className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Top sports</div>
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
              <div className="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Favorite time · <span className="font-semibold text-foreground">{dna.favoriteTime}</span>
              </div>
              <div className="space-y-2.5">
                {Object.entries(dna.timeBuckets).map(([label, value]) => {
                  const pct = dna.totalTime ? (value / dna.totalTime) * 100 : 0;
                  return (
                    <div key={label} className="grid grid-cols-[5rem_minmax(0,1fr)_2.5rem] items-center gap-2">
                      <span className="text-xs text-muted-foreground">{label}</span>
                      <Progress
                        value={pct}
                        className="h-1.5"
                        aria-label={`${label}: ${value} ${value === 1 ? "activity" : "activities"}`}
                      />
                      <div className="text-right text-xs tabular-nums text-muted-foreground">
                        {Math.round(pct)}%
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <div className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Top venues</div>
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
