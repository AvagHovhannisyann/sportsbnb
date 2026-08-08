import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Building2,
  CalendarDays,
  CalendarRange,
  Check,
  Copy,
  ExternalLink,
  Info,
  Link2,
  Loader2,
  RefreshCw,
} from "lucide-react";
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
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { OwnerLayout } from "@/components/owner/OwnerLayout";
import { ErrorPanel } from "@/components/common/StatusPanel";
import { useAuth } from "@/hooks/useAuth";
import { useCalendarIntegrations } from "@/hooks/useCalendarIntegrations";
import { useOwnerVenues } from "@/hooks/useVenues";
import { TONE_CHIP } from "@/lib/chips";
import { toast } from "sonner";

const OwnerIntegrationsPage = () => {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const {
    data: myVenues = [],
    isLoading: venuesLoading,
    isError: venuesError,
    isFetching: venuesFetching,
    refetch: refetchVenues,
  } = useOwnerVenues(user?.id);

  const [selectedVenueId, setSelectedVenueId] = useState<string | null>(null);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [externalCalendarUrl, setExternalCalendarUrl] = useState("");
  const [copied, setCopied] = useState(false);

  const { status, isLoading, isConnecting, initiateOAuth, disconnect } =
    useCalendarIntegrations(selectedVenueId);

  useEffect(() => {
    if (myVenues.length > 0 && !selectedVenueId) {
      setSelectedVenueId(myVenues[0].id);
    }
  }, [myVenues, selectedVenueId]);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login");
    }
  }, [user, authLoading, navigate]);

  if (authLoading || venuesLoading) {
    return (
      <OwnerLayout title="Integrations">
        <div className="flex h-64 items-center justify-center" role="status" aria-label="Loading integrations">
          <Loader2
            aria-hidden="true"
            className="h-7 w-7 animate-spin text-primary motion-reduce:animate-none"
          />
        </div>
      </OwnerLayout>
    );
  }

  if (venuesError) {
    return (
      <OwnerLayout title="Calendar integrations" subtitle="Manage calendar access for each venue.">
        <Card className="max-w-3xl">
          <ErrorPanel
            what="your venues"
            description="No integration settings have changed. Try loading your venues again."
            onRetry={() => refetchVenues()}
            isRetrying={venuesFetching}
          />
        </Card>
      </OwnerLayout>
    );
  }

  // This URL is part of the existing UI contract. The repository does not
  // currently include the server route that would return the feed, so the UI
  // describes it as a setup address rather than claiming it is already live.
  const icalFeedUrl = selectedVenueId
    ? `${window.location.origin}/api/calendar/${selectedVenueId}/feed.ics`
    : "";

  const handleCopyLink = () => {
    navigator.clipboard.writeText(icalFeedUrl);
    setCopied(true);
    toast.success("iCal address copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleImportCalendar = () => {
    if (!externalCalendarUrl) {
      toast.error("Please enter a calendar URL");
      return;
    }

    // Preserve the existing non-persistent action without reporting a sync
    // that never reaches a query, mutation, or edge function.
    toast.info("Automatic iCal import is not available yet");
    setImportDialogOpen(false);
    setExternalCalendarUrl("");
  };

  const integrations = [
    {
      id: "google" as const,
      name: "Google Calendar",
      description:
        "Authorize calendar access for this venue. Connected status confirms the account link is stored.",
      icon: CalendarDays,
      iconTone: "border-primary/20 bg-primary/10 text-primary",
      connected: status.google,
    },
    {
      id: "outlook" as const,
      name: "Outlook Calendar",
      description:
        "Authorize Outlook calendar access for this venue. Connected status confirms the account link is stored.",
      icon: CalendarRange,
      iconTone: "border-information/20 bg-information/10 text-information",
      connected: status.outlook,
    },
  ];

  const selectedVenue = myVenues.find((venue) => venue.id === selectedVenueId);
  const connectedCount = Number(status.google) + Number(status.outlook);

  return (
    <OwnerLayout
      title="Calendar integrations"
      subtitle="Manage account connections and calendar handoff options for each venue."
    >
      {myVenues.length === 0 ? (
        <Card className="max-w-3xl">
          <EmptyState
            icon={Building2}
            title="No venues to configure"
            description="Add a venue first to set up calendar integrations."
            actionLabel="Add your first venue"
            actionHref="/add-venue"
          />
        </Card>
      ) : (
        <div className="max-w-5xl space-y-5">
          <section
            aria-labelledby="integrations-venue-context"
            className="rounded-lg border border-border bg-surface-1 p-4 sm:flex sm:items-end sm:justify-between sm:gap-6"
          >
            <div className="min-w-0">
              <p className="eyebrow">Venue context</p>
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <h2
                  id="integrations-venue-context"
                  className="truncate font-display text-lg font-semibold tracking-extra-tight text-foreground"
                >
                  {selectedVenue?.name || "Choose a venue"}
                </h2>
                {selectedVenue && (
                  <Badge variant={selectedVenue.is_active ? "default" : "secondary"}>
                    {selectedVenue.is_active ? "Active" : "Draft"}
                  </Badge>
                )}
                <Badge variant="secondary" className={connectedCount > 0 ? TONE_CHIP.positive : undefined}>
                  {connectedCount} connected
                </Badge>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Connections and calendar links below apply only to this venue.
              </p>
            </div>
            <div className="mt-4 w-full sm:mt-0 sm:max-w-xs">
              <Label htmlFor="integrations-venue">Venue</Label>
              <Select value={selectedVenueId || ""} onValueChange={setSelectedVenueId}>
                <SelectTrigger id="integrations-venue" className="mt-1.5">
                  <SelectValue placeholder="Select a venue" />
                </SelectTrigger>
                <SelectContent>
                  {myVenues.map((venue) => (
                    <SelectItem key={venue.id} value={venue.id}>
                      {venue.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </section>

          <section aria-labelledby="calendar-connections-heading">
            <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
              <div>
                <h2
                  id="calendar-connections-heading"
                  className="font-display text-lg font-semibold tracking-extra-tight text-foreground"
                >
                  Account connections
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Connect or remove provider access without changing your venue schedule.
                </p>
              </div>
              <Badge variant="outline">OAuth connection</Badge>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {integrations.map((integration) => {
                const Icon = integration.icon;
                const isCurrentlyConnecting = isConnecting === integration.id;

                return (
                  <Card key={integration.id} className="min-w-0">
                    <CardContent className="p-5 sm:p-6">
                      <div className="flex items-start gap-3.5">
                        <div
                          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border ${integration.iconTone}`}
                        >
                          <Icon aria-hidden="true" className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <h3 className="font-display text-base font-semibold tracking-extra-tight text-foreground">
                              {integration.name}
                            </h3>
                            {!isLoading && integration.connected && (
                              <Badge variant="secondary" className={TONE_CHIP.positive}>
                                <Check aria-hidden="true" className="mr-1 h-3 w-3" />
                                Connected
                              </Badge>
                            )}
                          </div>
                          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                            {integration.description}
                          </p>
                        </div>
                      </div>

                      <div className="mt-5 border-t border-border pt-4">
                        {isLoading ? (
                          <div
                            className="flex min-h-11 items-center gap-2 text-sm text-muted-foreground"
                            role="status"
                            aria-label={`Checking ${integration.name} connection`}
                          >
                            <Loader2
                              aria-hidden="true"
                              className="h-4 w-4 animate-spin motion-reduce:animate-none"
                            />
                            Checking connection…
                          </div>
                        ) : integration.connected ? (
                          <Button
                            type="button"
                            variant="outline"
                            className="w-full sm:w-auto"
                            onClick={() => disconnect(integration.id)}
                          >
                            Disconnect
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            variant="outline"
                            className="w-full sm:w-auto"
                            disabled={isCurrentlyConnecting}
                            onClick={() => initiateOAuth(integration.id)}
                          >
                            {isCurrentlyConnecting ? (
                              <>
                                <Loader2
                                  aria-hidden="true"
                                  className="animate-spin motion-reduce:animate-none"
                                />
                                Connecting…
                              </>
                            ) : (
                              <>
                                Connect calendar
                                <ExternalLink aria-hidden="true" />
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </section>

          <Card>
            <CardHeader className="p-5 pb-4 sm:p-6 sm:pb-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <CardTitle as="h2" className="flex items-center gap-2 text-lg">
                    <Link2 aria-hidden="true" className="h-5 w-5 text-primary" />
                    Manual calendar handoff
                  </CardTitle>
                  <CardDescription className="mt-1.5">
                    Keep the existing iCal address available while setup is completed.
                  </CardDescription>
                </div>
                <Badge variant="secondary" className={TONE_CHIP.warning}>
                  Setup required
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-5 p-5 pt-0 sm:p-6 sm:pt-0">
              <div className="rounded-lg border border-border bg-surface-1 p-4">
                <Label htmlFor="ical-feed-url">iCal feed address</Label>
                <p id="ical-feed-help" className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  This address follows the current venue URL contract, but this repository does not yet serve the feed. Test it before sharing.
                </p>
                <div className="mt-3 flex min-w-0 flex-col gap-2 sm:flex-row">
                  <Input
                    id="ical-feed-url"
                    aria-describedby="ical-feed-help"
                    value={icalFeedUrl}
                    readOnly
                    className="min-w-0 font-mono text-xs"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full shrink-0 sm:w-auto"
                    onClick={handleCopyLink}
                  >
                    {copied ? (
                      <Check aria-hidden="true" className="text-success" />
                    ) : (
                      <Copy aria-hidden="true" />
                    )}
                    <span aria-live="polite">{copied ? "Copied" : "Copy address"}</span>
                  </Button>
                </div>
              </div>

              <div className="grid gap-4 border-t border-border pt-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
                <div>
                  <h3 className="font-semibold text-foreground">External iCal import</h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                    The URL field is retained for the planned import flow. It does not currently persist or block availability.
                  </p>
                </div>
                <Button type="button" variant="outline" onClick={() => setImportDialogOpen(true)}>
                  <RefreshCw aria-hidden="true" />
                  Enter calendar URL
                </Button>
              </div>
            </CardContent>
          </Card>

          <aside className="rounded-lg border border-information/20 bg-information/5 p-4" aria-label="Calendar connection note">
            <div className="flex items-start gap-3">
              <Info aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-information" />
              <div>
                <h2 className="font-semibold text-foreground">Connection status is not sync history</h2>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  A connected badge confirms stored provider access. This page does not show when events were last pushed or pulled, so verify the external calendar before relying on it operationally.
                </p>
              </div>
            </div>
          </aside>
        </div>
      )}

      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enter an external calendar URL</DialogTitle>
            <DialogDescription>
              Automatic iCal import is not connected to storage yet. Entering a URL here will not change venue availability.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="external-ical-url">iCal or ICS URL</Label>
            <Input
              id="external-ical-url"
              type="url"
              inputMode="url"
              autoComplete="url"
              placeholder="https://calendar.example.com/calendar.ics"
              value={externalCalendarUrl}
              onChange={(event) => setExternalCalendarUrl(event.target.value)}
            />
            <p className="text-sm leading-relaxed text-muted-foreground">
              Use the provider connection above for the supported authorization flow.
            </p>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setImportDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={handleImportCalendar}>
              Check availability
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </OwnerLayout>
  );
};

export default OwnerIntegrationsPage;
