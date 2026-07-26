import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Banknote, Plus, Trash2, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { OwnerLayout } from "@/components/owner/OwnerLayout";
import { EmptyState } from "@/components/owner/EmptyState";
import { useAuth } from "@/hooks/useAuth";
import { useOwnerVenues } from "@/hooks/useVenues";

interface PriceRule {
  id: string;
  name: string;
  pricePerHour: number;
  dayType: "all" | "weekday" | "weekend";
  timeRange: "all" | "morning" | "afternoon" | "evening";
}

const OwnerPricingPage = () => {
  const navigate = useNavigate();
  const { user, profile, isLoading: authLoading, isProfileLoading } = useAuth();
  const { data: myVenues = [], isLoading: venuesLoading } = useOwnerVenues(user?.id);

  const [selectedVenueId, setSelectedVenueId] = useState<string | null>(null);

  // Demo pricing rules
  const [priceRules, setPriceRules] = useState<PriceRule[]>([
    { id: "1", name: "Standard Rate", pricePerHour: 10000, dayType: "all", timeRange: "all" },
    { id: "2", name: "Weekend Premium", pricePerHour: 15000, dayType: "weekend", timeRange: "all" },
    { id: "3", name: "Morning Special", pricePerHour: 8000, dayType: "weekday", timeRange: "morning" },
  ]);

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
      <OwnerLayout title="Pricing">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </OwnerLayout>
    );
  }

  const selectedVenue = myVenues.find((v) => v.id === selectedVenueId);

  const dayTypeLabels: Record<string, string> = {
    all: "All Days",
    weekday: "Weekdays",
    weekend: "Weekends",
  };

  const timeRangeLabels: Record<string, string> = {
    all: "All Day",
    morning: "6AM - 12PM",
    afternoon: "12PM - 6PM",
    evening: "6PM - 10PM",
  };

  return (
    <OwnerLayout title="Pricing" subtitle="Set up pricing rules for your venues">
      {myVenues.length === 0 ? (
        <Card>
          <EmptyState
            icon={Banknote}
            title="No venues to price"
            description="Add a venue first to set up pricing."
            actionLabel="Add Your First Venue"
            actionHref="/add-venue"
          />
        </Card>
      ) : (
        <div className="max-w-4xl space-y-6">
          {/* Venue Selector */}
          <div>
            <Label className="mb-2 block">Select Venue</Label>
            <Select
              value={selectedVenueId || ""}
              onValueChange={setSelectedVenueId}
            >
              <SelectTrigger className="w-full max-w-xs">
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

          {/* Base Price */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Banknote className="h-5 w-5 text-primary" />
                Base Price
              </CardTitle>
              <CardDescription>
                The default hourly rate for this venue
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Wraps: the input, the "per hour" label and a 220px button
                  were one non-wrapping row, which put the button 3px past the
                  right edge of a 375px screen and scrolled the page. */}
              <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                <div className="relative min-w-0 flex-1 max-w-xs">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">֏</span>
                  <Input
                    type="number"
                    value={selectedVenue?.price_per_hour || 0}
                    className="pl-8"
                    readOnly
                  />
                </div>
                <span className="text-muted-foreground">per hour</span>
                <Button variant="outline" onClick={() => navigate(`/venue/${selectedVenueId}/edit`)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit in Venue Settings
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Dynamic Pricing Rules */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Dynamic Pricing Rules</CardTitle>
                <CardDescription>
                  Set different prices based on day and time
                </CardDescription>
              </div>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Rule
              </Button>
            </CardHeader>
            <CardContent>
              {priceRules.length === 0 ? (
                <EmptyState
                  icon={Banknote}
                  title="No pricing rules"
                  description="Add rules to set different prices for weekends, evenings, or peak hours."
                  actionLabel="Add Pricing Rule"
                  onAction={() => {}}
                  className="py-8"
                />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Rule Name</TableHead>
                      <TableHead>Days</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {priceRules.map((rule) => (
                      <TableRow key={rule.id}>
                        <TableCell className="font-medium">{rule.name}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{dayTypeLabels[rule.dayType]}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{timeRangeLabels[rule.timeRange]}</Badge>
                        </TableCell>
                        <TableCell className="font-semibold">
                          ֏{rule.pricePerHour.toLocaleString()}/hr
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Pricing Tips */}
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="pt-6">
              <h4 className="font-medium text-foreground mb-3">💡 Pricing Tips</h4>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li>• Set higher prices for peak hours (evenings and weekends) to maximize revenue</li>
                <li>• Offer discounts for early morning slots to fill less popular times</li>
                <li>• Consider seasonal pricing during holidays or special events</li>
                <li>• Monitor your competitors' pricing in your area</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      )}
    </OwnerLayout>
  );
};

export default OwnerPricingPage;
