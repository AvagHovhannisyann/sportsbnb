import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Banknote, Edit, Info, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Price } from "@/components/ui/price";
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
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorPanel } from "@/components/common/StatusPanel";
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
  const {
    data: myVenues = [],
    isLoading: venuesLoading,
    isError: venuesError,
    isFetching: venuesFetching,
    refetch: refetchVenues,
  } = useOwnerVenues(user?.id);

  const [selectedVenueId, setSelectedVenueId] = useState<string | null>(null);

  // Empty, and it has to be.
  //
  // This was seeded with three invented rules — "Standard Rate ֏10,000",
  // "Weekend Premium ֏15,000", "Morning Special ֏8,000" — rendered in a table
  // with an Actions column, directly beneath the venue's real base rate. They
  // were identical for every owner and every venue, bore no relation to
  // `venues.price_per_hour`, and `setPriceRules` was never called, so they
  // could not be edited or removed either. An owner reading that page would
  // reasonably conclude their venue charges ֏15,000 at weekends. It does not.
  //
  // There is no pricing-rules table in the schema; per-time pricing is not
  // built. The table and type stay for when it is, but until then this shows
  // the empty state that was already written and never reachable.
  const [priceRules] = useState<PriceRule[]>([]);

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
        <div className="flex items-center justify-center h-64" role="status" aria-label="Loading pricing">
          <Loader2 aria-hidden="true" className="h-8 w-8 animate-spin text-primary motion-reduce:animate-none" />
        </div>
      </OwnerLayout>
    );
  }

  if (venuesError) {
    return (
      <OwnerLayout title="Pricing" subtitle="Review the hourly rate used for venue bookings.">
        <Card className="max-w-3xl">
          <ErrorPanel
            what="your venues"
            description="Pricing has not changed. Try loading your venues again."
            onRetry={() => refetchVenues()}
            isRetrying={venuesFetching}
          />
        </Card>
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
    <OwnerLayout title="Pricing" subtitle="Review the hourly rate used for venue bookings.">
      {myVenues.length === 0 ? (
        <Card className="max-w-3xl">
          <EmptyState
            icon={Banknote}
            title="No venues to price"
            description="Add a venue first to set its hourly rate."
            actionLabel="Add first venue"
            actionHref="/add-venue"
          />
        </Card>
      ) : (
        <div className="max-w-5xl space-y-5">
          <section
            aria-labelledby="pricing-venue-context"
            className="rounded-lg border border-border bg-surface-1 p-4 sm:flex sm:items-end sm:justify-between sm:gap-6"
          >
            <div className="min-w-0">
              <p className="eyebrow">Venue context</p>
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <h2
                  id="pricing-venue-context"
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
              <p className="mt-1 text-sm text-muted-foreground">
                The rate below is read from this venue's listing.
              </p>
            </div>
            <div className="mt-4 w-full sm:mt-0 sm:max-w-xs">
              <Label htmlFor="pricing-venue">Venue</Label>
              <Select value={selectedVenueId || ""} onValueChange={setSelectedVenueId}>
                <SelectTrigger id="pricing-venue" className="mt-1.5">
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

          <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(20rem,0.9fr)]">
            <Card>
              <CardHeader className="p-5 pb-4 sm:p-6 sm:pb-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <CardTitle as="h2" className="flex items-center gap-2 text-lg">
                      <Banknote aria-hidden="true" className="h-5 w-5 text-primary" />
                      Base hourly rate
                    </CardTitle>
                    <CardDescription className="mt-1.5">
                      The amount shown during discovery and booking.
                    </CardDescription>
                  </div>
                  <Badge variant="secondary">Current rate</Badge>
                </div>
              </CardHeader>
              <CardContent className="p-5 pt-0 sm:p-6 sm:pt-0">
                <div className="rounded-lg border border-border bg-surface-1 p-5 sm:p-6">
                  <p className="text-sm font-medium text-muted-foreground">Per hour</p>
                  <div className="mt-3">
                    {selectedVenue ? (
                      <Price
                        amount={selectedVenue.price_per_hour}
                        suffix="per hour"
                        className="text-3xl font-semibold tracking-extra-tight text-foreground sm:text-4xl"
                        suffixClassName="ml-1 text-sm"
                      />
                    ) : (
                      <span className="font-display text-3xl font-semibold text-muted-foreground">—</span>
                    )}
                  </div>
                  <p className="mt-3 max-w-lg text-sm leading-relaxed text-muted-foreground">
                    Pricing is maintained with the venue's listing details so the same rate is used throughout the product.
                  </p>
                </div>

                <div className="mt-5 flex flex-col gap-3 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-muted-foreground">
                    Changes open the existing venue editor.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full sm:w-auto"
                    disabled={!selectedVenueId}
                    onClick={() => navigate(`/venue/${selectedVenueId}/edit`)}
                  >
                    <Edit aria-hidden="true" />
                    Edit venue pricing
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="p-5 pb-4 sm:p-6 sm:pb-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <CardTitle as="h2" className="text-lg">Pricing coverage</CardTitle>
                    <CardDescription className="mt-1.5">
                      What the current booking system supports.
                    </CardDescription>
                  </div>
                  <Badge variant="outline">Base rate only</Badge>
                </div>
              </CardHeader>
              <CardContent className="p-5 pt-0 sm:p-6 sm:pt-0">
                {priceRules.length === 0 ? (
                  <div className="rounded-lg border border-border bg-surface-1 p-4">
                    <div className="flex items-start gap-3">
                      <Info aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-information" />
                      <div>
                        <h3 className="font-semibold text-foreground">One rate applies to every time slot</h3>
                        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                          Weekend, evening, and peak-hour overrides are not available, so no hidden rule changes the base rate shown here.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Rule name</TableHead>
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
                            <TableCell>
                              <Price amount={rule.pricePerHour} suffix="per hour" className="font-semibold" />
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1">
                                <Button variant="ghost" size="icon" aria-label={`Edit ${rule.name}`}>
                                  <Edit aria-hidden="true" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                                  aria-label={`Delete ${rule.name}`}
                                >
                                  <Trash2 aria-hidden="true" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}

                <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                  To change what customers pay today, update the base hourly rate in venue settings.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </OwnerLayout>
  );
};

export default OwnerPricingPage;
