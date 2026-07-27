import { OwnerLayout } from "@/components/owner/OwnerLayout";
import { ErrorPanel } from "@/components/common/StatusPanel";
import { useOwnerAnalytics } from "@/hooks/useOwnerAnalytics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
/**
 * Chart colours, from the design tokens.
 *
 * These were five hardcoded blues — `hsl(200, 98%, 39%)` and friends — which
 * put a cornflower donut and a cornflower bar chart in an app whose entire
 * identity is emerald on near-black. Being literal HSL they were also the same
 * in both themes, so nothing here responded to light mode at all.
 *
 * `--chart-1..5` exist in index.css for exactly this, defined per theme, and
 * `GMVTrendChart` already drives every colour through tokens. This page was
 * the outlier.
 */
const CHART_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

const OwnerAnalyticsPage = () => {
  const {
    data: analytics,
    isLoading,
    isError,
    isFetching,
    refetch,
  } = useOwnerAnalytics();

  if (isLoading) {
    return (
      <OwnerLayout title="Analytics">
        <div className="grid gap-6" role="status" aria-label="Loading your analytics">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </OwnerLayout>
    );
  }

  if (isError) {
    return (
      <OwnerLayout title="Analytics" subtitle="Track your venue performance and revenue.">
        {/* Every panel below falls back to "No booking data yet", which on a
            failed request tells an owner their venues took no bookings. That
            is a false statement about their revenue, not a neutral blank. */}
        <ErrorPanel
          what="your analytics"
          onRetry={() => refetch()}
          isRetrying={isFetching}
        />
      </OwnerLayout>
    );
  }

  return (
    <OwnerLayout title="Analytics" subtitle="Track your venue performance and revenue.">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Total Revenue", value: `֏${(analytics?.totalRevenue || 0).toLocaleString()}` },
          { label: "Total Bookings", value: analytics?.totalBookings?.toString() || "0" },
          { label: "Unique Customers", value: analytics?.uniqueCustomers?.toString() || "0" },
          { label: "Avg Booking Value", value: `֏${Math.round(analytics?.averageBookingValue || 0).toLocaleString()}` },
        ].map((kpi) => (
          <Card key={kpi.label}>
            <CardContent className="p-6">
              <p className="text-2xl font-bold text-foreground">{kpi.value}</p>
              <p className="text-sm text-muted-foreground">{kpi.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <Card>
          <CardHeader>
            <CardTitle as="h2" className="text-lg">Revenue (Last 6 Months)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={analytics?.revenueByMonth || []}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis
                  dataKey="month"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `֏${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  formatter={(value: number) => [`֏${value.toLocaleString()}`, "Revenue"]}
                  contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
                />
                <Bar dataKey="revenue" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Bookings by Venue */}
        <Card>
          <CardHeader>
            <CardTitle as="h2" className="text-lg">Bookings by Venue</CardTitle>
          </CardHeader>
          <CardContent>
            {(analytics?.bookingsByVenue?.length || 0) > 0 ? (
              <ResponsiveContainer
                width="100%"
                height={250}
                className="[&_.recharts-pie-label-text]:fill-muted-foreground [&_.recharts-pie-label-text]:text-xs"
              >
                <PieChart>
                  <Pie
                    data={analytics?.bookingsByVenue}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    dataKey="count"
                    nameKey="venue"
                    label={({ venue, count }) => `${venue}: ${count}`}
                    labelLine={{ stroke: "hsl(var(--border-strong))" }}
                  >
                    {analytics?.bookingsByVenue.map((_: any, i: number) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "0.5rem",
                      color: "hsl(var(--popover-foreground))",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">No booking data yet</p>
            )}
          </CardContent>
        </Card>
      </div>
    </OwnerLayout>
  );
};

export default OwnerAnalyticsPage;
