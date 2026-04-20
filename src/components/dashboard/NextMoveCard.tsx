import { Link } from "react-router-dom";
import { Sparkles, ArrowRight, Loader2, Zap, Compass, CheckCircle2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { usePlayerNextMove } from "@/hooks/useAIInsights";

const vibeStyles = {
  urgent: { icon: Zap, color: "text-amber-500", bg: "from-amber-500/15 via-amber-500/5 to-transparent", chip: "bg-amber-500/15 text-amber-600 border-amber-500/20", label: "Action needed" },
  positive: { icon: CheckCircle2, color: "text-emerald-500", bg: "from-emerald-500/15 via-emerald-500/5 to-transparent", chip: "bg-emerald-500/15 text-emerald-600 border-emerald-500/20", label: "On track" },
  discovery: { icon: Compass, color: "text-primary", bg: "from-primary/15 via-primary/5 to-transparent", chip: "bg-primary/15 text-primary border-primary/20", label: "Discover" },
  neutral: { icon: Sparkles, color: "text-foreground", bg: "from-muted/40 via-muted/20 to-transparent", chip: "bg-muted text-muted-foreground border-border", label: "Suggestion" },
} as const;

export const NextMoveCard = () => {
  const { data, isLoading, error } = usePlayerNextMove();

  if (isLoading) {
    return (
      <Card className="border-primary/20">
        <CardContent className="py-10 flex items-center justify-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Thinking about your next move…
        </CardContent>
      </Card>
    );
  }

  if (error || !data) return null;
  const style = vibeStyles[data.vibe] ?? vibeStyles.neutral;
  const Icon = style.icon;

  return (
    <Card className={`relative overflow-hidden border-primary/20 bg-gradient-to-br ${style.bg}`}>
      <CardContent className="p-6 md:p-7">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className={`w-10 h-10 rounded-xl bg-background/60 backdrop-blur flex items-center justify-center ${style.color} shrink-0`}>
              <Icon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <Badge variant="outline" className={`mb-2 ${style.chip}`}>
                <Sparkles className="h-3 w-3 mr-1" /> {style.label}
              </Badge>
              <h3 className="text-xl md:text-2xl font-bold tracking-tight text-foreground">
                {data.headline}
              </h3>
              <p className="text-sm md:text-base text-muted-foreground mt-1">{data.detail}</p>
            </div>
          </div>
          <Button asChild size="lg" className="shrink-0">
            <Link to={data.cta_link}>
              {data.cta_label} <ArrowRight className="h-4 w-4 ml-1" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
