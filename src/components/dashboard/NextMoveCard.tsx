import { Link } from "react-router-dom";
import { TONE_CHIP } from "@/lib/chips";
import { Sparkles, ArrowRight, Zap, Compass, CheckCircle2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { usePlayerNextMove } from "@/hooks/useAIInsights";

const vibeStyles = {
  urgent: { icon: Zap, color: "text-warning", surface: "bg-warning/5", chip: TONE_CHIP.warning, label: "Action needed" },
  positive: { icon: CheckCircle2, color: "text-success", surface: "bg-success/5", chip: TONE_CHIP.positive, label: "On track" },
  discovery: { icon: Compass, color: "text-primary", surface: "bg-primary-soft", chip: "bg-primary/10 text-primary border-primary/20", label: "Discover" },
  neutral: { icon: Sparkles, color: "text-foreground-soft", surface: "bg-surface-1", chip: "bg-muted text-muted-foreground border-border", label: "Suggestion" },
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
      <Card aria-hidden="true">
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
    <Card className={style.surface}>
      <CardContent className="p-5 sm:p-6 md:p-7">
        <div className="flex flex-col items-stretch gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-card ${style.color}`}>
              <Icon className="h-5 w-5" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <Badge variant="outline" className={`mb-2 ${style.chip}`}>
                <Sparkles className="mr-1 h-3 w-3" aria-hidden="true" /> {style.label}
              </Badge>
              <h2 className="font-display text-xl font-semibold tracking-tight text-foreground md:text-2xl">
                {data.headline}
              </h2>
              <p className="mt-1 text-sm text-foreground-soft md:text-base">{data.detail}</p>
            </div>
          </div>
          <Button asChild className="w-full shrink-0 sm:w-auto">
            <Link to={data.cta_link}>
              {data.cta_label} <ArrowRight className="ml-1 h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
