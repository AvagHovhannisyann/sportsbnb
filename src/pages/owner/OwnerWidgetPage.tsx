import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Braces,
  Building2,
  Check,
  Code2,
  Copy,
  ExternalLink,
  Info,
  Link2,
  Loader2,
  Palette,
} from "lucide-react";
import { ErrorPanel } from "@/components/common/StatusPanel";
import { OwnerLayout } from "@/components/owner/OwnerLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { useOwnerVenues } from "@/hooks/useVenues";
import { DEFAULT_WIDGET_PRIMARY_COLOR } from "@/lib/color";
import { toast } from "sonner";

interface WidgetPreviewUnavailableProps {
  venueName: string;
}

const WidgetPreviewUnavailable = ({ venueName }: WidgetPreviewUnavailableProps) => {
  return (
    <div
      className="flex min-h-72 items-center justify-center rounded-lg border border-border bg-surface-1 px-6 py-10 text-center sm:min-h-96"
      role="status"
    >
      <div className="max-w-sm">
        <Info aria-hidden="true" className="mx-auto mb-3 h-6 w-6 text-information" />
        <p className="font-semibold text-foreground">Inline preview unavailable</p>
        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
          Open the live preview for {venueName} in a new tab. The generated iFrame code below still uses that same public booking route.
        </p>
      </div>
    </div>
  );
};

const OwnerWidgetPage = () => {
  const navigate = useNavigate();
  const { user, profile, isLoading: authLoading, isProfileLoading } = useAuth();
  const {
    data: myVenues = [],
    isLoading: venuesLoading,
    isError: venuesError,
    isFetching: venuesFetching,
    refetch: refetchVenues,
  } = useOwnerVenues(user?.id);

  const [selectedVenueId, setSelectedVenueId] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [widgetSettings, setWidgetSettings] = useState({
    theme: "light",
    primaryColor: DEFAULT_WIDGET_PRIMARY_COLOR,
    showHeader: true,
    showFooter: true,
  });

  useEffect(() => {
    if (myVenues.length > 0 && !selectedVenueId) {
      setSelectedVenueId(myVenues[0].id);
    }
  }, [myVenues, selectedVenueId]);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login");
    }
    if (!authLoading && !isProfileLoading && user && profile?.user_type !== "owner") {
      navigate("/dashboard");
    }
  }, [user, profile, authLoading, isProfileLoading, navigate]);

  if (authLoading || venuesLoading) {
    return (
      <OwnerLayout title="Booking widget">
        <div className="flex h-64 items-center justify-center" role="status" aria-label="Loading the widget">
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
      <OwnerLayout title="Booking widget" subtitle="Share a venue booking surface on another website.">
        <Card className="max-w-3xl">
          <ErrorPanel
            what="your venues"
            description="No embed code is being generated until the venue list can be loaded."
            onRetry={() => refetchVenues()}
            isRetrying={venuesFetching}
          />
        </Card>
      </OwnerLayout>
    );
  }

  const baseUrl = window.location.origin;
  const widgetUrl = `${baseUrl}/embed/booking/${selectedVenueId}`;
  const previewUrl = `${widgetUrl}?theme=${widgetSettings.theme}&color=${encodeURIComponent(widgetSettings.primaryColor)}`;

  const iframeCode = `<iframe
  src="${widgetUrl}?theme=${widgetSettings.theme}&color=${encodeURIComponent(widgetSettings.primaryColor)}"
  width="100%"
  height="600"
  frameborder="0"
  style="border: none; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
</iframe>`;

  const scriptCode = `<div id="sportsbnb-widget" data-venue="${selectedVenueId}" data-theme="${widgetSettings.theme}"></div>
<script src="${baseUrl}/widget.js" async></script>`;

  const linkCode = `<a href="${baseUrl}/venue/${selectedVenueId}" target="_blank" rel="noopener noreferrer">
  Book now on Sportsbnb
</a>`;

  const handleCopy = (code: string, type: string) => {
    navigator.clipboard.writeText(code);
    setCopied(type);
    toast.success("Code copied to clipboard!");
    setTimeout(() => setCopied(null), 2000);
  };

  const selectedVenue = myVenues.find((venue) => venue.id === selectedVenueId);

  return (
    <OwnerLayout title="Booking widget" subtitle="Share a venue booking surface on another website.">
      {myVenues.length === 0 ? (
        <Card className="max-w-3xl">
          <EmptyState
            icon={Building2}
            title="No venues to configure"
            description="Add a venue first to generate a booking widget."
            actionLabel="Add your first venue"
            actionHref="/add-venue"
          />
        </Card>
      ) : (
        <div className="max-w-6xl space-y-5">
          <section
            aria-labelledby="widget-venue-context"
            className="rounded-lg border border-border bg-surface-1 p-4 sm:flex sm:items-end sm:justify-between sm:gap-6"
          >
            <div className="min-w-0">
              <p className="eyebrow">Venue context</p>
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <h2
                  id="widget-venue-context"
                  className="truncate font-display text-lg font-semibold tracking-extra-tight text-foreground"
                >
                  {selectedVenue?.name || "Choose a venue"}
                </h2>
                {selectedVenue && (
                  <Badge variant={selectedVenue.is_active ? "default" : "secondary"}>
                    {selectedVenue.is_active ? "Active" : "Draft"}
                  </Badge>
                )}
              </div>
              <p className="mt-1 truncate text-sm text-muted-foreground">
                {[selectedVenue?.address, selectedVenue?.city].filter(Boolean).join(", ") || "Venue details"}
              </p>
            </div>
            <div className="mt-4 w-full sm:mt-0 sm:max-w-xs">
              <Label htmlFor="widget-venue">Venue</Label>
              <Select value={selectedVenueId || ""} onValueChange={setSelectedVenueId}>
                <SelectTrigger id="widget-venue" className="mt-1.5">
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

          <div className="grid items-start gap-5 xl:grid-cols-[minmax(22rem,0.82fr)_minmax(0,1.18fr)]">
            <div className="space-y-5">
              <Card>
                <CardHeader className="p-5 pb-4 sm:p-6 sm:pb-4">
                  <CardTitle as="h2" className="flex items-center gap-2 text-lg">
                    <Palette aria-hidden="true" className="h-5 w-5 text-primary" />
                    Appearance
                  </CardTitle>
                  <CardDescription className="mt-1.5">
                    These values are passed to the existing embed query parameters.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 p-5 pt-0 sm:grid-cols-2 sm:p-6 sm:pt-0 xl:grid-cols-1">
                  <div className="space-y-1.5">
                    <Label htmlFor="widget-theme">Theme</Label>
                    <Select
                      value={widgetSettings.theme}
                      onValueChange={(value) => setWidgetSettings({ ...widgetSettings, theme: value })}
                    >
                      <SelectTrigger id="widget-theme">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="light">Light</SelectItem>
                        <SelectItem value="dark">Dark</SelectItem>
                        <SelectItem value="auto">Auto (currently uses light)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="widget-primary-color">Primary color</Label>
                    <div className="flex gap-2">
                      <Input
                        id="widget-primary-color"
                        type="color"
                        value={widgetSettings.primaryColor}
                        onChange={(event) =>
                          setWidgetSettings({ ...widgetSettings, primaryColor: event.target.value })
                        }
                        className="h-11 w-14 shrink-0 cursor-pointer p-1"
                      />
                      <Input
                        aria-label="Primary color hex value"
                        value={widgetSettings.primaryColor}
                        onChange={(event) =>
                          setWidgetSettings({ ...widgetSettings, primaryColor: event.target.value })
                        }
                        className="min-w-0 font-mono"
                        spellCheck={false}
                      />
                    </div>
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      The embed derives readable button text from this color.
                    </p>
                  </div>
                </CardContent>
              </Card>

              <aside className="rounded-lg border border-information/20 bg-information/5 p-4" aria-label="Widget publishing note">
                <div className="flex items-start gap-3">
                  <Info aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-information" />
                  <div>
                    <h2 className="font-semibold text-foreground">Preview before publishing</h2>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                      The embed reads the selected venue's live public listing and availability. Draft or inactive venues can render as unavailable.
                    </p>
                  </div>
                </div>
              </aside>
            </div>

            <Card>
              <CardHeader className="p-5 pb-4 sm:p-6 sm:pb-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <CardTitle as="h2" className="flex items-center gap-2 text-lg">
                      <Braces aria-hidden="true" className="h-5 w-5 text-primary" />
                      Booking preview
                    </CardTitle>
                    <CardDescription className="mt-1.5">
                      Inspect the same responsive route used by the generated iFrame code.
                    </CardDescription>
                  </div>
                  <Button variant="outline" asChild>
                    <a href={previewUrl} target="_blank" rel="noopener noreferrer">
                      Open preview
                      <ExternalLink aria-hidden="true" />
                    </a>
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-3 pt-0 sm:p-4 sm:pt-0">
                {selectedVenueId ? (
                  <WidgetPreviewUnavailable
                    venueName={selectedVenue?.name || "selected venue"}
                  />
                ) : (
                  <div className="flex h-80 items-center justify-center rounded-lg border border-border bg-background px-5 text-center text-sm text-muted-foreground">
                    Choose a venue to load the preview.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="p-5 pb-4 sm:p-6 sm:pb-4">
              <CardTitle as="h2" className="flex items-center gap-2 text-lg">
                <Code2 aria-hidden="true" className="h-5 w-5 text-primary" />
                Publish options
              </CardTitle>
              <CardDescription className="mt-1.5">
                Copy an iFrame, the existing script contract, or a direct booking link.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5 pt-0 sm:p-6 sm:pt-0">
              <Tabs defaultValue="iframe">
                <TabsList className="grid h-auto w-full grid-cols-3 p-1">
                  <TabsTrigger className="min-h-11 px-2 text-xs sm:text-sm" value="iframe">
                    iFrame
                  </TabsTrigger>
                  <TabsTrigger className="min-h-11 px-2 text-xs sm:text-sm" value="script">
                    JavaScript
                  </TabsTrigger>
                  <TabsTrigger className="min-h-11 px-2 text-xs sm:text-sm" value="link">
                    Direct link
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="iframe" className="mt-5 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Label htmlFor="widget-code-iframe">Responsive iFrame code</Label>
                    <Badge variant="secondary">Recommended</Badge>
                  </div>
                  <div className="relative">
                    <Textarea
                      id="widget-code-iframe"
                      value={iframeCode}
                      readOnly
                      spellCheck={false}
                      className="min-h-48 resize-none bg-surface-1 pr-14 font-mono text-xs leading-relaxed"
                    />
                    <Button
                      type="button"
                      aria-label={copied === "iframe" ? "iFrame code copied" : "Copy iFrame code"}
                      variant="outline"
                      size="icon"
                      className="absolute right-2 top-2"
                      onClick={() => handleCopy(iframeCode, "iframe")}
                    >
                      {copied === "iframe" ? (
                        <Check aria-hidden="true" className="text-success" />
                      ) : (
                        <Copy aria-hidden="true" />
                      )}
                    </Button>
                  </div>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    Paste this code into a page that allows HTML embeds. Width remains fluid; the current height contract is 600px.
                  </p>
                </TabsContent>

                <TabsContent value="script" className="mt-5 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Label htmlFor="widget-code-script">JavaScript contract</Label>
                    <Badge variant="secondary">Host script required</Badge>
                  </div>
                  <div className="relative">
                    <Textarea
                      id="widget-code-script"
                      value={scriptCode}
                      readOnly
                      spellCheck={false}
                      className="min-h-36 resize-none bg-surface-1 pr-14 font-mono text-xs leading-relaxed"
                    />
                    <Button
                      type="button"
                      aria-label={copied === "script" ? "JavaScript code copied" : "Copy JavaScript code"}
                      variant="outline"
                      size="icon"
                      className="absolute right-2 top-2"
                      onClick={() => handleCopy(scriptCode, "script")}
                    >
                      {copied === "script" ? (
                        <Check aria-hidden="true" className="text-success" />
                      ) : (
                        <Copy aria-hidden="true" />
                      )}
                    </Button>
                  </div>
                  <p className="rounded-lg border border-warning/20 bg-warning/5 px-3.5 py-3 text-xs leading-relaxed text-muted-foreground">
                    This repository does not include <code className="font-mono text-foreground">/widget.js</code>. Keep this contract for deployments that provide it; use the iFrame or direct link otherwise.
                  </p>
                </TabsContent>

                <TabsContent value="link" className="mt-5 space-y-5">
                  <div className="space-y-1.5">
                    <Label htmlFor="widget-direct-link">Booking page URL</Label>
                    <div className="flex min-w-0 flex-col gap-2 sm:flex-row">
                      <Input
                        id="widget-direct-link"
                        value={`${baseUrl}/venue/${selectedVenueId}`}
                        readOnly
                        className="min-w-0 font-mono text-xs"
                      />
                      <Button
                        type="button"
                        className="w-full shrink-0 sm:w-auto"
                        variant="outline"
                        onClick={() => handleCopy(`${baseUrl}/venue/${selectedVenueId}`, "link")}
                      >
                        {copied === "link" ? (
                          <Check aria-hidden="true" className="text-success" />
                        ) : (
                          <Copy aria-hidden="true" />
                        )}
                        {copied === "link" ? "Copied" : "Copy URL"}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="widget-code-html">HTML link code</Label>
                    <div className="relative">
                      <Textarea
                        id="widget-code-html"
                        value={linkCode}
                        readOnly
                        spellCheck={false}
                        className="min-h-28 resize-none bg-surface-1 pr-14 font-mono text-xs leading-relaxed"
                      />
                      <Button
                        type="button"
                        aria-label={copied === "htmlLink" ? "HTML link copied" : "Copy HTML link"}
                        variant="outline"
                        size="icon"
                        className="absolute right-2 top-2"
                        onClick={() => handleCopy(linkCode, "htmlLink")}
                      >
                        {copied === "htmlLink" ? (
                          <Check aria-hidden="true" className="text-success" />
                        ) : (
                          <Copy aria-hidden="true" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <Button variant="outline" asChild>
                    <a href={`${baseUrl}/venue/${selectedVenueId}`} target="_blank" rel="noopener noreferrer">
                      <Link2 aria-hidden="true" />
                      Test direct link
                      <ExternalLink aria-hidden="true" />
                    </a>
                  </Button>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      )}
    </OwnerLayout>
  );
};

export default OwnerWidgetPage;
