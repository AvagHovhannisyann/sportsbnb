import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Compass, MapPin, Star } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { formatPrice, getCustomerPrice } from "@/lib/pricing";

const AIRecommendations = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ["ai-recommendations"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("ai-venue-recommendations");
      if (error) throw error;
      return data;
    },
    staleTime: 10 * 60 * 1000, // 10 min
    retry: 1,
  });

  if (error) return null; // Silently fail - this is an enhancement
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="p-5 pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Compass className="h-5 w-5 text-primary" aria-hidden="true" />
            Venues for you
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 px-5 pb-5" role="status" aria-label="Finding venues for you">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="space-y-2 rounded-lg border border-border p-3">
              <div className="flex items-center justify-between gap-3">
                <Skeleton className="h-4 w-2/5" />
                <Skeleton className="h-6 w-16 rounded-full" />
              </div>
              <Skeleton className="h-3 w-4/5" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  const recommendations = data?.recommendations || [];
  if (recommendations.length === 0) return null;

  return (
    <Card>
      <CardHeader className="p-5 pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Compass className="h-5 w-5 text-primary" aria-hidden="true" />
          Venues for you
        </CardTitle>
      </CardHeader>
      <CardContent className="px-5 pb-5">
        <ul className="divide-y divide-border">
          {recommendations.slice(0, 4).map((rec: any) => (
            <li key={rec.venue_id}>
              <Link
                to={`/venue/${rec.venue_id}`}
                className="group flex min-h-20 items-start gap-3 rounded-lg px-2 py-3 outline-none transition-colors duration-150 motion-reduce:transition-none hover:bg-surface-1 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card"
              >
                <span className="min-w-0 flex-1">
                  <span className="mb-1 flex items-center gap-2">
                    <span className="truncate text-sm font-semibold text-foreground">{rec.venue?.name}</span>
                    <Badge variant="secondary" className="shrink-0 text-xs">
                      {rec.match_score}% match
                    </Badge>
                  </span>
                  <span className="mb-1.5 block line-clamp-2 text-xs leading-5 text-muted-foreground">
                    {rec.reason}
                  </span>
                  <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    {rec.venue?.city && (
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-3 w-3" aria-hidden="true" />
                        {rec.venue.city}
                      </span>
                    )}
                    {rec.venue?.rating > 0 && (
                      <span className="inline-flex items-center gap-1">
                        <Star className="h-3 w-3 fill-warning text-warning" aria-hidden="true" />
                        {Number(rec.venue.rating).toFixed(1)}
                      </span>
                    )}
                    <span className="font-semibold text-foreground">
                      {formatPrice(getCustomerPrice(rec.venue?.price_per_hour || 0))}/hr
                    </span>
                  </span>
                </span>
                <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-150 motion-reduce:transition-none group-hover:translate-x-0.5 motion-reduce:group-hover:translate-x-0" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
};

export default AIRecommendations;
