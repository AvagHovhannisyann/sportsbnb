import { MapPin } from "lucide-react";
import { StatusPanel } from "@/components/common/StatusPanel";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { type NeighborhoodRow } from "@/hooks/useOperatorMetrics";
import { TONE_CHIP } from "@/lib/chips";
import { Money } from "@/components/operator/Money";

export function NeighborhoodTable({ rows }: { rows: NeighborhoodRow[] }) {
  return (
    <Card>
      <CardHeader className="p-5 pb-3 sm:p-6 sm:pb-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle as="h2" className="text-lg">
              Activity by area
            </CardTitle>
            <CardDescription className="mt-1.5">
              Cities and neighborhoods ranked by gross booking value in the last 30 days.
            </CardDescription>
          </div>
          {rows.length > 0 && <Badge variant="secondary">{rows.length} areas</Badge>}
        </div>
      </CardHeader>

      <CardContent className="p-5 pt-0 sm:p-6 sm:pt-0">
        {rows.length === 0 ? (
          <StatusPanel
            icon={MapPin}
            title="No areas to rank yet"
            description="Area activity will appear after venue inventory is available in the operator report."
            className="py-9"
          />
        ) : (
          <>
            <ul className="divide-y divide-border md:hidden" aria-label="Area activity rankings">
              {rows.map((row, index) => (
                <li key={row.city} className="py-4 first:pt-0 last:pb-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="flex items-center gap-1.5 font-semibold text-foreground">
                        <MapPin aria-hidden="true" className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <span className="truncate">{row.city}</span>
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">Rank {index + 1} by GMV</p>
                    </div>
                    <Badge variant="outline" className={TONE_CHIP.neutral}>
                      {row.market}
                    </Badge>
                  </div>
                  <dl className="mt-3 grid grid-cols-3 gap-3 rounded-lg bg-surface-1 p-3">
                    <div className="min-w-0">
                      <dt className="text-xs leading-4 text-muted-foreground">Venues</dt>
                      <dd className="stat-numeral mt-1 font-semibold text-foreground">
                        {row.venues.toLocaleString()}
                      </dd>
                    </div>
                    <div className="min-w-0">
                      <dt className="text-xs leading-4 text-muted-foreground">Bookings</dt>
                      <dd className="stat-numeral mt-1 font-semibold text-foreground">
                        {row.bookings30d.toLocaleString()}
                      </dd>
                    </div>
                    <div className="min-w-0 text-right">
                      <dt className="text-xs leading-4 text-muted-foreground">GMV</dt>
                      <dd className="mt-1 break-words font-semibold text-foreground">
                        <Money amount={row.gmv30d} currency={row.currency} />
                      </dd>
                    </div>
                  </dl>
                </li>
              ))}
            </ul>

            <div className="hidden md:block">
              <Table className="table-fixed">
                <caption className="sr-only">
                  Area activity rankings with market, venue count, bookings, and gross booking value for the last 30 days.
                </caption>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[28%] px-3">City or area</TableHead>
                    <TableHead className="w-[19%] px-3">Market</TableHead>
                    <TableHead className="w-[14%] px-3 text-right">Venues</TableHead>
                    <TableHead className="w-[18%] px-3 text-right">Bookings</TableHead>
                    <TableHead className="w-[21%] px-3 text-right">GMV</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={row.city}>
                      <TableCell className="truncate px-3 font-semibold text-foreground" title={row.city}>
                        {row.city}
                      </TableCell>
                      <TableCell className="px-3">
                        <Badge variant="outline" className={TONE_CHIP.neutral}>
                          {row.market}
                        </Badge>
                      </TableCell>
                      <TableCell className="stat-numeral px-3 text-right">
                        {row.venues.toLocaleString()}
                      </TableCell>
                      <TableCell className="stat-numeral px-3 text-right">
                        {row.bookings30d.toLocaleString()}
                      </TableCell>
                      <TableCell className="break-words px-3 text-right font-semibold text-foreground">
                        <Money amount={row.gmv30d} currency={row.currency} />
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
