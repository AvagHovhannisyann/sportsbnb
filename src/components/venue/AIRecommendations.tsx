import { useQuery } from "@tanstack/react-query";
import { Sparkles, Star, MapPin, ArrowRight, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Recommended for You
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span className="ml-2 text-sm text-muted-foreground">Finding perfect venues...</span>
        </CardContent>
      </Card>
    );
  }

  const recommendations = data?.recommendations || [];
  if (recommendations.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Recommended for You
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {recommendations.slice(0, 4).map((rec: any) => (
          <Link key={rec.venue_id} to={`/venue/${rec.venue_id}`}>
            <div className="flex items-start gap-3 p-3 rounded-lg border border-border hover:border-primary/30 hover:bg-muted/50 transition-colors">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-medium text-foreground text-sm truncate">{rec.venue?.name}</h4>
                  <Badge variant="secondary" className="text-xs shrink-0">
                    {rec.match_score}% match
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mb-1">{rec.reason}</p>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  {rec.venue?.city && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {rec.venue.city}
                    </span>
                  )}
                  {rec.venue?.rating > 0 && (
                    <span className="flex items-center gap-1">
                      <Star className="h-3 w-3 fill-primary text-primary" />
                      {rec.venue.rating}
                    </span>
                  )}
                  <span className="font-medium text-foreground">
                    {formatPrice(getCustomerPrice(rec.venue?.price_per_hour || 0))}/hr
                  </span>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
            </div>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
};

export default AIRecommendations;
