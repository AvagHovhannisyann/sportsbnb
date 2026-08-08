import { Link } from "react-router-dom";
import { BarChart3, Send } from "lucide-react";
import { OperationsLayout } from "@/components/admin/OperationsLayout";
import { CACRetentionPanel } from "@/components/operator/CACRetentionPanel";
import { GMVTrendChart } from "@/components/operator/GMVTrendChart";
import { MarketOverviewCards } from "@/components/operator/MarketOverviewCards";
import { NeighborhoodTable } from "@/components/operator/NeighborhoodTable";
import { ErrorPanel, StatusPanel } from "@/components/common/StatusPanel";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useOperatorMetrics } from "@/hooks/useOperatorMetrics";

const OperatorLoadingState = () => (
  <div className="space-y-5" role="status" aria-label="Loading marketplace operations metrics">
    <div className="space-y-3">
      <Skeleton className="h-10 w-64 max-w-full" />
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    </div>
    <Skeleton className="h-[28rem] w-full" />
    <div className="grid gap-5 xl:grid-cols-3">
      <Skeleton className="h-80 w-full xl:col-span-2" />
      <Skeleton className="h-80 w-full" />
    </div>
  </div>
);

const OperatorDashboard = () => {
  const { data, isLoading, isError, isFetching, refetch } = useOperatorMetrics();

  return (
    <OperationsLayout
      title="Marketplace operations"
      subtitle="Liquidity, booking value, and retention across Yerevan and Los Angeles."
      actions={
        <Button asChild size="sm" className="min-h-11 w-full sm:w-auto lg:min-h-10">
          <Link to="/operator/outreach">
            <Send aria-hidden="true" />
            Open outreach
          </Link>
        </Button>
      }
    >
      {isLoading ? (
        <OperatorLoadingState />
      ) : isError ? (
        <Card className="max-w-3xl">
          <ErrorPanel
            what="marketplace operations metrics"
            description="No liquidity, booking value, or retention conclusions are being shown until the marketplace data can be loaded."
            onRetry={() => refetch()}
            isRetrying={isFetching}
          />
        </Card>
      ) : !data ? (
        <Card className="max-w-3xl">
          <StatusPanel
            icon={BarChart3}
            title="Marketplace metrics are not available"
            description="The operations workspace did not receive a report for this 30-day window."
          >
            <Button onClick={() => refetch()} disabled={isFetching}>
              Load metrics
            </Button>
          </StatusPanel>
        </Card>
      ) : (
        <div className="space-y-5">
          <MarketOverviewCards markets={data.markets} />
          <GMVTrendChart data={data.gmvTrend} />
          <div className="grid items-start gap-5 xl:grid-cols-3">
            <div className="min-w-0 xl:col-span-2">
              <NeighborhoodTable rows={data.neighborhoods} />
            </div>
            <CACRetentionPanel metrics={data.retention} />
          </div>
        </div>
      )}
    </OperationsLayout>
  );
};

export default OperatorDashboard;
