import { useQuery } from "@tanstack/react-query";
import { TONE_CHIP } from "@/lib/chips";
import { cn } from "@/lib/utils";
import { useMemo } from "react";
import { Activity, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  const { data, isLoading } = useQuery({
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
      <CardHeader>
        <CardTitle as="h2" className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          Supply ↔ Demand Heatmap
        </CardTitle>
        <CardDescription>
          Top under-served city × sport × time-of-day combinations from the last 30 days.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="py-8 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : cells.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            Not enough lead data yet — heatmap unlocks once inquiries flow in.
          </p>
        ) : (
          <div className="space-y-2">
            <div className="grid grid-cols-12 gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide pb-1 border-b border-border">
              <div className="col-span-3">City</div>
              <div className="col-span-3">Sport</div>
              <div className="col-span-2">When</div>
              <div className="col-span-1 text-right">Dem.</div>
              <div className="col-span-1 text-right">Sup.</div>
              <div className="col-span-2 text-right">Gap</div>
            </div>
            {cells.map((c, i) => {
              const intensity = Math.min(1, c.gap / Math.max(8, cells[0]?.gap ?? 1));
              return (
                <div
                  key={`${c.city}-${c.sport}-${c.bucketIndex}-${i}`}
                  className="grid grid-cols-12 gap-2 items-center py-2 px-2 rounded-md text-sm"
                  style={{ backgroundColor: `hsl(var(--primary) / ${0.05 + intensity * 0.18})` }}
                >
                  <div className="col-span-3 font-medium text-foreground truncate">{c.city}</div>
                  <div className="col-span-3 truncate"><Badge variant="secondary" className="text-xs">{c.sport}</Badge></div>
                  <div className="col-span-2 text-muted-foreground text-xs">{c.bucket}</div>
                  <div className="col-span-1 text-right tabular-nums text-foreground">{c.demand}</div>
                  <div className="col-span-1 text-right tabular-nums text-muted-foreground">{c.supply}</div>
                  <div className="col-span-2 text-right">
                    {c.gap > 0 ? (
                      <Badge className={cn(TONE_CHIP.danger, "text-xs")}>+{c.gap} desert</Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs">balanced</Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
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
