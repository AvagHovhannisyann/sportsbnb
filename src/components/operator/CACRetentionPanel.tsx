import { Activity, AlertTriangle, CheckCircle2, UsersRound, type LucideIcon } from "lucide-react";
import { StatusPanel } from "@/components/common/StatusPanel";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { type RetentionMetrics } from "@/hooks/useOperatorMetrics";
import { type ChipTone, TONE_CHIP } from "@/lib/chips";
import { cn } from "@/lib/utils";

export function CACRetentionPanel({ metrics }: { metrics: RetentionMetrics }) {
  const activation = Math.round(metrics.activationRate * 100);
  const rebook = Math.round(metrics.rebookRate * 100);
  const rebookHealthy = rebook >= 40;
  const hasCohort =
    metrics.newUsers30d > 0 ||
    metrics.newUsersWithBooking > 0 ||
    metrics.rebookers14d > 0;

  return (
    <Card className="min-w-0">
      <CardHeader className="p-5 pb-3 sm:p-6 sm:pb-3">
        <CardTitle as="h2" className="text-lg">
          Activation and retention
        </CardTitle>
        <CardDescription className="mt-1.5">
          Whether recent signups reach a first booking and return within 14 days.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-5 pt-0 sm:p-6 sm:pt-0">
        {!hasCohort ? (
          <StatusPanel
            icon={UsersRound}
            title="No recent user cohort"
            description="Activation and rebooking rates will appear after a new user enters the 30-day cohort."
            className="py-9"
          />
        ) : (
          <div className="space-y-6">
            <RateStat
              label="Signup to first booking"
              value={`${activation}%`}
              description={`${metrics.newUsersWithBooking.toLocaleString()} of ${metrics.newUsers30d.toLocaleString()} new users booked`}
              progress={activation}
              status="30-day cohort"
              statusTone="neutral"
              icon={Activity}
            />
            <div className="border-t border-border pt-6">
              <RateStat
                label="14-day rebook rate"
                value={`${rebook}%`}
                description={`${metrics.rebookers14d.toLocaleString()} users booked again within 14 days · target 40%+`}
                progress={rebook}
                status={rebookHealthy ? "On target" : "Below target"}
                statusTone={rebookHealthy ? "positive" : "warning"}
                icon={rebookHealthy ? CheckCircle2 : AlertTriangle}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function RateStat({
  label,
  value,
  description,
  progress,
  status,
  statusTone,
  icon: Icon,
}: {
  label: string;
  value: string;
  description: string;
  progress: number;
  status: string;
  statusTone: ChipTone;
  icon: LucideIcon;
}) {
  const boundedProgress = Math.min(100, Math.max(0, progress));
  const valueTone =
    statusTone === "positive"
      ? "text-success"
      : statusTone === "warning"
        ? "text-warning"
        : "text-foreground";
  const indicatorTone =
    statusTone === "positive"
      ? "[&>div]:bg-success"
      : statusTone === "warning"
        ? "[&>div]:bg-warning"
        : "[&>div]:bg-primary";

  return (
    <section aria-label={label}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold leading-5 text-foreground">{label}</h3>
          <Badge variant="outline" className={cn("mt-2", TONE_CHIP[statusTone])}>
            <Icon aria-hidden="true" className="h-3.5 w-3.5" />
            {status}
          </Badge>
        </div>
        <p className={cn("stat-numeral text-3xl font-semibold leading-none", valueTone)}>
          {value}
        </p>
      </div>
      <Progress
        value={boundedProgress}
        aria-label={`${label}: ${value}`}
        className={cn("mt-4 h-2", indicatorTone)}
      />
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{description}</p>
    </section>
  );
}
