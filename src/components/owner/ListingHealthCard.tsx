import { useMemo } from "react";
import { scoreVenue } from "./listingHealth";
import { Link } from "react-router-dom";
import { Activity, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useOwnerVenues } from "@/hooks/useVenues";
import { useOwnerLeads, summarizeLeads } from "@/hooks/useLeads";

/**
 * Per-venue health score (0–100) calculated from listing completeness +
 * reputation + responsiveness. Each weakness is individually fixable.
 */
export function ListingHealthCard() {
  const { user } = useAuth();
  const { data: venues = [], isLoading } = useOwnerVenues(user?.id);
  const { data: leads = [] } = useOwnerLeads();
  // null, not 0, when there is nothing in the window to measure: booking_intents
  // stopped receiving rows when the WhatsApp handoff was removed, so a 0 here
  // means "no data", not "this owner ignores people".
  const responseRate = useMemo(() => {
    const { total7d, responseRate: rate } = summarizeLeads(leads);
    return total7d === 0 ? null : rate;
  }, [leads]);

  const scored = useMemo(() => venues.map((v) => scoreVenue(v, responseRate)), [venues, responseRate]);
  const overall = scored.length
    ? Math.round(scored.reduce((s, x) => s + x.score, 0) / scored.length)
    : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          Listing Health
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="py-6 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
        ) : venues.length === 0 ? (
          <p className="text-sm text-muted-foreground">Add a venue to see your listing health score.</p>
        ) : (
          <>
            <div>
              <div className="flex items-end justify-between mb-1.5">
                <span className="text-xs uppercase tracking-wide text-muted-foreground">Overall score</span>
                <span className={`text-2xl font-bold tabular-nums ${scoreColor(overall)}`}>{overall}<span className="text-sm text-muted-foreground">/100</span></span>
              </div>
              <Progress value={overall} className="h-2" />
            </div>

            <div className="space-y-3 pt-1">
              {scored.map((s) => (
                <div key={s.id} className="rounded-lg border border-border p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <Link to={`/venue/${s.id}/edit`} className="font-medium text-foreground text-sm truncate hover:text-primary">{s.name}</Link>
                    <span className={`text-sm font-semibold tabular-nums ${scoreColor(s.score)}`}>{s.score}</span>
                  </div>
                  <Progress value={s.score} className="h-1.5" />
                  {s.issues.length > 0 ? (
                    <ul className="space-y-1 pt-1">
                      {s.issues.slice(0, 3).map((issue) => (
                        <li key={issue.label} className="flex items-start justify-between gap-2 text-xs">
                          <span className="flex items-start gap-1.5 text-muted-foreground min-w-0">
                            <AlertCircle className="h-3 w-3 text-amber-500 mt-0.5 shrink-0" />
                            <span>{issue.label}</span>
                          </span>
                          <Link to={issue.fixHref ?? `/venue/${s.id}/edit`}>
                            <Button variant="link" size="sm" className="h-auto p-0 text-xs">Fix</Button>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="flex items-center gap-1.5 text-xs text-emerald-600">
                      <CheckCircle2 className="h-3 w-3" /> Looks healthy
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function scoreColor(score: number) {
  if (score >= 80) return "text-emerald-600";
  if (score >= 50) return "text-amber-600";
  return "text-rose-600";
}


