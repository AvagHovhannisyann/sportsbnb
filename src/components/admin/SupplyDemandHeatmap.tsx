import { useQuery } from "@tanstack/react-query";
import { TONE_CHIP } from "@/lib/chips";
import { cn } from "@/lib/utils";
import { useMemo } from "react";
import { Activity, MapPin } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ErrorPanel, StatusPanel } from "@/components/common/StatusPanel";
import { supabase } from "@/integrations/supabase/client";

type Cell = {
  city: string;
  sport: string;
  bucket: string;
  bucketIndex: number;
  demand: number; // booking_intents
  supply: number; // active venues
  gap: number;
};

const TIME_BUCKETS = ["Morning", "Afternoon", "Evening", "Night"] as const;
const BUCKET_HOURS: Array<[number, number]> = [
  [5, 12],
  [12, 17],
  [17, 22],
  [22, 5],
];

/**
 * City × Sport × Time-of-day grid showing supply (venues offering that
 * sport in that city) vs demand (booking_intents in last 30 days bucketed
 * by time). Highlights deserts where demand far outstrips supply.
 */
export function SupplyDemandHeatmap() {
  const { data, isLoading, isError, isFetching, refetch } = useQuery({
    queryKey: ["supply-demand-heatmap"],
    queryFn: async () => {
      const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const [intents, venues] = await Promise.all([
        supabase
          .from("booking_intents")
          .select("venue_id, booking_time, created_at")
          .gte("created_at", since)
          .limit(2000),
        supabase
          .from("venues")
          .select("id, city, sports, is_active")
          .eq("is_active", true),
      ]);

      if (intents.error) throw intents.error;
      if (venues.error) throw venues.error;

      return {
        intents: intents.data ?? [],
        venues: (venues.data ?? []) as Array<{ id: string; city: string; sports: string[] }>,
      };
    },
  });

  const cells = useMemo<Cell[]>(() => {
    if (!data) return [];
    const venueById = new Map(data.venues.map((v) => [v.id, v]));

    // Supply: count of active venues per (city, sport)
    const supply = new Map<string, number>();
    for (const v of data.venues) {
      for (const s of v.sports ?? []) {
        const k = `${v.city}|${s}`;
        supply.set(k, (supply.get(k) ?? 0) + 1);
      }
    }

    // Demand: bucket each intent by city × sport × time-of-day
    const demand = new Map<string, number>();
    for (const i of data.intents) {
      const v = venueById.get(i.venue_id as string);
      if (!v) continue;
      const bucketIdx = bucketTime(i.booking_time as string | null);
      if (bucketIdx === -1) continue;
      for (const s of v.sports ?? []) {
        const k = `${v.city}|${s}|${bucketIdx}`;
        demand.set(k, (demand.get(k) ?? 0) + 1);
      }
    }

    const out: Cell[] = [];
    for (const [k, d] of demand.entries()) {
      const [city, sport, bIdx] = k.split("|");
      const idx = parseInt(bIdx, 10);
      const s = supply.get(`${city}|${sport}`) ?? 0;
      out.push({
        city,
        sport,
        bucket: TIME_BUCKETS[idx],
        bucketIndex: idx,
        demand: d,
        supply: s,
        gap: d - s * 2, // weight: 1 venue ≈ should serve 2 inquiries/bucket
      });
    }
    return out.sort((a, b) => b.gap - a.gap).slice(0, 12);
  }, [data]);

  return (
    <Card>
      <CardHeader className="p-5 pb-4 sm:p-6 sm:pb-4">
        <CardTitle as="h2" className="flex items-center gap-2 text-lg">
          <Activity aria-hidden="true" className="h-5 w-5 text-primary" />
          Supply and demand gaps
        </CardTitle>
        <CardDescription>
          Highest-pressure city, sport, and time combinations from booking inquiries in the last 30 days.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-5 pt-0 sm:p-6 sm:pt-0">
        {isLoading ? (
          <div className="space-y-2" role="status" aria-label="Loading supply and demand gaps">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-12 w-full" />
            ))}
          </div>
        ) : isError ? (
          <ErrorPanel
            what="supply and demand signals"
            description="No marketplace conclusion has been drawn from the failed request. Try loading the signals again."
            onRetry={() => refetch()}
            isRetrying={isFetching}
            className="py-8"
          />
        ) : cells.length === 0 ? (
          <StatusPanel
            icon={Activity}
            title="No demand gaps to rank yet"
            description="No eligible booking inquiries were recorded for active venues during this 30-day window."
            className="py-8"
          />
        ) : (
          <>
            <ul className="space-y-2 md:hidden" aria-label="Supply and demand gap rankings">
              {cells.map((cell, index) => (
                <li
                  key={`${cell.city}-${cell.sport}-${cell.bucketIndex}-${index}`}
                  className="rounded-lg border border-border bg-surface-1 p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="flex items-center gap-1.5 font-semibold text-foreground">
                        <MapPin aria-hidden="true" className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <span className="truncate">{cell.city}</span>
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {cell.sport} · {cell.bucket}
                      </p>
                    </div>
                    <GapBadge gap={cell.gap} maximumGap={cells[0]?.gap ?? 0} />
                  </div>
                  <dl className="mt-3 grid grid-cols-2 gap-3 border-t border-border pt-3 text-sm">
                    <div>
                      <dt className="text-xs text-muted-foreground">Demand</dt>
                      <dd className="stat-numeral mt-0.5 font-semibold text-foreground">{cell.demand}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">Active venues</dt>
                      <dd className="stat-numeral mt-0.5 font-semibold text-foreground">{cell.supply}</dd>
                    </div>
                  </dl>
                </li>
              ))}
            </ul>

            <div className="hidden md:block">
              <Table className="min-w-[44rem]">
                <caption className="sr-only">
                  Ranked city, sport, and time combinations comparing booking inquiry demand with active venue supply.
                </caption>
                <TableHeader>
                  <TableRow>
                    <TableHead>City</TableHead>
                    <TableHead>Sport</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead className="text-right">Demand</TableHead>
                    <TableHead className="text-right">Active venues</TableHead>
                    <TableHead className="text-right">Assessment</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cells.map((cell, index) => (
                    <TableRow key={`${cell.city}-${cell.sport}-${cell.bucketIndex}-${index}`}>
                      <TableCell className="font-semibold text-foreground">{cell.city}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{cell.sport}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{cell.bucket}</TableCell>
                      <TableCell className="stat-numeral text-right font-semibold text-foreground">
                        {cell.demand}
                      </TableCell>
                      <TableCell className="stat-numeral text-right text-muted-foreground">
                        {cell.supply}
                      </TableCell>
                      <TableCell className="text-right">
                        <GapBadge gap={cell.gap} maximumGap={cells[0]?.gap ?? 0} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function GapBadge({ gap, maximumGap }: { gap: number; maximumGap: number }) {
  if (gap <= 0) {
    return (
      <Badge variant="outline" className={TONE_CHIP.neutral}>
        Balanced
      </Badge>
    );
  }

  const isHighPressure = gap >= Math.max(4, Math.ceil(maximumGap * 0.66));

  return (
    <Badge
      variant="outline"
      className={cn(isHighPressure ? TONE_CHIP.danger : TONE_CHIP.warning, "whitespace-nowrap")}
      aria-label={`Demand exceeds weighted supply by ${gap}`}
    >
      {isHighPressure ? "High" : "Watch"} · +{gap}
    </Badge>
  );
}

function bucketTime(time: string | null): number {
  if (!time) return -1;
  const hour = parseInt(time.split(":")[0] ?? "", 10);
  if (Number.isNaN(hour)) return -1;
  for (let i = 0; i < BUCKET_HOURS.length; i++) {
    const [start, end] = BUCKET_HOURS[i];
    if (start < end) {
      if (hour >= start && hour < end) return i;
    } else {
      if (hour >= start || hour < end) return i;
    }
  }
  return -1;
}
