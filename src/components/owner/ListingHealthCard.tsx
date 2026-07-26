import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Activity, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useOwnerVenues, type Venue } from "@/hooks/useVenues";
import { useOwnerLeads, summarizeLeads } from "@/hooks/useLeads";

/**
 * Per-venue health score (0–100) calculated from listing completeness +
 * reputation + responsiveness. Each weakness is individually fixable.
 */
export function ListingHealthCard() {
  const { user } = useAuth();
  const { data: venues = [], isLoading } = useOwnerVenues(user?.id);
  const { data: leads = [] } = useOwnerLeads();
  const responseRate = useMemo(() => summarizeLeads(leads).responseRate, [leads]);

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

interface VenueScore {
  id: string;
  name: string;
  score: number;
  issues: Array<{ label: string; fixHref?: string }>;
}

// Exported for testing: this is the number owners are told to optimise.
export function scoreVenue(v: Venue, responseRate: number): VenueScore {
  const issues: VenueScore["issues"] = [];

  // Scored as earned-out-of-possible rather than a running total out of a
  // fixed 100. A category whose underlying data the platform does not
  // maintain is excluded from the denominator instead of silently costing the
  // owner points they have no way to win — see the reputation block below.
  let earned = 0;
  let possible = 0;
  const award = (points: number, ok: boolean, issue?: string, partial = 0) => {
    possible += points;
    if (ok) earned += points;
    else {
      earned += partial;
      if (issue) issues.push({ label: issue });
    }
  };

  // Photo (25)
  award(25, Boolean(v.image_url), "Add a cover photo");

  // Description (15)
  const descLen = (v.description ?? "").trim().length;
  award(
    15,
    descLen >= 80,
    descLen > 0 ? "Expand your description (80+ chars)" : "Add a description",
    descLen > 0 ? 7 : 0,
  );

  // Location confirmed (10)
  award(10, Boolean(v.location_confirmed), "Confirm exact location on map");

  // Visible to players (10). This replaces a rule that awarded points for
  // enabling WhatsApp or phone contact and, when unset, told the owner to
  // "Enable WhatsApp or phone contact". Players book and pay in the app now;
  // the WhatsApp handoff was removed in Phase 2 and booking_intents is
  // read-only history. Coaching owners back toward it worked against the
  // product. Whether the listing is actually live is the equivalent
  // make-or-break for getting booked.
  award(10, v.is_active !== false, "Listing is hidden — make it active to take bookings");

  // Sports (5)
  award(5, (v.sports?.length ?? 0) > 0, "List supported sports");

  // Amenities (5)
  const amenities = v.amenities?.length ?? 0;
  award(5, amenities >= 3, "Add at least 3 amenities", amenities > 0 ? 2 : 0);

  // Reputation (15) — only when there is reputation data to judge.
  // venues.review_count has no writer anywhere in the codebase; it is
  // DEFAULT 0 and stays 0 however many reviews a venue actually collects. As
  // a scored category it docked every owner 15 points permanently and told
  // them "No reviews yet" regardless of the truth. Excluded from the
  // denominator until something maintains the column.
  if (v.review_count > 0) {
    award(15, v.review_count >= 5, "Get more reviews (5+ unlocks full credit)", 8);
  }

  // Response rate (15) — owner-wide signal, always meaningful.
  const rr = Math.max(0, Math.min(100, responseRate));
  possible += 15;
  earned += Math.round(rr * 0.15);
  if (rr < 70) issues.push({ label: `Reply faster — ${rr}% response rate` });

  const score = possible === 0 ? 0 : Math.round((earned / possible) * 100);
  return { id: v.id, name: v.name, score: Math.min(100, score), issues };
}

