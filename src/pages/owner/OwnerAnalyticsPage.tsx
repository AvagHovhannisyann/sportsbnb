import {
  BarChart3,
  CalendarCheck2,
  ReceiptText,
  TrendingUp,
  UsersRound,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { OwnerLayout } from "@/components/owner/OwnerLayout";
import { ErrorPanel } from "@/components/common/StatusPanel";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useOwnerAnalytics } from "@/hooks/useOwnerAnalytics";

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
        <div className="max-w-6xl space-y-5" role="status" aria-label="Loading your analytics">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-28 w-full rounded-lg" />
            ))}
          </div>
          <div className="grid gap-5 lg:grid-cols-2">
            <Skeleton className="h-80 w-full rounded-lg" />
            <Skeleton className="h-80 w-full rounded-lg" />
          </div>
        </div>
      </OwnerLayout>
    );
  }

  if (isError) {
    return (
      <OwnerLayout title="Analytics" subtitle="Track confirmed bookings and venue revenue.">
        <Card className="max-w-3xl">
          <ErrorPanel
            what="your analytics"
            description="No performance totals are being shown until the booking data can be loaded."
            onRetry={() => refetch()}
            isRetrying={isFetching}
          />
        </Card>
      </OwnerLayout>
    );
  }

  const totalBookings = analytics?.totalBookings ?? 0;
  const kpis = [
    {
      label: "Confirmed revenue",
      value: `֏${(analytics?.totalRevenue ?? 0).toLocaleString()}`,
      icon: TrendingUp,
      hint: "Across all confirmed bookings",
    },
    {
      label: "Confirmed bookings",
      value: totalBookings.toLocaleString(),
      icon: CalendarCheck2,
      hint: "All owner venues",
    },
    {
      label: "Unique customers",
      value: (analytics?.uniqueCustomers ?? 0).toLocaleString(),
      icon: UsersRound,
      hint: "Within confirmed bookings",
    },
    {
      label: "Average booking",
      value: `֏${Math.round(analytics?.averageBookingValue ?? 0).toLocaleString()}`,
      icon: ReceiptText,
      hint: "Revenue per confirmed booking",
    },
  ];

  return (
    <OwnerLayout title="Analytics" subtitle="Track confirmed bookings and venue revenue.">
      <div className="max-w-6xl space-y-5">
        <section aria-labelledby="analytics-summary-heading">
          <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2
                id="analytics-summary-heading"
                className="font-display text-lg font-semibold tracking-extra-tight text-foreground"
              >
                Performance summary
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                A confirmed-booking view across every venue you own.
              </p>
            </div>
            <Badge variant="outline">Confirmed only</Badge>
          </div>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {kpis.map((kpi) => {
              const Icon = kpi.icon;
              return (
                <Card key={kpi.label} className="min-w-0">
                  <CardContent className="p-4 sm:p-5">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-xs font-medium leading-snug text-muted-foreground sm:text-sm">
                        {kpi.label}
                      </p>
                      <div className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-surface-1 text-foreground-soft sm:flex">
                        <Icon aria-hidden="true" className="h-4 w-4" />
                      </div>
                    </div>
                    <p className="mt-3 break-words font-display text-xl font-semibold tracking-extra-tight text-foreground tabular-nums sm:text-2xl">
                      {kpi.value}
                    </p>
                    <p className="mt-1 hidden text-xs leading-relaxed text-muted-foreground sm:block">
                      {kpi.hint}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>

        <div className="grid items-start gap-5 lg:grid-cols-2">
          <Card>
            <CardHeader className="p-5 pb-3 sm:p-6 sm:pb-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <CardTitle as="h2" className="text-lg">Revenue trend</CardTitle>
                  <CardDescription className="mt-1.5">
                    Confirmed booking value over the last six calendar months.
                  </CardDescription>
                </div>
                <Badge variant="secondary">6 months</Badge>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
              {totalBookings > 0 ? (
                <>
                  <div className="h-64 w-full" aria-hidden="true">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={analytics?.revenueByMonth ?? []}
                        margin={{ top: 8, right: 4, left: -14, bottom: 0 }}
                      >
                        <CartesianGrid
                          stroke="hsl(var(--border))"
                          strokeDasharray="3 3"
                          vertical={false}
                        />
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
                          tickFormatter={(value) => `֏${(value / 1000).toFixed(0)}k`}
                        />
                        <Tooltip
                          cursor={{ fill: "hsl(var(--surface-2))" }}
                          formatter={(value: number) => [`֏${value.toLocaleString()}`, "Revenue"]}
                          contentStyle={{
                            backgroundColor: "hsl(var(--popover))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: 8,
                            boxShadow: "var(--shadow-sm)",
                          }}
                        />
                        <Bar
                          dataKey="revenue"
                          fill="hsl(var(--chart-1))"
                          radius={[4, 4, 0, 0]}
                          isAnimationActive={false}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <dl className="sr-only">
                    {(analytics?.revenueByMonth ?? []).map((month) => (
                      <div key={month.month}>
                        <dt>{month.month}</dt>
                        <dd>
                          ֏{month.revenue.toLocaleString()} from {month.bookings} confirmed bookings
                        </dd>
                      </div>
                    ))}
                  </dl>
                </>
              ) : (
                <div className="px-4 py-10 text-center">
                  <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-lg border border-border bg-surface-1 text-foreground-soft">
                    <BarChart3 aria-hidden="true" className="h-5 w-5" />
                  </div>
                  <h3 className="font-semibold text-foreground">No confirmed revenue yet</h3>
                  <p className="mx-auto mt-1 max-w-sm text-sm leading-relaxed text-muted-foreground">
                    Revenue appears here after a booking reaches confirmed status.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="p-5 pb-3 sm:p-6 sm:pb-3">
              <CardTitle as="h2" className="text-lg">Bookings by venue</CardTitle>
              <CardDescription className="mt-1.5">
                How confirmed bookings are distributed across your listings.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
              {(analytics?.bookingsByVenue.length ?? 0) > 0 ? (
                <div className="grid items-center gap-4 sm:grid-cols-[12rem_minmax(0,1fr)]">
                  <div className="mx-auto h-48 w-48" aria-hidden="true">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={analytics?.bookingsByVenue}
                          cx="50%"
                          cy="50%"
                          innerRadius={52}
                          outerRadius={78}
                          paddingAngle={2}
                          dataKey="count"
                          nameKey="venue"
                          isAnimationActive={false}
                        >
                          {(analytics?.bookingsByVenue ?? []).map((venue, index) => (
                            <Cell
                              key={venue.venue}
                              fill={CHART_COLORS[index % CHART_COLORS.length]}
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value: number) => [value.toLocaleString(), "Bookings"]}
                          contentStyle={{
                            backgroundColor: "hsl(var(--popover))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: 8,
                            boxShadow: "var(--shadow-sm)",
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  <ul className="min-w-0 divide-y divide-border" aria-label="Confirmed bookings by venue">
                    {(analytics?.bookingsByVenue ?? []).map((venue, index) => (
                      <li key={venue.venue} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                        <span className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
                          <span
                            aria-hidden="true"
                            className="h-2.5 w-2.5 shrink-0 rounded-sm"
                            style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                          />
                          <span className="truncate">{venue.venue}</span>
                        </span>
                        <span className="shrink-0 font-mono text-sm font-medium tabular-nums text-foreground">
                          {venue.count}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="px-4 py-10 text-center">
                  <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-lg border border-border bg-surface-1 text-foreground-soft">
                    <CalendarCheck2 aria-hidden="true" className="h-5 w-5" />
                  </div>
                  <h3 className="font-semibold text-foreground">No venue distribution yet</h3>
                  <p className="mx-auto mt-1 max-w-sm text-sm leading-relaxed text-muted-foreground">
                    Confirmed bookings will be grouped by venue here.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </OwnerLayout>
  );
};

export default OwnerAnalyticsPage;
