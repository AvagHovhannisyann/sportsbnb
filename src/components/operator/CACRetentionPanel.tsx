import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { RetentionMetrics } from "@/hooks/useOperatorMetrics";

export function CACRetentionPanel({ metrics }: { metrics: RetentionMetrics }) {
  const activation = Math.round(metrics.activationRate * 100);
  const rebook = Math.round(metrics.rebookRate * 100);
  const rebookHealthy = rebook >= 40;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Activation & retention</CardTitle>
        <CardDescription>How new users convert and come back</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Stat
          label="New signups → first booking"
          value={`${activation}%`}
          sub={`${metrics.newUsersWithBooking} of ${metrics.newUsers30d} new users booked`}
          progress={activation}
          tone="neutral"
        />
        <Stat
          label="14-day rebook rate"
          value={`${rebook}%`}
          sub={`${metrics.rebookers14d} users booked again within 14 days · target 40%+`}
          progress={rebook}
          tone={rebookHealthy ? "good" : "warn"}
        />
      </CardContent>
    </Card>
  );
}

function Stat({
  label,
  value,
  sub,
  progress,
  tone,
}: {
  label: string;
  value: string;
  sub: string;
  progress: number;
  tone: "good" | "warn" | "neutral";
}) {
  const color =
    tone === "good" ? "text-green-500" : tone === "warn" ? "text-amber-500" : "text-foreground";
  return (
    <div>
      <div className="flex items-baseline justify-between mb-2">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className={`text-2xl font-semibold tabular-nums ${color}`}>{value}</span>
      </div>
      <Progress value={progress} className="h-1.5" />
      <p className="text-xs text-muted-foreground mt-2">{sub}</p>
    </div>
  );
}
