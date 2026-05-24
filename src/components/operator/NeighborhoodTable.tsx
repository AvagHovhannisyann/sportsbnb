import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { NeighborhoodRow, formatMoney } from "@/hooks/useOperatorMetrics";

export function NeighborhoodTable({ rows }: { rows: NeighborhoodRow[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Neighborhoods by activity</CardTitle>
        <CardDescription>Ranked by 30-day GMV across all cities</CardDescription>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No venue data yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>City / Area</TableHead>
                <TableHead>Market</TableHead>
                <TableHead className="text-right">Venues</TableHead>
                <TableHead className="text-right">Bookings (30d)</TableHead>
                <TableHead className="text-right">GMV (30d)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.city}>
                  <TableCell className="font-medium text-foreground">{r.city}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{r.market}</Badge>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{r.venues}</TableCell>
                  <TableCell className="text-right tabular-nums">{r.bookings30d}</TableCell>
                  <TableCell className="text-right tabular-nums font-medium">
                    {formatMoney(r.gmv30d, r.currency)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
