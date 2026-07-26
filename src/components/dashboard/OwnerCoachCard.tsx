import { Sparkles, Loader2, AlertCircle, TrendingUp, MessageSquare, Image, Star, Eye } from "lucide-react";
import { TONE_CHIP } from "@/lib/chips";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useOwnerCoach, type OwnerNudge } from "@/hooks/useAIInsights";

const categoryIcon: Record<OwnerNudge["category"], React.ComponentType<{ className?: string }>> = {
  leads: TrendingUp,
  response: MessageSquare,
  listing: Image,
  reputation: Star,
  visibility: Eye,
};

const priorityStyles: Record<OwnerNudge["priority"], string> = {
  high: "bg-destructive/10 text-destructive border-destructive/20",
  medium: TONE_CHIP.warning,
  low: "bg-muted text-muted-foreground border-border",
};

export const OwnerCoachCard = () => {
  const { data, isLoading, error } = useOwnerCoach();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          AI Coach
        </CardTitle>
        <CardDescription>Personalized nudges to grow leads and improve listings.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="py-8 flex justify-center text-muted-foreground gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Analyzing your venues…
          </div>
        ) : error ? (
          <div className="py-8 text-center text-muted-foreground">
            <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Coach unavailable right now. Try again soon.</p>
          </div>
        ) : !data?.nudges?.length ? (
          <div className="py-8 text-center text-muted-foreground">
            <p className="text-sm">All clear. We'll surface insights as activity grows.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {data.nudges.map((n, i) => {
              const Icon = categoryIcon[n.category] ?? Sparkles;
              return (
                <div key={i} className="flex items-start gap-3 p-3 rounded-lg border border-border bg-card hover:bg-muted/40 transition-colors">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <p className="font-medium text-foreground">{n.title}</p>
                      <Badge variant="outline" className={priorityStyles[n.priority]}>
                        {n.priority}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{n.body}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
