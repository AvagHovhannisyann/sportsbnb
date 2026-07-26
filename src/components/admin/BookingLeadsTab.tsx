import { useState } from "react";
import { Loader2, MessageCircle, Phone, MessageSquare, ExternalLink } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import {
  useAllBookingIntents,
  useUpdateBookingIntent,
  type BookingIntent,
  type IntentStatus,
} from "@/hooks/useBookingIntents";
import { formatTimeOfDay } from "@/lib/time";

const STATUS_LABELS: Record<IntentStatus, { label: string; className: string }> = {
  clicked: { label: "Clicked", className: "bg-blue-500/10 text-blue-500 border-blue-500/20" },
  owner_contacted: { label: "Owner Contacted", className: "bg-amber-500/10 text-amber-500 border-amber-500/20" },
  confirmed_booking: { label: "Confirmed", className: "bg-green-500/10 text-green-500 border-green-500/20" },
  no_booking: { label: "No Booking", className: "bg-red-500/10 text-red-500 border-red-500/20" },
  no_response: { label: "No Response", className: "bg-muted text-muted-foreground" },
};

const CHANNEL_ICONS = {
  whatsapp: MessageCircle,
  sms: MessageSquare,
  call: Phone,
};

export default function BookingLeadsTab() {
  const { data: intents, isLoading } = useAllBookingIntents();
  const updateIntent = useUpdateBookingIntent();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [editingIntent, setEditingIntent] = useState<BookingIntent | null>(null);
  const [adminNotes, setAdminNotes] = useState("");

  const filtered = (intents ?? []).filter((i) => {
    const matchesStatus = statusFilter === "all" || i.status === statusFilter;
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      i.venue_name.toLowerCase().includes(q) ||
      i.booking_code.toLowerCase().includes(q) ||
      (i.customer_name?.toLowerCase().includes(q) ?? false) ||
      (i.customer_phone?.toLowerCase().includes(q) ?? false);
    return matchesStatus && matchesSearch;
  });

  // Stats
  const total = intents?.length ?? 0;
  const byChannel = (intents ?? []).reduce<Record<string, number>>((acc, i) => {
    acc[i.channel_used] = (acc[i.channel_used] ?? 0) + 1;
    return acc;
  }, {});
  const confirmed = (intents ?? []).filter((i) => i.status === "confirmed_booking").length;

  const openEdit = (intent: BookingIntent) => {
    setEditingIntent(intent);
    setAdminNotes(intent.admin_notes ?? "");
  };

  const saveNotes = async () => {
    if (!editingIntent) return;
    await updateIntent.mutateAsync({
      id: editingIntent.id,
      admin_notes: adminNotes,
    });
    setEditingIntent(null);
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-foreground">{total}</div>
            <div className="text-sm text-muted-foreground">Total Clicks</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-500">{confirmed}</div>
            <div className="text-sm text-muted-foreground">Confirmed Bookings</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-foreground">{byChannel.whatsapp ?? 0}</div>
            <div className="text-sm text-muted-foreground">via WhatsApp</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-foreground">
              {(byChannel.sms ?? 0) + (byChannel.call ?? 0)}
            </div>
            <div className="text-sm text-muted-foreground">via SMS / Call</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Booking Leads</CardTitle>
          <CardDescription>
            Track every click on a venue's WhatsApp/SMS/Call button. Update status manually after
            following up with the owner.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <Input
              placeholder="Search by venue, code, customer..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="sm:max-w-sm"
            />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="sm:w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="clicked">Clicked</SelectItem>
                <SelectItem value="owner_contacted">Owner Contacted</SelectItem>
                <SelectItem value="confirmed_booking">Confirmed</SelectItem>
                <SelectItem value="no_booking">No Booking</SelectItem>
                <SelectItem value="no_response">No Response</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No leads found.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Venue</TableHead>
                    <TableHead>Channel</TableHead>
                    <TableHead>Slot</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>When</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((intent) => {
                    const ChannelIcon = CHANNEL_ICONS[intent.channel_used] ?? MessageCircle;
                    const statusInfo = STATUS_LABELS[intent.status] ?? STATUS_LABELS.clicked;
                    return (
                      <TableRow key={intent.id}>
                        <TableCell className="font-mono text-xs">{intent.booking_code}</TableCell>
                        <TableCell>
                          <Link
                            to={`/venue/${intent.venue_id}`}
                            className="text-foreground hover:text-primary inline-flex items-center gap-1"
                          >
                            {intent.venue_name}
                            <ExternalLink className="h-3 w-3" />
                          </Link>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="gap-1">
                            <ChannelIcon className="h-3 w-3" />
                            {intent.channel_used}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {intent.booking_date ? (
                            <>
                              {format(new Date(intent.booking_date), "MMM d")}
                              {intent.booking_time && ` • ${formatTimeOfDay(intent.booking_time)}`}
                              {intent.players_count && ` • ${intent.players_count}p`}
                            </>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">
                          {intent.customer_name || (
                            <span className="text-muted-foreground">Guest</span>
                          )}
                          {intent.customer_phone && (
                            <div className="text-xs text-muted-foreground">
                              {intent.customer_phone}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(intent.created_at), "MMM d, HH:mm")}
                        </TableCell>
                        <TableCell>
                          <Select
                            value={intent.status}
                            onValueChange={(value: IntentStatus) =>
                              updateIntent.mutate({ id: intent.id, status: value })
                            }
                          >
                            <SelectTrigger className="w-40">
                              <Badge variant="outline" className={statusInfo.className}>
                                {statusInfo.label}
                              </Badge>
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="clicked">Clicked</SelectItem>
                              <SelectItem value="owner_contacted">Owner Contacted</SelectItem>
                              <SelectItem value="confirmed_booking">Confirmed</SelectItem>
                              <SelectItem value="no_booking">No Booking</SelectItem>
                              <SelectItem value="no_response">No Response</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" onClick={() => openEdit(intent)}>
                            {intent.admin_notes ? "Edit" : "Add"}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!editingIntent} onOpenChange={(open) => !open && setEditingIntent(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Lead notes</DialogTitle>
            <DialogDescription>
              {editingIntent?.booking_code} • {editingIntent?.venue_name}
            </DialogDescription>
          </DialogHeader>
          {editingIntent?.note && (
            <div className="rounded-md bg-muted p-3 text-sm">
              <div className="text-xs font-medium text-muted-foreground mb-1">Customer note</div>
              {editingIntent.note}
            </div>
          )}
          <Textarea
            value={adminNotes}
            onChange={(e) => setAdminNotes(e.target.value)}
            placeholder="Internal notes about this lead..."
            rows={5}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingIntent(null)}>
              Cancel
            </Button>
            <Button onClick={saveNotes} disabled={updateIntent.isPending}>
              {updateIntent.isPending ? "Saving..." : "Save notes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
