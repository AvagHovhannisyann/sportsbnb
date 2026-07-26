import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Copy, Check, Code, ExternalLink, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { OwnerLayout } from "@/components/owner/OwnerLayout";
import { EmptyState } from "@/components/owner/EmptyState";
import { useAuth } from "@/hooks/useAuth";
import { getCustomerPrice, formatPrice } from "@/lib/pricing";
import { useOwnerVenues } from "@/hooks/useVenues";
import { toast } from "sonner";

const OwnerWidgetPage = () => {
  const navigate = useNavigate();
  const { user, profile, isLoading: authLoading, isProfileLoading } = useAuth();
  const { data: myVenues = [], isLoading: venuesLoading } = useOwnerVenues(user?.id);

  const [selectedVenueId, setSelectedVenueId] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [widgetSettings, setWidgetSettings] = useState({
    theme: "light",
    primaryColor: "#10b981",
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
    // isProfileLoading, not just authLoading: authLoading covers the
    // session only, so without it this reads user_type off a null profile
    // and bounces the owner. RequireRole already guards this route; keeping
    // the check correct here means it stays safe if that ever changes.
    if (!authLoading && !isProfileLoading && user && profile?.user_type !== "owner") {
      navigate("/dashboard");
    }
  }, [user, profile, authLoading, isProfileLoading, navigate]);

  if (authLoading || venuesLoading) {
    return (
      <OwnerLayout title="Booking Widget">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </OwnerLayout>
    );
  }

  const baseUrl = window.location.origin;
  const widgetUrl = `${baseUrl}/embed/booking/${selectedVenueId}`;
  
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
  Book now on SportsBnB
</a>`;

  const handleCopy = (code: string, type: string) => {
    navigator.clipboard.writeText(code);
    setCopied(type);
    toast.success("Code copied to clipboard!");
    setTimeout(() => setCopied(null), 2000);
  };

  const selectedVenue = myVenues.find((v) => v.id === selectedVenueId);

  return (
    <OwnerLayout title="Booking Widget" subtitle="Add a booking widget to your website">
      {myVenues.length === 0 ? (
        <Card>
          <EmptyState
            icon={Building2}
            title="No venues to configure"
            description="Add a venue first to generate a booking widget."
            actionLabel="Add Your First Venue"
            actionHref="/add-venue"
          />
        </Card>
      ) : (
        <div className="max-w-4xl space-y-6">
          {/* Venue Selector */}
          {myVenues.length > 1 && (
            <div>
              <Label className="mb-2 block">Select Venue</Label>
              <Select
                value={selectedVenueId || ""}
                onValueChange={setSelectedVenueId}
              >
                <SelectTrigger aria-label="Venue" className="w-full max-w-xs">
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

          {/* Widget Preview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Code className="h-5 w-5 text-primary" />
                Widget Preview
              </CardTitle>
              <CardDescription>
                See how the booking widget will look on your website
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="p-4 bg-muted rounded-lg">
                <div className="bg-background rounded-lg border border-border overflow-hidden">
                  <div className="p-4 border-b border-border">
                    <h3 className="font-semibold text-foreground">{selectedVenue?.name}</h3>
                    <p className="text-sm text-muted-foreground">{selectedVenue?.address}, {selectedVenue?.city}</p>
                  </div>
                  <div className="p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Starting from</span>
                      <span className="text-lg font-semibold text-primary">{formatPrice(getCustomerPrice(selectedVenue?.price_per_hour || 0))}/hr</span>
                    </div>
                    <Button className="w-full" asChild>
                      <a href={`/venue/${selectedVenueId}`} target="_blank" rel="noopener noreferrer">
                        Book Now
                        <ExternalLink className="h-4 w-4 ml-2" />
                      </a>
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Embed Codes */}
          <Card>
            <CardHeader>
              <CardTitle>Embed Code</CardTitle>
              <CardDescription>
                Choose how you want to add the booking widget to your website
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="iframe">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="iframe">iFrame</TabsTrigger>
                  <TabsTrigger value="script">JavaScript</TabsTrigger>
                  <TabsTrigger value="link">Simple Link</TabsTrigger>
                </TabsList>

                <TabsContent value="iframe" className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="widget-code-iframe">iFrame Embed Code</Label>
                    <div className="relative">
                      <Textarea
                        id="widget-code-iframe"
                        value={iframeCode}
                        readOnly
                        className="font-mono text-xs h-32 bg-muted"
                      />
                      <Button
                        aria-label="Copy embed code"
                        variant="outline"
                        size="sm"
                        className="absolute top-2 right-2"
                        onClick={() => handleCopy(iframeCode, "iframe")}
                      >
                        {copied === "iframe" ? (
                          <Check className="h-4 w-4 text-emerald-600" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Paste this code anywhere on your website to display the booking widget.
                    </p>
                  </div>
                </TabsContent>

                <TabsContent value="script" className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="widget-code-script">JavaScript Embed Code</Label>
                    <div className="relative">
                      <Textarea
                        id="widget-code-script"
                        value={scriptCode}
                        readOnly
                        className="font-mono text-xs h-24 bg-muted"
                      />
                      <Button
                        aria-label="Copy script tag"
                        variant="outline"
                        size="sm"
                        className="absolute top-2 right-2"
                        onClick={() => handleCopy(scriptCode, "script")}
                      >
                        {copied === "script" ? (
                          <Check className="h-4 w-4 text-emerald-600" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Lightweight script that loads the widget dynamically. Best for performance.
                    </p>
                  </div>
                </TabsContent>

                <TabsContent value="link" className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label>Direct Link</Label>
                    <div className="flex gap-2">
                      <Input
                        value={`${baseUrl}/venue/${selectedVenueId}`}
                        readOnly
                        className="font-mono text-xs bg-muted"
                      />
                      <Button
                        aria-label="Copy booking link"
                        variant="outline"
                        size="icon"
                        onClick={() => handleCopy(`${baseUrl}/venue/${selectedVenueId}`, "link")}
                      >
                        {copied === "link" ? (
                          <Check className="h-4 w-4 text-emerald-600" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Simple link that redirects visitors to your venue page on SportsBnB.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="widget-code-html">HTML Link Code</Label>
                    <div className="relative">
                      <Textarea
                        id="widget-code-html"
                        value={linkCode}
                        readOnly
                        className="font-mono text-xs h-16 bg-muted"
                      />
                      <Button
                        aria-label="Copy link HTML"
                        variant="outline"
                        size="sm"
                        className="absolute top-2 right-2"
                        onClick={() => handleCopy(linkCode, "htmlLink")}
                      >
                        {copied === "htmlLink" ? (
                          <Check className="h-4 w-4 text-emerald-600" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Customization Options */}
          <Card>
            <CardHeader>
              <CardTitle>Customization</CardTitle>
              <CardDescription>
                Customize the look of your booking widget
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
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
                      <SelectItem value="auto">Auto (System)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="widget-primary-color">Primary Color</Label>
                  <div className="flex gap-2">
                    <Input
                      id="widget-primary-color"
                      aria-label="Primary colour swatch"
                      type="color"
                      value={widgetSettings.primaryColor}
                      onChange={(e) => setWidgetSettings({ ...widgetSettings, primaryColor: e.target.value })}
                      className="w-12 h-10 p-1 cursor-pointer"
                    />
                    <Input
                      aria-label="Primary colour hex value"
                      value={widgetSettings.primaryColor}
                      onChange={(e) => setWidgetSettings({ ...widgetSettings, primaryColor: e.target.value })}
                      className="font-mono"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </OwnerLayout>
  );
};

export default OwnerWidgetPage;