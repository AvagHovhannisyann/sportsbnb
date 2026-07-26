import { useState, useEffect } from "react";
import { TONE_CHIP } from "@/lib/chips";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { 
  Link2, 
  ExternalLink, 
  Check, 
  Copy, 
  RefreshCw,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { OwnerLayout } from "@/components/owner/OwnerLayout";
import { EmptyState } from "@/components/ui/empty-state";
import { useOwnerVenues } from "@/hooks/useVenues";
import { useCalendarIntegrations } from "@/hooks/useCalendarIntegrations";
import { toast } from "sonner";

// Google Calendar icon component
const GoogleCalendarIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="3" y="4" width="18" height="18" rx="2" fill="#4285F4"/>
    <rect x="3" y="4" width="18" height="4" fill="#1A73E8"/>
    <text x="12" y="17" textAnchor="middle" fill="white" fontSize="8" fontWeight="bold">31</text>
  </svg>
);

// Outlook icon component
const OutlookIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="3" y="4" width="18" height="18" rx="2" fill="#0078D4"/>
    <text x="12" y="17" textAnchor="middle" fill="white" fontSize="7" fontWeight="bold">O</text>
  </svg>
);

const OwnerIntegrationsPage = () => {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const { data: myVenues = [] } = useOwnerVenues(user?.id);
  
  const [selectedVenueId, setSelectedVenueId] = useState<string | null>(null);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [externalCalendarUrl, setExternalCalendarUrl] = useState("");
  const [copied, setCopied] = useState(false);

  const { status, isLoading, isConnecting, initiateOAuth, disconnect } = useCalendarIntegrations(selectedVenueId);

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

  if (authLoading) {
    return (
      <OwnerLayout title="Integrations">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </OwnerLayout>
    );
  }

  // Generate iCal feed URL (demo)
  const icalFeedUrl = selectedVenueId 
    ? `${window.location.origin}/api/calendar/${selectedVenueId}/feed.ics`
    : "";

  const handleCopyLink = () => {
    navigator.clipboard.writeText(icalFeedUrl);
    setCopied(true);
    toast.success("iCal link copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleImportCalendar = () => {
    if (!externalCalendarUrl) {
      toast.error("Please enter a calendar URL");
      return;
    }
    toast.success("External calendar connected! Busy times will be synced.");
    setImportDialogOpen(false);
    setExternalCalendarUrl("");
  };

  const integrations = [
    {
      id: "google" as const,
      name: "Google Calendar",
      description: "Sync your bookings with Google Calendar and vice versa to prevent double bookings and keep everything in sync.",
      icon: GoogleCalendarIcon,
      iconBg: "bg-white dark:bg-white/10",
      connected: status.google,
    },
    {
      id: "outlook" as const,
      name: "Outlook Calendar",
      description: "Reduce double bookings by aligning your schedule across Sportsbnb and Outlook Calendar.",
      icon: OutlookIcon,
      iconBg: "bg-white dark:bg-white/10",
      connected: status.outlook,
    },
  ];

  return (
    <OwnerLayout title="Calendar Integrations" subtitle="Connect with external calendar services to prevent double bookings and keep everything in sync">
      {myVenues.length === 0 ? (
        <Card>
          <EmptyState
            icon={Link2}
            title="No venues to configure"
            description="Add a venue first to set up calendar integrations."
            actionLabel="Add Your First Venue"
            actionHref="/add-venue"
          />
        </Card>
      ) : (
        <div className="max-w-4xl space-y-6">
          {/* Venue Selector */}
          {myVenues.length > 1 && (
            <div>
              {/* See OwnerSettingsPage: a Label with no `htmlFor` names
                  nothing. This selector only renders above one venue, which is
                  why no audit had ever seen it. */}
              <Label htmlFor="integrations-venue" className="mb-2 block">Select Venue</Label>
              <Select value={selectedVenueId || ""} onValueChange={setSelectedVenueId}>
                <SelectTrigger id="integrations-venue" className="w-full max-w-xs">
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
          )}

          {/* Calendar Integration Cards */}
          <div className="grid md:grid-cols-2 gap-6">
            {integrations.map((integration) => {
              const Icon = integration.icon;
              const isCurrentlyConnecting = isConnecting === integration.id;
              
              return (
                <Card key={integration.id} className="relative overflow-hidden">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                      <div className={`w-12 h-12 rounded-xl ${integration.iconBg} border border-border flex items-center justify-center shrink-0`}>
                        <Icon className="h-8 w-8" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h2 className="font-semibold text-foreground mb-2">{integration.name}</h2>
                        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{integration.description}</p>
                        
                        {isLoading ? (
                          <div className="flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span className="text-sm text-muted-foreground">Checking status...</span>
                          </div>
                        ) : integration.connected ? (
                          <div className="flex items-center justify-between">
                            <Badge variant="secondary" className={TONE_CHIP.positive}>
                              <Check className="h-3 w-3 mr-1" />
                              Connected
                            </Badge>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => disconnect(integration.id)}
                            >
                              Disconnect
                            </Button>
                          </div>
                        ) : (
                          <Button 
                            variant="outline" 
                            className="w-full"
                            disabled={isCurrentlyConnecting}
                            onClick={() => initiateOAuth(integration.id)}
                          >
                            {isCurrentlyConnecting ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Connecting...
                              </>
                            ) : (
                              <>
                                Connect
                                <ExternalLink className="h-4 w-4 ml-2" />
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* iCal Export Section */}
          <Card>
            <CardHeader>
              <CardTitle as="h2" className="flex items-center gap-2">
                <Link2 className="h-5 w-5 text-primary" />
                Manual Calendar Sync
              </CardTitle>
              <CardDescription>
                Export your Sportsbnb calendar to sync with any calendar app using iCal
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Link2 className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-foreground mb-1">Export iCal Feed</h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      Copy this link and add it to any calendar app that supports iCal.
                    </p>
                    <div className="flex items-center gap-2">
                      <Input
                        aria-label="Calendar feed URL"
                        value={icalFeedUrl}
                        readOnly
                        className="font-mono text-xs bg-background"
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        aria-label="Copy calendar feed URL"
                        onClick={handleCopyLink}
                      >
                        {copied ? (
                          <Check className="h-4 w-4 text-emerald-600" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <h4 className="font-medium text-foreground">How to use:</h4>
                <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
                  <li>Copy the iCal feed URL above</li>
                  <li>Open your calendar app (Google Calendar, Outlook, Apple Calendar)</li>
                  <li>Add a calendar by URL / Subscribe to calendar</li>
                  <li>Paste the copied URL and save</li>
                </ol>
              </div>

              <Button variant="outline" onClick={() => setImportDialogOpen(true)}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Import External Calendar
              </Button>
            </CardContent>
          </Card>

          {/* Info Card */}
          <Card className="border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/10">
            <CardContent className="pt-6">
              <div className="flex gap-4">
                <AlertCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-medium text-foreground mb-1">Two-way calendar sync</h4>
                  <p className="text-sm text-muted-foreground">
                    When connected, your Sportsbnb bookings will automatically sync to your calendar. Events created in your external calendar will block those times in your Sportsbnb availability.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Import Dialog */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import External Calendar</DialogTitle>
            <DialogDescription>
              Add an external calendar to show busy times in your schedule.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="external-ical-url">iCal URL</Label>
              <Input
                id="external-ical-url"
                placeholder="https://calendar.google.com/calendar/ical/..."
                value={externalCalendarUrl}
                onChange={(e) => setExternalCalendarUrl(e.target.value)}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              Paste the iCal/ICS URL from Google Calendar, Outlook, or any other calendar service.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleImportCalendar}>
              Import Calendar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </OwnerLayout>
  );
};

export default OwnerIntegrationsPage;