import { Trophy, Target, Calendar, Dumbbell, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { usePlayerStats } from "@/hooks/usePlayerStats";
import { StatusPanel } from "@/components/common/StatusPanel";
import { format } from "date-fns";

const PlayerStatsCard = () => {
  const { stats, isLoading, isError } = usePlayerStats();

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center" role="status" aria-label="Loading">
          <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary motion-reduce:animate-none" aria-hidden="true" />
        </CardContent>
      </Card>
    );
  }

  // Failure used to be indistinguishable from "no stats yet": the hook
  // swallowed the error and the card returned null, so it simply vanished off
  // the dashboard with nothing to say it had tried.
  if (isError) {
    return (
      <Card>
        <CardContent className="p-0">
          <StatusPanel
            icon={Dumbbell}
            title="Stats unavailable"
            description="We couldn't load your player stats just now. Everything else on this page is unaffected."
            className="py-10"
          />
        </CardContent>
      </Card>
    );
  }

  if (!stats) return null;

  // `{value}` renders nothing when a field is undefined, so an unexpected
  // response shape produced three icons and three labels with blank gaps where
  // the numbers belong — a card that looks broken rather than empty. The RPC
  // result is cast straight to PlayerStats with `as unknown as`, which means
  // nothing checks it; defaulting here is the cheap half of that fix.
  const statItems = [
    { icon: Trophy, label: "Games Played", value: stats.games_played ?? 0, color: "text-warning" },
    { icon: Target, label: "Games Hosted", value: stats.games_hosted ?? 0, color: "text-primary" },
    { icon: Calendar, label: "Total Bookings", value: stats.total_bookings ?? 0, color: "text-success" },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle as="h3" className="flex items-center gap-2">
          <Dumbbell className="h-5 w-5 text-primary" aria-hidden="true" />
          Player stats
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 divide-x divide-border rounded-lg border border-border bg-surface-1">
          {statItems.map(({ icon: Icon, label, value, color }) => (
            <div key={label} className="min-w-0 px-2 py-4 text-center sm:px-3">
              <Icon className={`mx-auto mb-2 h-5 w-5 ${color}`} aria-hidden="true" />
              <div className="stat-numeral text-2xl font-bold tabular-nums text-foreground">{value}</div>
              <div className="mt-1 text-[11px] leading-4 text-muted-foreground sm:text-xs">{label}</div>
            </div>
          ))}
        </div>

        {stats.sports_played && stats.sports_played.length > 0 && (
          <div>
            <div className="mb-2 text-sm font-semibold text-foreground-soft">Sports played</div>
            <div className="flex flex-wrap gap-1.5">
              {stats.sports_played.map((sport) => (
                <Badge key={sport} variant="secondary" className="text-xs">
                  {sport}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {stats.member_since && (
          <div className="text-xs text-muted-foreground pt-2 border-t border-border">
            Member since {format(new Date(stats.member_since), "MMMM yyyy")}
          </div>
        )}

        {stats.referral_credits > 0 && (
          <div className="flex items-center justify-between pt-2 border-t border-border">
            <span className="text-sm text-muted-foreground">Referral credits</span>
            <Badge variant="default">֏{stats.referral_credits.toLocaleString()}</Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PlayerStatsCard;
