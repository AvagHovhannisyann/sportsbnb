import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  ClipboardCheck,
} from "lucide-react";
import { TONE_CHIP } from "@/lib/chips";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorPanel, StatusPanel } from "@/components/common/StatusPanel";
import { useAdminPulse } from "@/hooks/useAIInsights";

const healthStyles = {
  healthy: { icon: CheckCircle2, chip: TONE_CHIP.positive, label: "Healthy" },
  watch: { icon: Activity, chip: TONE_CHIP.warning, label: "Watch" },
  concern: { icon: AlertTriangle, chip: "bg-destructive/15 text-destructive border-destructive/20", label: "Concern" },
} as const;

export const AdminPulseCard = () => {
  const { data, isLoading, isError, isFetching, refetch } = useAdminPulse();

  if (isLoading) {
    return (
      <Card>
        <CardContent
          className="space-y-4 p-5 sm:p-6"
          role="status"
          aria-label="Generating the marketplace brief"
        >
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-2">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-56 max-w-full" />
            </div>
            <Skeleton className="h-7 w-20" />
          </div>
          <Skeleton className="h-6 w-3/4" />
          <div className="grid gap-3 md:grid-cols-2">
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card>
        <ErrorPanel
          what="the marketplace brief"
          description="Core administration data remains available below. Try the automated brief again when you are ready."
          onRetry={() => refetch()}
          isRetrying={isFetching}
          className="py-8"
        />
      </Card>
    );
  }

  if (!data?.brief) {
    return (
      <Card>
        <StatusPanel
          icon={Activity}
          title="No marketplace brief yet"
          description="The automated brief returned no content. Core administration data remains available below."
          className="py-8"
        />
      </Card>
    );
  }

  const style = healthStyles[data.brief.health] ?? healthStyles.watch;
  const HIcon = style.icon;

  return (
    <Card>
      <CardHeader className="p-5 pb-4 sm:p-6 sm:pb-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <CardTitle as="h2" className="flex items-center gap-2 text-lg">
              <Activity aria-hidden="true" className="h-5 w-5 text-primary" />
              Marketplace pulse
            </CardTitle>
            <CardDescription className="mt-1">
              Automated weekly brief on supply, demand, and growth.
            </CardDescription>
          </div>
          <Badge variant="outline" className={style.chip}>
            <HIcon aria-hidden="true" className="mr-1 h-3.5 w-3.5" />
            {style.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-5 p-5 pt-0 sm:p-6 sm:pt-0">
        <p className="max-w-4xl font-display text-lg font-semibold leading-snug tracking-extra-tight text-foreground sm:text-xl">
          {data.brief.headline}
        </p>

        <div className="grid gap-5 lg:grid-cols-2">
          {data.brief.trends?.length > 0 && (
            <section aria-labelledby="marketplace-trends-heading">
              <h3 id="marketplace-trends-heading" className="text-sm font-semibold text-foreground">
                Signals to watch
              </h3>
              <ul className="mt-2 space-y-2">
                {data.brief.trends.map((trend, index) => (
                  <li
                    key={`${trend}-${index}`}
                    className="flex items-start gap-2.5 rounded-lg border border-border bg-surface-1 px-3 py-2.5 text-sm leading-relaxed text-foreground"
                  >
                    <ArrowUpRight aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-information" />
                    <span>{trend}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {data.brief.actions?.length > 0 && (
            <section aria-labelledby="marketplace-actions-heading">
              <h3 id="marketplace-actions-heading" className="text-sm font-semibold text-foreground">
                Recommended actions
              </h3>
              <ul className="mt-2 space-y-2">
                {data.brief.actions.map((action, index) => (
                  <li
                    key={`${action}-${index}`}
                    className="flex items-start gap-2.5 rounded-lg border border-border bg-card px-3 py-2.5 text-sm leading-relaxed text-foreground"
                  >
                    <ClipboardCheck aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span>{action}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
