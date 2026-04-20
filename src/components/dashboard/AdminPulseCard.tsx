import { Sparkles, Loader2, TrendingUp, Activity, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAdminPulse } from "@/hooks/useAIInsights";

const healthStyles = {
  healthy: { icon: CheckCircle2, chip: "bg-emerald-500/15 text-emerald-600 border-emerald-500/20", label: "Healthy" },
  watch: { icon: Activity, chip: "bg-amber-500/15 text-amber-600 border-amber-500/20", label: "Watch" },
  concern: { icon: AlertTriangle, chip: "bg-destructive/15 text-destructive border-destructive/20", label: "Concern" },
} as const;

export const AdminPulseCard = () => {
  const { data, isLoading, error } = useAdminPulse();

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-10 flex items-center justify-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Generating marketplace brief…
        </CardContent>
      </Card>
    );
  }

  if (error || !data?.brief) return null;
  const style = healthStyles[data.brief.health] ?? healthStyles.watch;
  const HIcon = style.icon;

  return (
    <Card className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-primary/20">
      <CardHeader>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              AI Marketplace Pulse
            </CardTitle>
            <CardDescription>Weekly executive brief on supply, demand and growth.</CardDescription>
          </div>
          <Badge variant="outline" className={style.chip}>
            <HIcon className="h-3 w-3 mr-1" /> {style.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <p className="text-lg md:text-xl font-semibold tracking-tight text-foreground">
          {data.brief.headline}
        </p>
        {data.brief.trends?.length > 0 && (
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1">
              <TrendingUp className="h-3 w-3" /> Trends
            </p>
            <ul className="space-y-1.5 text-sm text-foreground">
              {data.brief.trends.map((t, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-primary">•</span>
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {data.brief.actions?.length > 0 && (
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
              Recommended actions
            </p>
            <ul className="space-y-1.5 text-sm text-foreground">
              {data.brief.actions.map((a, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-primary">→</span>
                  <span>{a}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
