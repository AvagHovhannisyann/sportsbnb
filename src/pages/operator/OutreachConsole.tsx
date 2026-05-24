import { useMemo, useState } from "react";
import { useOutreachTargets, usePrepareTarget, useDeleteTarget, type OutreachTarget } from "@/hooks/useOutreach";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { PasteImportDialog } from "@/components/operator/outreach/PasteImportDialog";
import { TargetDrawer } from "@/components/operator/outreach/TargetDrawer";
import { Plus, Search, Sparkles, Trash2, ChevronLeft, Mail, MapPin } from "lucide-react";
import { Link } from "react-router-dom";
import SEOHead from "@/components/seo/SEOHead";
import { format, formatDistanceToNow } from "date-fns";

const STATUS_COLORS: Record<string, string> = {
  new: "bg-muted text-muted-foreground",
  enriched: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  researched: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  drafted: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  contacted: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  replied: "bg-green-500/20 text-green-400 border-green-500/30",
  onboarded: "bg-primary/20 text-primary border-primary/30",
  passed: "bg-red-500/15 text-red-400 border-red-500/30",
};

export default function OutreachConsole() {
  const { data: targets = [], isLoading } = useOutreachTargets();
  const prepare = usePrepareTarget();
  const del = useDeleteTarget();
  const [importOpen, setImportOpen] = useState(false);
  const [selected, setSelected] = useState<OutreachTarget | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return targets.filter((t) => {
      if (statusFilter && t.status !== statusFilter) return false;
      if (!query) return true;
      const q = query.toLowerCase();
      return (
        t.name.toLowerCase().includes(q) ||
        (t.city ?? "").toLowerCase().includes(q) ||
        (t.contact_email ?? "").toLowerCase().includes(q)
      );
    });
  }, [targets, query, statusFilter]);

  const stats = useMemo(() => {
    const s = { total: targets.length, contacted: 0, replied: 0, onboarded: 0, followups_due: 0 };
    const now = Date.now();
    targets.forEach((t) => {
      if (["contacted", "replied", "onboarded"].includes(t.status)) s.contacted++;
      if (t.status === "replied") s.replied++;
      if (t.status === "onboarded") s.onboarded++;
      if (t.followup_at && new Date(t.followup_at).getTime() <= now) s.followups_due++;
    });
    return s;
  }, [targets]);

  const selectedTarget = useMemo(
    () => targets.find((t) => t.id === selected?.id) ?? selected,
    [targets, selected]
  );

  const prepareAllNew = async () => {
    const news = targets.filter((t) => ["new", "enriched", "researched"].includes(t.status));
    for (const t of news) {
      try { await prepare.mutateAsync(t.id); } catch { /* noop */ }
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <SEOHead title="AI Outreach Console · Sportsbnb" description="Admin outreach workspace" />
      <div className="border-b border-border/40 bg-card/30 backdrop-blur sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center gap-4">
          <Button asChild variant="ghost" size="sm">
            <Link to="/operator"><ChevronLeft className="h-4 w-4 mr-1" /> Operator</Link>
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-semibold tracking-tight">AI Venue Outreach</h1>
            <p className="text-xs text-muted-foreground">Enrich · Research · Draft · Send · Track replies</p>
          </div>
          <Button variant="outline" size="sm" onClick={prepareAllNew} disabled={prepare.isPending}>
            <Sparkles className="h-3.5 w-3.5 mr-1.5" /> AI prepare all
          </Button>
          <Button size="sm" onClick={() => setImportOpen(true)}>
            <Plus className="h-3.5 w-3.5 mr-1.5" /> Import venues
          </Button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <StatCard label="Total" value={stats.total} onClick={() => setStatusFilter(null)} active={!statusFilter} />
          <StatCard label="Contacted" value={stats.contacted} />
          <StatCard label="Replied" value={stats.replied} onClick={() => setStatusFilter("replied")} active={statusFilter === "replied"} />
          <StatCard label="Onboarded" value={stats.onboarded} onClick={() => setStatusFilter("onboarded")} active={statusFilter === "onboarded"} />
          <StatCard label="Follow-ups due" value={stats.followups_due} highlight={stats.followups_due > 0} />
        </div>

        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search venues, city, email…" className="pl-9" />
          </div>
          {statusFilter && (
            <Button variant="ghost" size="sm" onClick={() => setStatusFilter(null)}>Clear filter: {statusFilter}</Button>
          )}
        </div>

        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Venue</TableHead>
                <TableHead>City</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last contacted</TableHead>
                <TableHead>Follow-up</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground">Loading…</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-16 text-muted-foreground">
                  {targets.length === 0 ? (
                    <div className="space-y-3">
                      <p>No venues yet.</p>
                      <Button onClick={() => setImportOpen(true)}><Plus className="h-3.5 w-3.5 mr-1.5" /> Import your first list</Button>
                    </div>
                  ) : "No results"}
                </TableCell></TableRow>
              ) : filtered.map((t) => {
                const overdue = t.followup_at && new Date(t.followup_at).getTime() <= Date.now();
                return (
                  <TableRow key={t.id} className="cursor-pointer hover:bg-muted/40" onClick={() => setSelected(t)}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {t.name}
                        {(t.enriched as { website?: string })?.website && <MapPin className="h-3 w-3 text-emerald-500" />}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">{t.city ?? "—"}</TableCell>
                    <TableCell className="text-sm">
                      {t.contact_email ? (
                        <span className="inline-flex items-center gap-1"><Mail className="h-3 w-3" />{t.contact_email}</span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={STATUS_COLORS[t.status] ?? ""}>{t.status}</Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {t.last_contacted_at ? formatDistanceToNow(new Date(t.last_contacted_at), { addSuffix: true }) : "—"}
                    </TableCell>
                    <TableCell className="text-xs">
                      {t.followup_at ? (
                        <span className={overdue ? "text-amber-400 font-medium" : "text-muted-foreground"}>
                          {format(new Date(t.followup_at), "MMM d, HH:mm")}
                        </span>
                      ) : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); if (confirm(`Delete ${t.name}?`)) del.mutate(t.id); }}>
                        <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      </div>

      <PasteImportDialog open={importOpen} onOpenChange={setImportOpen} />
      <TargetDrawer target={selectedTarget} onClose={() => setSelected(null)} />
    </div>
  );
}

function StatCard({ label, value, onClick, active, highlight }: { label: string; value: number; onClick?: () => void; active?: boolean; highlight?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={`text-left p-4 rounded-xl border transition-all ${
        active ? "border-primary bg-primary/5" : "border-border/60 bg-card/40 hover:border-border"
      } ${onClick ? "cursor-pointer" : "cursor-default"}`}
    >
      <div className="text-xs text-muted-foreground uppercase tracking-wide">{label}</div>
      <div className={`text-2xl font-semibold mt-1 ${highlight ? "text-amber-400" : ""}`}>{value}</div>
    </button>
  );
}
