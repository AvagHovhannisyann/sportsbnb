import { Link } from "react-router-dom";
import { ArrowLeft, BarChart3, Loader2 } from "lucide-react";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { useOperatorMetrics } from "@/hooks/useOperatorMetrics";
import { MarketOverviewCards } from "@/components/operator/MarketOverviewCards";
import { NeighborhoodTable } from "@/components/operator/NeighborhoodTable";
import { GMVTrendChart } from "@/components/operator/GMVTrendChart";
import { CACRetentionPanel } from "@/components/operator/CACRetentionPanel";

const OperatorDashboard = () => {
  const { data, isLoading, error } = useOperatorMetrics();

  return (
    <Layout>
      <div className="bg-background min-h-screen">
        <div className="container py-8">
          {/* flex-wrap + gap: the title block and the two nav buttons were one
              unbreakable row on a 375px screen. */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <BarChart3 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="page-title">Operator dashboard</h1>
                <p className="text-muted-foreground">Live liquidity, GMV, and retention across Yerevan & LA</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" asChild>
                <Link to="/operator/outreach">AI Outreach</Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link to="/admin">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Admin
                </Link>
              </Button>
            </div>
          </div>

          {isLoading && (
            <div className="flex justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">
              Failed to load metrics: {(error as Error).message}
            </div>
          )}

          {data && (
            <div className="space-y-6">
              <MarketOverviewCards markets={data.markets} />
              <GMVTrendChart data={data.gmvTrend} />
              <div className="grid gap-6 lg:grid-cols-3">
                {/* min-w-0 so the table scrolls inside its own wrapper rather
                    than sizing the grid track to its content. */}
                <div className="min-w-0 lg:col-span-2">
                  <NeighborhoodTable rows={data.neighborhoods} />
                </div>
                <CACRetentionPanel metrics={data.retention} />
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default OperatorDashboard;
