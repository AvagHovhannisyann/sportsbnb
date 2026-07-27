import { Card, CardContent } from "@/components/ui/card";
import { TONE_CHIP } from "@/lib/chips";
import { Badge } from "@/components/ui/badge";
import { Building2, Calendar, Banknote, Users, Gamepad2, TrendingUp } from "lucide-react";
import { MarketMetrics, formatMoney } from "@/hooks/useOperatorMetrics";

const flagFor = (market: string) => {
  if (market === "Yerevan") return "🇦🇲";
  if (market === "Los Angeles") return "🇺🇸";
  return "🌍";
};

export function MarketOverviewCards({ markets }: { markets: MarketMetrics[] }) {
  const primary = markets.filter((m) => m.market !== "Other");
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {primary.map((m) => (
        <Card key={m.market} className="overflow-hidden">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{flagFor(m.market)}</span>
                <div>
                  <h2 className="text-lg font-semibold text-foreground">{m.market}</h2>
                  <p className="text-xs text-muted-foreground">{m.currency} market</p>
                </div>
              </div>
              <Badge
                className={
                  m.liquidityHealthy
                    ? TONE_CHIP.positive
                    : TONE_CHIP.warning
                }
              >
                {m.liquidityHealthy ? "Healthy liquidity" : "Below target"}
              </Badge>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-4">
              <Metric icon={Banknote} label="GMV (30d)" value={formatMoney(m.gmv30d, m.currency)} />
              <Metric icon={Calendar} label="Bookings" value={m.bookings30d.toString()} />
              <Metric icon={Users} label="New users" value={m.newUsers30d.toString()} />
            </div>
            <div className="grid grid-cols-3 gap-3 pt-4 border-t border-border">
              <Metric icon={Building2} label="Venues" value={`${m.activeVenues}/${m.venues}`} />
              <Metric icon={Gamepad2} label="Open games" value={m.openGames.toString()} />
              <Metric icon={TrendingUp} label="Games/day" value={m.openGamesPerDay.toFixed(1)} />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function Metric({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
        <Icon className="h-3 w-3" />
        {label}
      </div>
      <div className="text-lg font-semibold text-foreground tabular-nums">{value}</div>
    </div>
  );
}
