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

function scoreVenue(v: Venue, responseRate: number): VenueScore {
  const issues: VenueScore["issues"] = [];
  let score = 0;

  // Photo (25 pts)
  if (v.image_url) score += 25;
  else issues.push({ label: "Add a cover photo" });

  // Description (15 pts)
  const descLen = (v.description ?? "").trim().length;
  if (descLen >= 80) score += 15;
  else if (descLen > 0) { score += 7; issues.push({ label: "Expand your description (80+ chars)" }); }
  else issues.push({ label: "Add a description" });

  // Location confirmed (10 pts)
  if (v.location_confirmed) score += 10;
  else issues.push({ label: "Confirm exact location on map" });

  // Contact channels (10 pts)
  if (v.whatsapp_enabled || v.sms_enabled || v.phone) score += 10;
  else issues.push({ label: "Enable WhatsApp or phone contact" });

  // Sports (5 pts)
  if ((v.sports?.length ?? 0) > 0) score += 5;
  else issues.push({ label: "List supported sports" });

  // Amenities (5 pts)
  if ((v.amenities?.length ?? 0) >= 3) score += 5;
  else if ((v.amenities?.length ?? 0) > 0) score += 2;
  else issues.push({ label: "Add at least 3 amenities" });

  // Reputation (15 pts)
  if (v.review_count >= 5) score += 15;
  else if (v.review_count > 0) { score += 8; issues.push({ label: "Get more reviews (5+ unlocks full credit)" }); }
  else issues.push({ label: "No reviews yet — share your link" });

  // Response rate (15 pts) — pulled from owner-wide signal
  const rr = Math.max(0, Math.min(100, responseRate));
  score += Math.round(rr * 0.15);
  if (rr < 70) issues.push({ label: `Reply faster — ${rr}% response rate` });

  return { id: v.id, name: v.name, score: Math.min(100, score), issues };
}
