import { useState } from "react";
import { TONE_CHIP } from "@/lib/chips";
import { Inbox, MessageCircle, Phone, MessageSquare, CheckCircle2, XCircle, Clock, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useOwnerLeads, useUpdateLeadOutcome, type LeadOutcome, type OwnerLead } from "@/hooks/useLeads";
import { formatDistanceToNow } from "date-fns";
import { formatTimeOfDay } from "@/lib/time";

const channelIcon = {
  whatsapp: MessageCircle,
  sms: MessageSquare,
  call: Phone,
} as const;

const outcomeBadge: Record<LeadOutcome, { label: string; className: string }> = {
  pending: { label: "Pending", className: TONE_CHIP.warning },
  confirmed: { label: "Confirmed", className: TONE_CHIP.positive },
  no_show: { label: "No-show", className: "bg-muted text-muted-foreground" },
  lost: { label: "Lost", className: "bg-destructive/10 text-destructive border-destructive/20" },
};

export const LeadInboxCard = () => {
  const { data: leads = [], isLoading } = useOwnerLeads();
  const update = useUpdateLeadOutcome();
  const [filter, setFilter] = useState<"all" | "pending" | "confirmed">("pending");

  const filtered = leads.filter((l) =>
    filter === "all" ? true : filter === "pending" ? l.lead_outcome === "pending" : l.lead_outcome === "confirmed"
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Inbox className="h-5 w-5 text-primary" />
            Lead Inbox
          </CardTitle>
          <CardDescription>
            WhatsApp / SMS / Call handoffs. Mark each one so we can track conversion.
          </CardDescription>
        </div>
        <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
          <TabsList>
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="confirmed">Confirmed</TabsTrigger>
            <TabsTrigger value="all">All</TabsTrigger>
          </TabsList>
        </Tabs>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="py-12 flex justify-center" role="status" aria-label="Loading your inbox">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            <Inbox className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p className="font-medium">No {filter === "all" ? "" : filter} leads</p>
            <p className="text-sm">When players reach out via WhatsApp, SMS or call, they'll show up here.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((lead) => (
              <LeadRow key={lead.id} lead={lead} onUpdate={(outcome) => update.mutate({ id: lead.id, lead_outcome: outcome })} pending={update.isPending} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const LeadRow = ({
  lead,
  onUpdate,
  pending,
}: {
  lead: OwnerLead;
  onUpdate: (outcome: LeadOutcome) => void;
  pending: boolean;
}) => {
  const Icon = channelIcon[lead.channel_used] ?? MessageCircle;
  const badge = outcomeBadge[lead.lead_outcome];
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/40 transition-colors">
      <div className="flex items-start gap-3 flex-1 min-w-0">
        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <Icon className="h-4 w-4 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-medium text-foreground truncate">{lead.venue_name}</p>
            <Badge variant="outline" className={badge.className}>{badge.label}</Badge>
          </div>
          <div className="text-sm text-muted-foreground mt-0.5">
            {lead.customer_name || "Unknown player"}
            {lead.booking_date && ` · ${lead.booking_date}`}
            {lead.booking_time && ` ${formatTimeOfDay(lead.booking_time)}`}
            {lead.players_count ? ` · ${lead.players_count} players` : ""}
          </div>
          <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
            <Clock className="h-3 w-3" />
            {formatDistanceToNow(new Date(lead.created_at), { addSuffix: true })} · code {lead.booking_code}
          </div>
        </div>
      </div>
      <div className="flex gap-2 shrink-0">
        <Button
          size="sm"
          variant="outline"
          className="text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/10"
          onClick={() => onUpdate("confirmed")}
          disabled={pending || lead.lead_outcome === "confirmed"}
        >
          <CheckCircle2 className="h-4 w-4 mr-1" /> Confirmed
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => onUpdate("no_show")}
          disabled={pending || lead.lead_outcome === "no_show"}
        >
          No-show
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="text-destructive hover:bg-destructive/10"
          onClick={() => onUpdate("lost")}
          disabled={pending || lead.lead_outcome === "lost"}
        >
          <XCircle className="h-4 w-4 mr-1" /> Lost
        </Button>
      </div>
    </div>
  );
};
