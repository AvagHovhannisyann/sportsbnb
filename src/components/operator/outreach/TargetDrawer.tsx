import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  OutreachTarget,
  useEnrichTarget, useResearchTarget, useDraftTarget, useSendTarget,
  useUpdateTarget, useOutreachMessages,
} from "@/hooks/useOutreach";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ExternalLink, Mail, Phone, Star, Globe, MapPin, Sparkles, Search, FileEdit, Send, Calendar, AlertCircle, Info } from "lucide-react";

interface Props {
  target: OutreachTarget | null;
  onClose: () => void;
}

export function TargetDrawer({ target, onClose }: Props) {
  const [contactEmail, setContactEmail] = useState("");
  const [contactName, setContactName] = useState("");
  const [language, setLanguage] = useState<"en" | "hy">("en");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [notes, setNotes] = useState("");
  const [followup, setFollowup] = useState("");

  const enrich = useEnrichTarget();
  const research = useResearchTarget();
  const draft = useDraftTarget();
  const send = useSendTarget();
  const update = useUpdateTarget();
  const { data: messages = [] } = useOutreachMessages(target?.id ?? null);

  useEffect(() => {
    if (!target) return;
    setContactEmail(target.contact_email ?? "");
    setContactName(target.contact_name ?? "");
    setLanguage((target.language as "en" | "hy") ?? "en");
    setSubject(target.ai_subject ?? "");
    setBody(target.ai_body ?? "");
    setNotes(target.notes ?? "");
    setFollowup(target.followup_at ? target.followup_at.slice(0, 16) : "");
  }, [target]);

  if (!target) return null;

  const e = target.enriched as Record<string, unknown>;
  const r = target.research as Record<string, unknown>;
  const website = e?.website as string | undefined;
  const mapsUrl = e?.maps_url as string | undefined;
  const phone = e?.phone as string | undefined;
  const address = e?.address as string | undefined;
  const rating = e?.rating as number | undefined;
  const hours = (e?.hours as string[] | undefined) ?? [];

  const saveMeta = async () => {
    await update.mutateAsync({
      id: target.id,
      patch: {
        contact_email: contactEmail || null,
        contact_name: contactName || null,
        language,
        notes: notes || null,
        followup_at: followup ? new Date(followup).toISOString() : null,
      },
    });
  };

  const saveDraft = async () => {
    await update.mutateAsync({
      id: target.id,
      patch: { ai_subject: subject, ai_body: body },
    });
  };

  const handleSend = async () => {
    if (!contactEmail || !subject || !body) return;
    await saveMeta();
    await send.mutateAsync({ target_id: target.id, to: contactEmail, subject, body });
  };

  return (
    <Sheet open={!!target} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <SheetTitle className="truncate">{target.name}</SheetTitle>
              <SheetDescription>
                {[target.city, target.country].filter(Boolean).join(" · ") || "—"}
              </SheetDescription>
            </div>
            <Badge variant="outline" className="shrink-0 capitalize">{target.status}</Badge>
          </div>
        </SheetHeader>

        <div className="flex gap-2 mt-4 flex-wrap">
          <Button size="sm" variant="outline" onClick={() => enrich.mutate(target.id)} disabled={enrich.isPending}>
            <MapPin className="h-3.5 w-3.5 mr-1.5" /> {enrich.isPending ? "Enriching…" : "Enrich (Maps)"}
          </Button>
          <Button size="sm" variant="outline" onClick={() => research.mutate(target.id)} disabled={research.isPending || !website}>
            <Search className="h-3.5 w-3.5 mr-1.5" /> {research.isPending ? "Researching…" : "Research site"}
          </Button>
          <Button size="sm" variant="outline" onClick={() => draft.mutate(target.id)} disabled={draft.isPending}>
            <Sparkles className="h-3.5 w-3.5 mr-1.5" /> {draft.isPending ? "Drafting…" : "AI draft"}
          </Button>
        </div>

        <Tabs defaultValue="contact" className="mt-6">
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="contact">Contact</TabsTrigger>
            <TabsTrigger value="data">Data</TabsTrigger>
            <TabsTrigger value="email">Email</TabsTrigger>
            <TabsTrigger value="log">Log ({messages.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="contact" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">Contact name</label>
                <Input value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="Owner / manager" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Language</label>
                <Select value={language} onValueChange={(v) => setLanguage(v as "en" | "hy")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="hy">Armenian</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Email</label>
              <Input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="owner@venue.com" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground flex items-center gap-1.5"><Calendar className="h-3 w-3" /> Manual follow-up reminder</label>
              <Input type="datetime-local" value={followup} onChange={(e) => setFollowup(e.target.value)} />
              <p className="text-xs text-muted-foreground mt-1">A reminder only — nothing sends automatically.</p>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Notes</label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
            </div>
            <Button onClick={saveMeta} disabled={update.isPending} className="w-full">Save</Button>
          </TabsContent>

          <TabsContent value="data" className="space-y-3 mt-4 text-sm">
            {address && <Row icon={<MapPin className="h-3.5 w-3.5" />} label="Address" value={address} />}
            {phone && <Row icon={<Phone className="h-3.5 w-3.5" />} label="Phone" value={<a href={`tel:${phone}`} className="text-primary hover:underline">{phone}</a>} />}
            {website && <Row icon={<Globe className="h-3.5 w-3.5" />} label="Website" value={<a href={website} target="_blank" rel="noopener" className="text-primary hover:underline inline-flex items-center gap-1">{website} <ExternalLink className="h-3 w-3" /></a>} />}
            {mapsUrl && <Row icon={<MapPin className="h-3.5 w-3.5" />} label="Maps" value={<a href={mapsUrl} target="_blank" rel="noopener" className="text-primary hover:underline inline-flex items-center gap-1">Open <ExternalLink className="h-3 w-3" /></a>} />}
            {typeof rating === "number" && <Row icon={<Star className="h-3.5 w-3.5" />} label="Rating" value={`${rating} (${e?.review_count ?? 0} reviews)`} />}
            {hours.length > 0 && (
              <div>
                <div className="text-xs text-muted-foreground mb-1">Hours</div>
                <div className="text-xs space-y-0.5 font-mono">{hours.map((h, i) => <div key={i}>{h}</div>)}</div>
              </div>
            )}
            {!address && !website && (
              <div className="text-sm text-muted-foreground p-4 border border-dashed rounded-lg text-center">
                No data yet. Click <span className="font-medium text-foreground">Enrich (Maps)</span> above.
              </div>
            )}

            {Object.keys(r).length > 0 && (
              <>
                <Separator className="my-4" />
                <div className="text-xs uppercase tracking-wide text-muted-foreground">AI research</div>
                {r.summary != null && <p className="text-sm">{String(r.summary)}</p>}
                {r.unique_angle != null && <p className="text-sm text-foreground/90 italic">"{String(r.unique_angle)}"</p>}
                {Array.isArray(r.sports) && r.sports.length > 0 && (
                  <div className="flex flex-wrap gap-1">{(r.sports as string[]).map((s) => <Badge key={s} variant="secondary">{s}</Badge>)}</div>
                )}
              </>
            )}
          </TabsContent>

          <TabsContent value="email" className="space-y-3 mt-4">
            <div>
              <label className="text-xs text-muted-foreground">Subject</label>
              <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Body</label>
              <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={14} className="font-mono text-sm" />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={saveDraft} disabled={update.isPending}><FileEdit className="h-3.5 w-3.5 mr-1.5" /> Save draft</Button>
              <Button onClick={handleSend} disabled={send.isPending || !contactEmail || !subject || !body} className="flex-1">
                <Send className="h-3.5 w-3.5 mr-1.5" /> {send.isPending ? "Sending…" : `Send to ${contactEmail || "…"}`}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              From: Avag from Sportsbnb &lt;avag@sportsbnb.org&gt; · Reply-to: support@sportsbnb.org
            </p>
          </TabsContent>

          <TabsContent value="log" className="space-y-3 mt-4">
            {messages.length === 0 ? (
              <div className="text-sm text-muted-foreground p-4 border border-dashed rounded-lg text-center">No messages yet.</div>
            ) : (
              messages.map((m) => (
                <div key={m.id} className="border rounded-lg p-3 text-sm">
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
                    <span className="inline-flex items-center gap-1.5"><Mail className="h-3 w-3" />{m.direction === "outbound" ? `To ${m.to_email}` : `From ${m.from_email}`}</span>
                    <span>{format(new Date(m.sent_at), "MMM d, HH:mm")}</span>
                  </div>
                  {m.subject && <div className="font-medium mb-1">{m.subject}</div>}
                  <div className="whitespace-pre-wrap text-foreground/80 text-xs">{m.body}</div>
                </div>
              ))
            )}
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5">
      <div className="text-muted-foreground mt-0.5">{icon}</div>
      <div className="min-w-0 flex-1">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="text-sm break-words">{value}</div>
      </div>
    </div>
  );
}
