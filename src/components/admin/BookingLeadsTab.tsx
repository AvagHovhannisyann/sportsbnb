import { useState } from "react";
import { format } from "date-fns";
import {
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  MessageCircle,
  MessageSquare,
  Phone,
} from "lucide-react";
import { Link } from "react-router-dom";
import { ErrorPanel, StatusPanel } from "@/components/common/StatusPanel";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
  useAllBookingIntents,
  useUpdateBookingIntent,
  type BookingIntent,
  type IntentStatus,
} from "@/hooks/useBookingIntents";
import { TONE_CHIP } from "@/lib/chips";
import { formatTimeOfDay } from "@/lib/time";

const STATUS_LABELS: Record<IntentStatus, { label: string; className: string }> = {
  clicked: { label: "Clicked", className: TONE_CHIP.info },
  owner_contacted: { label: "Owner contacted", className: TONE_CHIP.warning },
  confirmed_booking: { label: "Confirmed", className: TONE_CHIP.positive },
  no_booking: { label: "No booking", className: TONE_CHIP.danger },
  no_response: { label: "No response", className: TONE_CHIP.neutral },
};

const CHANNEL_ICONS = {
  whatsapp: MessageCircle,
  sms: MessageSquare,
  call: Phone,
};

// A map rather than CSS `capitalize`, which would render "Whatsapp" and "Sms".
// The CHECK constraint allows exactly these three.
const CHANNEL_LABELS: Record<string, string> = {
  whatsapp: "WhatsApp",
  sms: "SMS",
  call: "Phone call",
};

const LeadStatusSelect = ({
  intent,
  onChange,
  disabled,
  className,
}: {
  intent: BookingIntent;
  onChange: (value: IntentStatus) => void;
  disabled: boolean;
  className?: string;
}) => {
  const statusInfo = STATUS_LABELS[intent.status] ?? STATUS_LABELS.clicked;

  return (
    <Select value={intent.status} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger
        className={className}
        aria-label={`Status for booking lead ${intent.booking_code}`}
      >
        <SelectValue>
          <Badge variant="outline" className={statusInfo.className}>
            {statusInfo.label}
          </Badge>
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="clicked">Clicked</SelectItem>
        <SelectItem value="owner_contacted">Owner contacted</SelectItem>
        <SelectItem value="confirmed_booking">Confirmed</SelectItem>
        <SelectItem value="no_booking">No booking</SelectItem>
        <SelectItem value="no_response">No response</SelectItem>
      </SelectContent>
    </Select>
  );
};

const LeadLoadingState = () => (
  <div className="space-y-3" role="status" aria-label="Loading booking leads">
    <Skeleton className="h-24 w-full" />
    <Skeleton className="h-24 w-full" />
    <Skeleton className="h-24 w-full" />
  </div>
);

const LeadMetric = ({
  label,
  value,
  loading,
  unavailable,
  positive,
}: {
  label: string;
  value: number;
  loading: boolean;
  unavailable: boolean;
  positive?: boolean;
}) => (
  <Card className="min-w-0">
    <CardContent className="p-4 sm:p-5">
      <p className="text-xs font-medium leading-4 text-muted-foreground sm:text-sm">{label}</p>
      {loading ? (
        <Skeleton className="mt-2 h-6 w-16" />
      ) : (
        <p
          className={`stat-numeral mt-2 break-words text-2xl font-semibold leading-none ${
            positive && !unavailable ? "text-success" : "text-foreground"
          }`}
        >
          {unavailable ? "Unavailable" : value.toLocaleString()}
        </p>
      )}
    </CardContent>
  </Card>
);

export default function BookingLeadsTab() {
  const intentsQuery = useAllBookingIntents();
  const updateIntent = useUpdateBookingIntent();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [editingIntent, setEditingIntent] = useState<BookingIntent | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [lastUpdateKind, setLastUpdateKind] = useState<"notes" | "status" | null>(null);

  const intents = intentsQuery.data ?? [];
  const filtered = intents.filter((intent) => {
    const matchesStatus = statusFilter === "all" || intent.status === statusFilter;
    const query = search.trim().toLocaleLowerCase();
    const matchesSearch =
      !query ||
      intent.venue_name.toLocaleLowerCase().includes(query) ||
      intent.booking_code.toLocaleLowerCase().includes(query) ||
      (intent.customer_name?.toLocaleLowerCase().includes(query) ?? false) ||
      (intent.customer_phone?.toLocaleLowerCase().includes(query) ?? false);
    return matchesStatus && matchesSearch;
  });

  const byChannel = intents.reduce<Record<string, number>>((accumulator, intent) => {
    accumulator[intent.channel_used] = (accumulator[intent.channel_used] ?? 0) + 1;
    return accumulator;
  }, {});
  const confirmed = intents.filter((intent) => intent.status === "confirmed_booking").length;

  const openEdit = (intent: BookingIntent) => {
    updateIntent.reset();
    setLastUpdateKind(null);
    setEditingIntent(intent);
    setAdminNotes(intent.admin_notes ?? "");
  };

  const saveNotes = async () => {
    if (!editingIntent) return;
    setLastUpdateKind("notes");
    try {
      await updateIntent.mutateAsync({
        id: editingIntent.id,
        admin_notes: adminNotes,
      });
      setEditingIntent(null);
    } catch {
      // The mutation state renders a contextual error and keeps the notes open.
    }
  };

  const updateStatus = (intent: BookingIntent, status: IntentStatus) => {
    setLastUpdateKind("status");
    updateIntent.mutate({ id: intent.id, status });
  };

  return (
    <div className="space-y-5">
      <section aria-label="Booking lead summary" className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <LeadMetric
          label="Contact starts"
          value={intents.length}
          loading={intentsQuery.isLoading}
          unavailable={intentsQuery.isError}
        />
        <LeadMetric
          label="Confirmed"
          value={confirmed}
          loading={intentsQuery.isLoading}
          unavailable={intentsQuery.isError}
          positive
        />
        <LeadMetric
          label="WhatsApp"
          value={byChannel.whatsapp ?? 0}
          loading={intentsQuery.isLoading}
          unavailable={intentsQuery.isError}
        />
        <LeadMetric
          label="SMS and calls"
          value={(byChannel.sms ?? 0) + (byChannel.call ?? 0)}
          loading={intentsQuery.isLoading}
          unavailable={intentsQuery.isError}
        />
      </section>

      <Card>
        <CardHeader className="p-5 pb-4 sm:p-6 sm:pb-4">
          <CardTitle as="h2" className="text-lg">Booking leads</CardTitle>
          <CardDescription>
            Track contact handoffs and record the result after an owner follow-up.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-5 pt-0 sm:p-6 sm:pt-0">
          {updateIntent.isError && !editingIntent && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle aria-hidden="true" />
              <AlertTitle>Lead update failed</AlertTitle>
              <AlertDescription>
                {lastUpdateKind === "notes"
                  ? "The notes were not saved. Open the lead and try again."
                  : "The previous status was kept. Try the update again."}
              </AlertDescription>
            </Alert>
          )}

          <div className="mb-5 grid gap-3 sm:grid-cols-[minmax(0,1fr)_13rem]">
            <div className="space-y-1.5">
              <Label htmlFor="booking-lead-search">Search leads</Label>
              <Input
                id="booking-lead-search"
                type="search"
                placeholder="Venue, code, customer, or phone"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="booking-lead-status-filter">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger id="booking-lead-status-filter" aria-label="Filter booking leads by status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="clicked">Clicked</SelectItem>
                  <SelectItem value="owner_contacted">Owner contacted</SelectItem>
                  <SelectItem value="confirmed_booking">Confirmed</SelectItem>
                  <SelectItem value="no_booking">No booking</SelectItem>
                  <SelectItem value="no_response">No response</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {intentsQuery.isLoading ? (
            <LeadLoadingState />
          ) : intentsQuery.isError ? (
            <ErrorPanel
              what="booking leads"
              description="No lead status has been inferred from the failed request."
              onRetry={() => intentsQuery.refetch()}
              isRetrying={intentsQuery.isFetching}
              className="py-8"
            />
          ) : filtered.length === 0 ? (
            <StatusPanel
              icon={intents.length === 0 ? MessageCircle : CheckCircle2}
              title={intents.length === 0 ? "No booking leads yet" : "No leads match these filters"}
              description={
                intents.length === 0
                  ? "Contact handoffs will appear here after a customer reaches out from a venue page."
                  : "Change the status filter or broaden the search."
              }
              className="py-8"
            />
          ) : (
            <>
              <ul className="space-y-3 lg:hidden" aria-label="Booking leads">
                {filtered.map((intent) => {
                  const ChannelIcon = CHANNEL_ICONS[intent.channel_used] ?? MessageCircle;
                  return (
                    <li key={intent.id} className="rounded-lg border border-border bg-surface-1 p-4">
                      <div className="flex min-w-0 items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-mono text-xs font-medium text-muted-foreground">
                            {intent.booking_code}
                          </p>
                          <Link
                            to={`/venue/${intent.venue_id}`}
                            className="mt-1 inline-flex max-w-full items-start gap-1.5 font-semibold leading-snug text-foreground outline-none hover:text-primary focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-ring"
                          >
                            <span className="min-w-0 break-words">{intent.venue_name}</span>
                            <ExternalLink aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                          </Link>
                        </div>
                        <Badge variant="outline" className="shrink-0 gap-1">
                          <ChannelIcon aria-hidden="true" className="h-3 w-3" />
                          {CHANNEL_LABELS[intent.channel_used] ?? intent.channel_used}
                        </Badge>
                      </div>

                      <dl className="mt-3 grid grid-cols-2 gap-3 border-t border-border pt-3 text-sm">
                        <div>
                          <dt className="text-xs text-muted-foreground">Requested slot</dt>
                          <dd className="mt-0.5 text-foreground">
                            {intent.booking_date ? (
                              <>
                                {format(new Date(intent.booking_date), "MMM d")}
                                {intent.booking_time && <><br />{formatTimeOfDay(intent.booking_time)}</>}
                                {intent.players_count && ` · ${intent.players_count} players`}
                              </>
                            ) : (
                              "Not provided"
                            )}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-xs text-muted-foreground">Customer</dt>
                          <dd className="mt-0.5 break-words text-foreground">{intent.customer_name || "Guest"}</dd>
                          {intent.customer_phone && (
                            <dd className="mt-0.5 break-all text-xs text-muted-foreground">{intent.customer_phone}</dd>
                          )}
                        </div>
                        <div className="col-span-2">
                          <dt className="text-xs text-muted-foreground">Created</dt>
                          <dd className="mt-0.5 text-foreground">
                            {format(new Date(intent.created_at), "MMM d, yyyy · HH:mm")}
                          </dd>
                        </div>
                      </dl>

                      <div className="mt-4 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                        <LeadStatusSelect
                          intent={intent}
                          onChange={(value) => updateStatus(intent, value)}
                          disabled={updateIntent.isPending}
                          className="w-full"
                        />
                        <Button variant="outline" size="sm" onClick={() => openEdit(intent)}>
                          {intent.admin_notes ? "Edit notes" : "Add notes"}
                        </Button>
                      </div>
                    </li>
                  );
                })}
              </ul>

              <div className="hidden lg:block">
                <Table>
                  <caption className="sr-only">
                    Booking contact leads with requested slots, customers, follow-up states, and notes.
                  </caption>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Venue</TableHead>
                      <TableHead>Channel</TableHead>
                      <TableHead>Requested slot</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((intent) => {
                      const ChannelIcon = CHANNEL_ICONS[intent.channel_used] ?? MessageCircle;
                      return (
                        <TableRow key={intent.id}>
                          <TableCell className="font-mono text-xs">{intent.booking_code}</TableCell>
                          <TableCell className="max-w-52">
                            <Link
                              to={`/venue/${intent.venue_id}`}
                              className="inline-flex items-start gap-1.5 font-semibold leading-snug text-foreground outline-none hover:text-primary focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-ring"
                            >
                              <span className="break-words">{intent.venue_name}</span>
                              <ExternalLink aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                            </Link>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="gap-1">
                              <ChannelIcon aria-hidden="true" className="h-3 w-3" />
                              {CHANNEL_LABELS[intent.channel_used] ?? intent.channel_used}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">
                            {intent.booking_date ? (
                              <>
                                {format(new Date(intent.booking_date), "MMM d")}
                                {intent.booking_time && ` · ${formatTimeOfDay(intent.booking_time)}`}
                                {intent.players_count && ` · ${intent.players_count} players`}
                              </>
                            ) : (
                              <span className="text-muted-foreground">Not provided</span>
                            )}
                          </TableCell>
                          <TableCell className="max-w-48 text-sm">
                            <p className="break-words text-foreground">{intent.customer_name || "Guest"}</p>
                            {intent.customer_phone && (
                              <p className="break-all text-xs text-muted-foreground">{intent.customer_phone}</p>
                            )}
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                            {format(new Date(intent.created_at), "MMM d, HH:mm")}
                          </TableCell>
                          <TableCell>
                            <LeadStatusSelect
                              intent={intent}
                              onChange={(value) => updateStatus(intent, value)}
                              disabled={updateIntent.isPending}
                              className="w-44"
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEdit(intent)}
                              aria-label={`${intent.admin_notes ? "Edit" : "Add"} notes for ${intent.booking_code}`}
                            >
                              {intent.admin_notes ? "Edit" : "Add"}
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!editingIntent} onOpenChange={(open) => !open && setEditingIntent(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Lead notes</DialogTitle>
            <DialogDescription className="break-words">
              {editingIntent?.booking_code} · {editingIntent?.venue_name}
            </DialogDescription>
          </DialogHeader>
          {editingIntent?.note && (
            <div className="rounded-lg border border-border bg-surface-1 p-3 text-sm leading-relaxed text-foreground">
              <p className="mb-1 text-xs font-medium text-muted-foreground">Customer note</p>
              <p className="whitespace-pre-wrap break-words">{editingIntent.note}</p>
            </div>
          )}
          {updateIntent.isError && (
            <Alert variant="destructive">
              <AlertCircle aria-hidden="true" />
              <AlertTitle>Notes were not saved</AlertTitle>
              <AlertDescription>Review the connection and try again.</AlertDescription>
            </Alert>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="booking-lead-admin-notes">Internal notes</Label>
            <Textarea
              id="booking-lead-admin-notes"
              value={adminNotes}
              onChange={(event) => setAdminNotes(event.target.value)}
              placeholder="Add context for the operations team"
              rows={5}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingIntent(null)} disabled={updateIntent.isPending}>
              Cancel
            </Button>
            <Button onClick={saveNotes} disabled={updateIntent.isPending}>
              {updateIntent.isPending ? "Saving…" : "Save notes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
