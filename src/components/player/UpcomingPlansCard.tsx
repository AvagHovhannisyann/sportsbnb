import { Link } from "react-router-dom";
import { TONE_CHIP } from "@/lib/chips";
import { formatTimeOfDay } from "@/lib/time";
import { Sparkles, MessageCircle, Clock, MapPin, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useMyLeads } from "@/hooks/useLeads";
import { formatDistanceToNow } from "date-fns";

const labelFor = (outcome: string) => {
  switch (outcome) {
    case "confirmed": return { text: "Confirmed", cls: TONE_CHIP.positive };
    case "no_show": return { text: "Missed", cls: "bg-muted text-muted-foreground" };
    case "lost": return { text: "No response", cls: "bg-destructive/10 text-destructive border-destructive/20" };
    default: return { text: "Awaiting reply", cls: TONE_CHIP.warning };
  }
};

export const UpcomingPlansCard = () => {
  const { data: leads = [], isLoading } = useMyLeads();
  const active = leads.slice(0, 5);

  return (
    <Card>
      <CardHeader>
        {/* A dashboard section under the page h1: h2, not the h3 default. */}
        <CardTitle as="h2" className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Earlier inquiries
        </CardTitle>
        {/* booking_intents is read-only history now: the WhatsApp handoff was
            removed when in-app payment landed. Past tense, because these rows
            can only ever get older. */}
        <CardDescription>
          Venues you contacted before in-app booking — kept for your records.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="py-8 flex justify-center" role="status" aria-label="Loading your plans">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  </div>
        ) : active.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            {/* Was "find a venue and tap WhatsApp to start" — an instruction
                pointing at a flow that no longer exists. Booking and payment
                happen in the app now. */}
            <p className="mb-3">Nothing here — you can book and pay in the app directly.</p>
            <Button asChild size="sm">
              <Link to="/venues">Browse venues</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {active.map((lead) => {
              const tag = labelFor(lead.lead_outcome);
              return (
                <div key={lead.id} className="flex items-start gap-3 p-3 rounded-lg border border-border">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <MessageCircle className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link to={`/venue/${lead.venue_id}`} className="font-medium text-foreground hover:underline truncate">
                        {lead.venue_name}
                      </Link>
                      <Badge variant="outline" className={tag.cls}>{tag.text}</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2 flex-wrap">
                      {lead.booking_date && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{lead.booking_date} {formatTimeOfDay(lead.booking_time)}</span>}
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{formatDistanceToNow(new Date(lead.created_at), { addSuffix: true })}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
