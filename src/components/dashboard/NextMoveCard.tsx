import { Link } from "react-router-dom";
import { TONE_CHIP } from "@/lib/chips";
import { Sparkles, ArrowRight, Zap, Compass, CheckCircle2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { usePlayerNextMove } from "@/hooks/useAIInsights";

const vibeStyles = {
  urgent: { icon: Zap, color: "text-amber-500", bg: "from-amber-500/15 via-amber-500/5 to-transparent", chip: TONE_CHIP.warning, label: "Action needed" },
  positive: { icon: CheckCircle2, color: "text-emerald-500", bg: "from-emerald-500/15 via-emerald-500/5 to-transparent", chip: TONE_CHIP.positive, label: "On track" },
  discovery: { icon: Compass, color: "text-primary", bg: "from-primary/15 via-primary/5 to-transparent", chip: "bg-primary/15 text-primary border-primary/20", label: "Discover" },
  neutral: { icon: Sparkles, color: "text-foreground", bg: "from-muted/40 via-muted/20 to-transparent", chip: "bg-muted text-muted-foreground border-border", label: "Suggestion" },
} as const;

export const NextMoveCard = () => {
  const { data, isLoading, error } = usePlayerNextMove();

  // A skeleton in the resolved card's own shape, not a spinner with a caption.
  //
  // This is an LLM edge function, so it is measured in seconds, and it used to
  // hold the very top of the logged-in dashboard with a 100px band reading
  // "Thinking about your next move…" — above the player's own bookings, games
  // and stats, all of which are already in cache. It also rendered at a
  // different height than the card it becomes, so arriving suggestions shoved
  // the page down.
  //
  // It now sits below the deterministic signal strip (see PlayerDashboard) and
  // reserves close to its final height, so a suggestion appears in place
  // rather than displacing the content underneath it.
  if (isLoading) {
    return (
      <Card className="border-primary/20" aria-hidden="true">
        <CardContent className="p-6 md:p-7">
          <div className="flex items-start gap-3">
            <Skeleton className="h-10 w-10 shrink-0 rounded-xl bg-surface-2" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-5 w-28 rounded-full bg-surface-2" />
              <Skeleton className="h-7 w-3/5 bg-surface-3" />
              <Skeleton className="h-4 w-2/5 bg-surface-2" />
            </div>
            <Skeleton className="h-11 w-32 shrink-0 rounded-md bg-surface-2" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // No gravestone when there is nothing to suggest. The owner-side coach card
  // does show an error state, but it is a titled panel the owner went looking
  // for; this is an unsolicited suggestion, and "we have no suggestion" is not
  // worth a card.
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
