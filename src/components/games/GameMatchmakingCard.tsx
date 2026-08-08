import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorPanel } from "@/components/common/StatusPanel";
import { Sparkles, MapPin, Calendar, Users } from "lucide-react";
import { useGameMatchmaking } from "@/hooks/useGameMatchmaking";
import { format } from "date-fns";

interface GameMatch {
  id: string;
  sport: string;
  skill_level: string;
  title: string;
  max_players: number;
  game_date: string;
  location: string;
  matchReason: string;
}

const GameMatchmakingCard = () => {
  const { data: matches = [], isLoading, isError, refetch, isFetching } = useGameMatchmaking();

  return (
    <Card>
      <CardHeader className="p-5 pb-3">
        <CardTitle as="h2" className="flex items-center gap-2 text-lg">
          <Sparkles className="h-4 w-4 text-primary" aria-hidden="true" />
          Recommended Games
        </CardTitle>
      </CardHeader>
      <CardContent className="p-5 pt-0">
        {isLoading ? (
          <div className="space-y-3" role="status" aria-label="Loading match suggestions">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
          </div>
        ) : isError ? (
          /* Not "no matches found". The hook rethrows, so a failed edge
             function left `data` undefined and the empty-state branch told a
             player there were no games suited to them — the same
             failure-reported-as-emptiness that had owners believing they had
             no venues and customers believing a venue was closed. */
          <ErrorPanel
            what="your recommendations"
            description="This is a suggestion service, so nothing else on your dashboard is affected."
            onRetry={() => refetch()}
            isRetrying={isFetching}
            className="py-6"
          >
            <Button variant="outline" asChild>
              <Link to="/games">Browse all games</Link>
            </Button>
          </ErrorPanel>
        ) : matches.length === 0 ? (
          <div className="py-8 text-center">
            <p className="mb-4 text-sm leading-relaxed text-muted-foreground">No matches found right now</p>
            <Button asChild variant="outline">
              <Link to="/games">Browse all games</Link>
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-border overflow-hidden rounded-lg border border-border">
            {matches.slice(0, 3).map((game: GameMatch) => (
              <Link
                key={game.id}
                to={`/game/${game.id}`}
                className="block touch-manipulation p-4 outline-none transition-[background-color,color] duration-150 ease-out motion-reduce:transition-none hover:bg-surface-1 focus-visible:bg-surface-1 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
              >
                <div className="mb-2 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
                      <Badge variant="secondary" className="text-xs">{game.sport}</Badge>
                      <Badge variant="outline" className="text-xs capitalize">{game.skill_level}</Badge>
                    </div>
                    <h3 className="truncate text-sm font-semibold text-foreground">{game.title}</h3>
                  </div>
                  <div className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                    <Users className="h-3.5 w-3.5" aria-hidden="true" />
                    <span className="tabular-nums">{game.max_players}</span>
                  </div>
                </div>
                <div className="mb-2 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
                    {format(new Date(game.game_date), "MMM d")}
                  </span>
                  <span className="flex min-w-0 items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    <span className="truncate">{game.location}</span>
                  </span>
                </div>
                <p className="flex items-start gap-1.5 text-xs leading-relaxed text-foreground-soft">
                  <Sparkles className="mt-0.5 h-3 w-3 shrink-0 text-primary" aria-hidden="true" />
                  <span>{game.matchReason}</span>
                </p>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default GameMatchmakingCard;
