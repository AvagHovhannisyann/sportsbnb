import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorPanel } from "@/components/common/StatusPanel";
import { Sparkles, MapPin, Calendar, Users } from "lucide-react";
import { useGameMatchmaking } from "@/hooks/useGameMatchmaking";
import { format } from "date-fns";

const GameMatchmakingCard = () => {
  const { data: matches = [], isLoading, isError, refetch, isFetching } = useGameMatchmaking();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Recommended Games
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
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
            <Button variant="outline" size="sm" asChild>
              <Link to="/games">Browse all games</Link>
            </Button>
          </ErrorPanel>
        ) : matches.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-sm text-muted-foreground mb-3">No matches found right now</p>
            <Button asChild variant="outline" size="sm">
              <Link to="/games">Browse all games</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {matches.slice(0, 3).map((game: any) => (
              <Link key={game.id} to={`/game/${game.id}`}>
                <div className="p-3 rounded-lg border hover:bg-accent/50 transition-colors">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="secondary" className="text-xs">{game.sport}</Badge>
                        <Badge variant="outline" className="text-xs capitalize">{game.skill_level}</Badge>
                      </div>
                      <h4 className="font-medium text-sm text-foreground">{game.title}</h4>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Users className="h-3 w-3" />
                      {game.max_players}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mb-2">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {format(new Date(game.game_date), "MMM d")}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {game.location}
                    </span>
                  </div>
                  <p className="text-xs text-primary italic">{game.matchReason}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default GameMatchmakingCard;
