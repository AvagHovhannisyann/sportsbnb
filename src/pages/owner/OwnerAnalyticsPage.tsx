import { OwnerLayout } from "@/components/owner/OwnerLayout";
import { useOwnerAnalytics } from "@/hooks/useOwnerAnalytics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
const COLORS = ["hsl(200, 98%, 39%)", "hsl(213, 93%, 67%)", "hsl(215, 20%, 65%)", "hsl(215, 16%, 46%)", "hsl(198, 93%, 59%)"];

const OwnerAnalyticsPage = () => {
  const { data: analytics, isLoading } = useOwnerAnalytics();

  if (isLoading) {
    return (
      <OwnerLayout title="Analytics">
        <div className="grid gap-6">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
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
            <CardTitle className="text-lg">Revenue (Last 6 Months)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={analytics?.revenueByMonth || []}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="month" className="text-xs" />
                <YAxis className="text-xs" tickFormatter={(v) => `֏${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  formatter={(value: number) => [`֏${value.toLocaleString()}`, "Revenue"]}
                  contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
                />
                <Bar dataKey="revenue" fill="hsl(200, 98%, 39%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Bookings by Venue */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Bookings by Venue</CardTitle>
          </CardHeader>
          <CardContent>
            {(analytics?.bookingsByVenue?.length || 0) > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
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
                  >
                    {analytics?.bookingsByVenue.map((_: any, i: number) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
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
