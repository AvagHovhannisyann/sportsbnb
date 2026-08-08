import {
  Activity,
  AlertTriangle,
  Building2,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  MapPin,
  UserPlus,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import { StatusPanel } from "@/components/common/StatusPanel";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { type MarketMetrics } from "@/hooks/useOperatorMetrics";
import { TONE_CHIP } from "@/lib/chips";
import { Money } from "@/components/operator/Money";
import { cn } from "@/lib/utils";

export function MarketOverviewCards({ markets }: { markets: MarketMetrics[] }) {
  const primaryMarkets = markets.filter((market) => market.market !== "Other");

  return (
    <section aria-labelledby="market-health-heading">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2
            id="market-health-heading"
            className="font-display text-xl font-semibold tracking-extra-tight text-foreground"
          >
            Market health
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            A side-by-side view of marketplace activity and seven-day game supply.
          </p>
        </div>
        <Badge variant="outline">30-day window</Badge>
      </div>

      {primaryMarkets.length === 0 ? (
        <Card>
          <StatusPanel
            icon={MapPin}
            title="No primary markets to report"
            description="Yerevan and Los Angeles will appear here once the operator report includes them."
            className="py-9"
          />
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {primaryMarkets.map((market) => (
            <MarketCard key={market.market} market={market} />
          ))}
        </div>
      )}
    </section>
  );
}

function MarketCard({ market }: { market: MarketMetrics }) {
  const LiquidityIcon = market.liquidityHealthy ? CheckCircle2 : AlertTriangle;

  return (
    <Card className="min-w-0 overflow-hidden">
      <CardHeader className="p-5 pb-4 sm:p-6 sm:pb-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-surface-1 text-foreground-soft">
              <MapPin aria-hidden="true" className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <h3 className="truncate font-display text-lg font-semibold tracking-extra-tight text-foreground">
                {market.market}
              </h3>
              <p className="text-xs font-medium text-muted-foreground">{market.currency} market</p>
            </div>
          </div>
          <Badge
            variant="outline"
            className={market.liquidityHealthy ? TONE_CHIP.positive : TONE_CHIP.warning}
          >
            <LiquidityIcon aria-hidden="true" className="h-3.5 w-3.5" />
            {market.liquidityHealthy ? "Healthy liquidity" : "Below liquidity target"}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-5 pt-0 sm:p-6 sm:pt-0">
        <dl className="grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-3">
          <Metric
            icon={CircleDollarSign}
            label="GMV"
            hint="Last 30 days"
            value={<Money amount={market.gmv30d} currency={market.currency} />}
            numeral={false}
          />
          <Metric
            icon={CalendarDays}
            label="Bookings"
            hint="Last 30 days"
            value={market.bookings30d.toLocaleString()}
          />
          <Metric
            icon={UserPlus}
            label="New users"
            hint="Last 30 days"
            value={market.newUsers30d.toLocaleString()}
          />
        </dl>

        <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-5 border-t border-border pt-5 sm:grid-cols-3">
          <Metric
            icon={Building2}
            label="Active venues"
            hint={`${market.venues.toLocaleString()} total`}
            value={market.activeVenues.toLocaleString()}
          />
          <Metric
            icon={UsersRound}
            label="Open games"
            hint="Upcoming public"
            value={market.openGames.toLocaleString()}
          />
          <Metric
            icon={Activity}
            label="Games per day"
            hint="Seven-day proxy"
            value={market.openGamesPerDay.toFixed(1)}
          />
        </dl>
      </CardContent>
    </Card>
  );
}

function Metric({
  icon: Icon,
  label,
  hint,
  value,
  numeral = true,
}: {
  icon: LucideIcon;
  label: string;
  hint: string;
  value: React.ReactNode;
  /**
   * Whether this <dd> should be a `.stat-numeral` run.
   *
   * True for plain figures, which want JetBrains Mono's tabular digits. False
   * when `value` manages its own numeral run — `<Money>` does, because it has
   * to keep the currency mark *out* of the monospaced face, and it also
   * carries a visually-hidden copy of the whole string for screen readers.
   * Nested inside a `.stat-numeral`, that hidden copy puts the dram sign back
   * into the run this exists to keep it out of.
   */
  numeral?: boolean;
}) {
  return (
    <div className="min-w-0">
      <dt className="flex items-center gap-1.5 text-xs font-medium leading-4 text-muted-foreground">
        <Icon aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
        <span>{label}</span>
      </dt>
      <dd
        className={cn(
          "mt-1 break-words text-xl font-semibold leading-tight text-foreground",
          numeral && "stat-numeral",
        )}
      >
        {value}
      </dd>
      <dd className="mt-0.5 text-xs leading-4 text-muted-foreground">{hint}</dd>
    </div>
  );
}
