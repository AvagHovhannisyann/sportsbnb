import { BarChart3, ChevronDown } from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { StatusPanel } from "@/components/common/StatusPanel";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  type Currency,
  type GMVPoint,
  formatMoney,
} from "@/hooks/useOperatorMetrics";
import { Money } from "@/components/operator/Money";

type TrendedMarket = "Yerevan" | "Los Angeles";

const compactNumber = new Intl.NumberFormat(undefined, {
  notation: "compact",
  maximumFractionDigits: 1,
});

export function GMVTrendChart({ data }: { data: GMVPoint[] }) {
  const hasGMV = data.some((point) => point.Yerevan > 0 || point["Los Angeles"] > 0);

  return (
    <Card>
      <CardHeader className="p-5 pb-3 sm:p-6 sm:pb-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle as="h2" className="text-lg">
              Booking value trend
            </CardTitle>
            <CardDescription className="mt-1.5">
              Daily gross booking value over the last 30 days, shown on separate native-currency scales.
            </CardDescription>
          </div>
          <Badge variant="secondary">Daily</Badge>
        </div>
      </CardHeader>

      <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
        {!hasGMV ? (
          <StatusPanel
            icon={BarChart3}
            title="No booking value in this window"
            description="The trend will appear after a venue in Yerevan or Los Angeles records booking value."
            className="py-9"
          />
        ) : (
          <>
            <div className="grid gap-4 lg:grid-cols-2">
              <MarketTrend
                data={data}
                market="Yerevan"
                currency="AMD"
                color="hsl(var(--chart-1))"
              />
              <MarketTrend
                data={data}
                market="Los Angeles"
                currency="USD"
                color="hsl(var(--chart-2))"
              />
            </div>

            <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
              Each market keeps its native currency and its own vertical scale, so line height should not be used to compare value between markets.
            </p>

            <details className="group mt-4 border-t border-border pt-2">
              <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between rounded-lg px-2 text-sm font-semibold text-foreground outline-none transition-colors hover:bg-surface-1 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transition-none [&::-webkit-details-marker]:hidden">
                View daily values
                <ChevronDown
                  aria-hidden="true"
                  className="h-4 w-4 text-muted-foreground transition-transform duration-150 group-open:rotate-180 motion-reduce:transition-none"
                />
              </summary>
              <div className="mt-2 max-h-72 overflow-auto rounded-lg border border-border">
                <Table className="min-w-[32rem]">
                  <caption className="sr-only">
                    Daily gross booking value for Yerevan in Armenian dram and Los Angeles in US dollars.
                  </caption>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Yerevan (AMD)</TableHead>
                      <TableHead className="text-right">Los Angeles (USD)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.map((point) => (
                      <TableRow key={point.date}>
                        <TableCell className="font-medium text-foreground">{point.date}</TableCell>
                        <TableCell className="text-right">
                          <Money amount={point.Yerevan} currency="AMD" />
                        </TableCell>
                        <TableCell className="text-right">
                          <Money amount={point["Los Angeles"]} currency="USD" />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </details>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function MarketTrend({
  data,
  market,
  currency,
  color,
}: {
  data: GMVPoint[];
  market: TrendedMarket;
  currency: Currency;
  color: string;
}) {
  const total = data.reduce((sum, point) => sum + Number(point[market] ?? 0), 0);
  const hasValues = data.some((point) => Number(point[market] ?? 0) > 0);

  return (
    <section
      aria-labelledby={`gmv-${market.toLowerCase().replace(/ /g, "-")}-heading`}
      className="min-w-0 rounded-lg border border-border bg-surface-1 p-4"
    >
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h3
            id={`gmv-${market.toLowerCase().replace(/ /g, "-")}-heading`}
            className="font-semibold text-foreground"
          >
            {market}
          </h3>
          <p className="text-xs text-muted-foreground">{currency} · 30-day total</p>
        </div>
        <p className="break-words text-right text-lg font-semibold text-foreground">
          <Money amount={total} currency={currency} />
        </p>
      </div>

      {hasValues ? (
        <>
          <div className="mt-4 h-56 w-full" aria-hidden="true">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 6, right: 4, left: -10, bottom: 0 }}>
                <CartesianGrid
                  stroke="hsl(var(--border))"
                  strokeDasharray="3 3"
                  vertical={false}
                />
                <XAxis
                  dataKey="date"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  minTickGap={28}
                />
                <YAxis
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => compactNumber.format(Number(value))}
                  width={44}
                />
                <Tooltip
                  formatter={(value: number) => [formatMoney(Number(value), currency), market]}
                  contentStyle={{
                    backgroundColor: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    boxShadow: "var(--shadow-sm)",
                    fontSize: 12,
                  }}
                  labelStyle={{ color: "hsl(var(--foreground))", fontWeight: 600 }}
                  itemStyle={{ color }}
                />
                <Line
                  type="monotone"
                  dataKey={market}
                  stroke={color}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 2, fill: "hsl(var(--card))" }}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <dl className="sr-only">
            {data.map((point) => (
              <div key={point.date}>
                <dt>{point.date}</dt>
                <dd>{formatMoney(Number(point[market] ?? 0), currency)}</dd>
              </div>
            ))}
          </dl>
        </>
      ) : (
        <div className="flex h-56 flex-col items-center justify-center px-4 text-center">
          <BarChart3 aria-hidden="true" className="mb-3 h-5 w-5 text-muted-foreground" />
          <p className="text-sm font-semibold text-foreground">No {market} booking value</p>
          <p className="mt-1 max-w-xs text-xs leading-relaxed text-muted-foreground">
            No GMV was recorded for this market during the selected window.
          </p>
        </div>
      )}
    </section>
  );
}
