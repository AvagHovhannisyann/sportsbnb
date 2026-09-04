import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Ban, ChevronRight, Clock3, FileText, Info, Loader2, Save, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { OwnerLayout } from "@/components/owner/OwnerLayout";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorPanel } from "@/components/common/StatusPanel";
import { useAuth } from "@/hooks/useAuth";
import { useOwnerVenues } from "@/hooks/useVenues";
import { useVenuePolicy, useSaveVenuePolicy } from "@/hooks/useVenuePolicies";
import { usePlatformCancellationPolicy } from "@/hooks/useVenueEquipment";
import { formatPrice } from "@/lib/pricing";
import { toast } from "sonner";

const OwnerPoliciesPage = () => {
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
  const [isSaving, setIsSaving] = useState(false);

  // Policy form state
  const [cancellationPolicy, setCancellationPolicy] = useState("flexible");
  const [customCancellationHours, setCustomCancellationHours] = useState(24);
  const [refundType, setRefundType] = useState("full");
  const [minDuration, setMinDuration] = useState(1);
  const [maxDuration, setMaxDuration] = useState(8);
  const [timeSlotIncrement, setTimeSlotIncrement] = useState(60);
  const [bookingWindowDays, setBookingWindowDays] = useState(30);
  const [bufferMinutes, setBufferMinutes] = useState(0);
  const [gracePeriodMinutes, setGracePeriodMinutes] = useState(15);
  const [venueRules, setVenueRules] = useState("");
  const [checkinInstructions, setCheckinInstructions] = useState("");
  const [overtimeRatePerMinute, setOvertimeRatePerMinute] = useState(0);
  const [earlyArrivalPolicy, setEarlyArrivalPolicy] = useState<'not_allowed' | 'free_if_available' | 'charged_normal_rate'>('not_allowed');
  const [earlyArrivalMinutes, setEarlyArrivalMinutes] = useState(15);

  // Set default venue
  useEffect(() => {
    if (myVenues.length > 0 && !selectedVenueId) {
      setSelectedVenueId(myVenues[0].id);
    }
  }, [myVenues, selectedVenueId]);

  const {
    data: existingPolicy,
    isLoading: policyLoading,
    isError: policyError,
    isFetching: policyFetching,
    refetch: refetchPolicy,
  } = useVenuePolicy(selectedVenueId || undefined);
  const {
    data: platformCancellation,
    isLoading: platformCancellationLoading,
    isError: platformCancellationError,
    isFetching: platformCancellationFetching,
    refetch: refetchPlatformCancellation,
  } = usePlatformCancellationPolicy();
  const savePolicy = useSaveVenuePolicy();

  // Load existing policy
  useEffect(() => {
    if (existingPolicy) {
      setCancellationPolicy(existingPolicy.cancellation_policy);
      setCustomCancellationHours(existingPolicy.cancellation_hours);
      setRefundType(existingPolicy.refund_type);
      setMinDuration(existingPolicy.min_duration_hours);
      setMaxDuration(existingPolicy.max_duration_hours);
      setTimeSlotIncrement(existingPolicy.time_slot_increment);
      setBookingWindowDays(existingPolicy.booking_window_days);
      setBufferMinutes(existingPolicy.buffer_minutes);
      setGracePeriodMinutes(existingPolicy.grace_period_minutes);
      setVenueRules(existingPolicy.venue_rules || "");
      setCheckinInstructions(existingPolicy.checkin_instructions || "");
      setOvertimeRatePerMinute(existingPolicy.overtime_rate_per_minute || 0);
      setEarlyArrivalPolicy(existingPolicy.early_arrival_policy || 'not_allowed');
      setEarlyArrivalMinutes(existingPolicy.early_arrival_minutes || 15);
    } else {
      // Reset to defaults
      setCancellationPolicy("flexible");
      setCustomCancellationHours(24);
      setRefundType("full");
      setMinDuration(1);
      setMaxDuration(8);
      setTimeSlotIncrement(60);
      setBookingWindowDays(30);
      setBufferMinutes(0);
      setGracePeriodMinutes(15);
      setVenueRules("");
      setCheckinInstructions("");
      setOvertimeRatePerMinute(0);
      setEarlyArrivalPolicy('not_allowed');
      setEarlyArrivalMinutes(15);
    }
  }, [existingPolicy, selectedVenueId]);

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
      <OwnerLayout title="Policies">
        <div className="flex items-center justify-center h-64" role="status" aria-label="Loading policies">
          <Loader2 aria-hidden="true" className="h-8 w-8 animate-spin text-primary motion-reduce:animate-none" />
        </div>
      </OwnerLayout>
    );
  }

  if (venuesError) {
    return (
      <OwnerLayout title="Policies" subtitle="Manage cancellation terms and venue operating preferences.">
        <Card className="max-w-3xl">
          <ErrorPanel
            what="your venues"
            description="No policy settings were changed. Try loading your venues again."
            onRetry={() => refetchVenues()}
            isRetrying={venuesFetching}
          />
        </Card>
      </OwnerLayout>
    );
  }

  const getCancellationHours = () => {
    switch (cancellationPolicy) {
      case "flexible": return 24;
      case "moderate": return 48;
      case "strict": return 72;
      case "custom": return customCancellationHours;
      default: return 24;
    }
  };

  const handleSave = async () => {
    if (!selectedVenueId) return;
    setIsSaving(true);

    try {
      await savePolicy.mutateAsync({
        venueId: selectedVenueId,
        policy: {
          cancellation_policy: cancellationPolicy,
          cancellation_hours: getCancellationHours(),
          refund_type: refundType,
          min_duration_hours: minDuration,
          max_duration_hours: maxDuration,
          time_slot_increment: timeSlotIncrement,
          booking_window_days: bookingWindowDays,
          buffer_minutes: bufferMinutes,
          grace_period_minutes: gracePeriodMinutes,
          venue_rules: venueRules || null,
          checkin_instructions: checkinInstructions || null,
          overtime_rate_per_minute: overtimeRatePerMinute,
          early_arrival_policy: earlyArrivalPolicy,
          early_arrival_minutes: earlyArrivalMinutes,
        },
      });
      toast.success("Policies saved successfully!");
    } catch (error) {
      toast.error("Failed to save policies");
    } finally {
      setIsSaving(false);
    }
  };

  const selectedVenue = myVenues.find((venue) => venue.id === selectedVenueId);

  return (
    <OwnerLayout
      title="Policies"
      subtitle="Manage cancellation terms and venue operating preferences."
    >
      {myVenues.length === 0 ? (
        <Card className="max-w-3xl">
          <EmptyState
            icon={FileText}
            title="No venues to configure"
            description="Add a venue first to set up policies and rules."
            actionLabel="Add first venue"
            actionHref="/add-venue"
          />
        </Card>
      ) : (
        <div className="max-w-5xl space-y-5">
          <section
            aria-labelledby="policies-venue-context"
            className="rounded-lg border border-border bg-surface-1 p-4 sm:flex sm:items-end sm:justify-between sm:gap-6"
          >
            <div className="min-w-0">
              <p className="eyebrow">Venue context</p>
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <h2
                  id="policies-venue-context"
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
                Every setting below is scoped to this venue.
              </p>
            </div>
            <div className="mt-4 w-full sm:mt-0 sm:max-w-xs">
              <Label htmlFor="policies-venue">Venue</Label>
              <Select value={selectedVenueId || ""} onValueChange={setSelectedVenueId}>
                <SelectTrigger id="policies-venue" className="mt-1.5">
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

          {policyLoading ? (
            <div className="flex justify-center py-12" role="status" aria-label="Loading policies">
              <Loader2 aria-hidden="true" className="h-6 w-6 animate-spin text-primary motion-reduce:animate-none" />
            </div>
          ) : policyError ? (
            <Card>
              <ErrorPanel
                what="this venue's policies"
                description="No policy settings were changed."
                onRetry={() => refetchPolicy()}
                isRetrying={policyFetching}
              />
            </Card>
          ) : (
            <>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-3 px-1">
                  <p className="text-xs font-semibold text-foreground">Jump to a section</p>
                  <p
                    id="policy-sections-scroll-hint"
                    className="inline-flex items-center gap-1 text-xs text-muted-foreground sm:hidden"
                  >
                    More sections to the right
                    <ChevronRight aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
                  </p>
                </div>
                <nav
                  aria-label="Policy sections"
                  aria-describedby="policy-sections-scroll-hint"
                  className="flex gap-1 overflow-x-auto overscroll-x-contain border-b border-border pb-2"
                >
                  {[
                    ["#policy-timing", "Timing"],
                    ["#policy-cancellation", "Cancellation"],
                    ["#policy-booking", "Booking"],
                    ["#policy-instructions", "Instructions"],
                    ["#policy-save", "Review & save"],
                  ].map(([href, label]) => (
                    <a
                      key={href}
                      href={href}
                      className="focus-ring inline-flex min-h-11 shrink-0 items-center rounded-lg px-3 text-sm font-medium text-muted-foreground transition-colors duration-150 hover:bg-accent hover:text-foreground motion-reduce:transition-none"
                    >
                      {label}
                    </a>
                  ))}
                </nav>
              </div>

              <Alert>
                <Info aria-hidden="true" className="h-4 w-4" />
                <AlertDescription>
                  <p className="font-semibold text-foreground">Platform cancellation guardrails</p>
                  {platformCancellationLoading ? (
                    <span className="mt-1.5 inline-flex items-center gap-2" role="status">
                      <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin motion-reduce:animate-none" />
                      Loading platform guidance…
                    </span>
                  ) : platformCancellationError ? (
                    <span className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <span>Platform guidance is temporarily unavailable. Your venue policy can still be edited.</span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => refetchPlatformCancellation()}
                        disabled={platformCancellationFetching}
                      >
                        {platformCancellationFetching ? "Retrying…" : "Try again"}
                      </Button>
                    </span>
                  ) : platformCancellation ? (
                    <>
                      <p>
                        The platform publishes these reference tiers separately from the venue policy saved below.
                      </p>
                      <ul className="mt-2 space-y-1.5">
                        {platformCancellation.tiers.map((tier, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <span aria-hidden="true" className="mt-2 h-1 w-1 shrink-0 rounded-full bg-muted-foreground" />
                            <span>{tier.description} (more than {tier.hours_before} hours before)</span>
                          </li>
                        ))}
                      </ul>
                      <p className="mt-2">
                        Maximum platform fee: {platformCancellation.max_fee_percentage}%.
                      </p>
                    </>
                  ) : null}
                </AlertDescription>
              </Alert>

              {/* Overtime & Early Arrival */}
              <Card id="policy-timing" className="scroll-mt-24">
                <CardHeader className="p-5 pb-4 sm:p-6 sm:pb-4">
                  <CardTitle as="h2" className="flex items-center gap-2 text-lg">
                    <Timer aria-hidden="true" className="h-5 w-5 text-primary" />
                    Overtime and early arrival
                  </CardTitle>
                  <CardDescription>
                    Record the terms your team should follow around a booking.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 p-5 pt-0 sm:p-6 sm:pt-0">
                  <Alert className="bg-surface-1">
                    <Info aria-hidden="true" className="h-4 w-4" />
                    <AlertDescription>
                      Sportsbnb stores these terms but does not automatically add overtime or early-arrival charges to a booking.
                    </AlertDescription>
                  </Alert>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="policy-overtime-rate">Overtime rate per minute</Label>
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        <div className="relative w-full sm:w-44">
                          <span aria-hidden="true" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground">֏</span>
                          <Input
                          id="policy-overtime-rate"
                          type="number"
                          min="0"
                          step="10"
                          value={overtimeRatePerMinute}
                          onChange={(e) => setOvertimeRatePerMinute(parseFloat(e.target.value) || 0)}
                          className="pl-8"
                          aria-describedby="policy-overtime-help"
                          />
                        </div>
                        <span className="text-sm text-muted-foreground">Armenian dram per minute</span>
                      </div>
                      <p id="policy-overtime-help" className="text-xs leading-relaxed text-muted-foreground">
                        Use 0 when no overtime rate is recorded.
                        {overtimeRatePerMinute > 0 && (
                          <span className="font-medium text-foreground">
                            {" "}At this rate, 30 minutes is {formatPrice(overtimeRatePerMinute * 30)}.
                          </span>
                        )}
                      </p>
                    </div>

                    <Separator />

                    <div className="space-y-3">
                      <Label id="early-arrival-label">Early arrival policy</Label>
                      <RadioGroup
                        aria-labelledby="early-arrival-label"
                        value={earlyArrivalPolicy}
                        onValueChange={(v) => setEarlyArrivalPolicy(v as typeof earlyArrivalPolicy)}
                      >
                        <div className="flex min-h-16 items-start gap-3 rounded-lg border border-border bg-card p-3.5">
                          <RadioGroupItem value="not_allowed" id="early-not-allowed" aria-describedby="early-not-allowed-help" className="mt-0.5" />
                          <div className="min-w-0">
                            <Label htmlFor="early-not-allowed" className="cursor-pointer">Not allowed</Label>
                            <p id="early-not-allowed-help" className="mt-0.5 text-sm text-muted-foreground">Customers wait until their booked start time.</p>
                          </div>
                        </div>
                        <div className="flex min-h-16 items-start gap-3 rounded-lg border border-border bg-card p-3.5">
                          <RadioGroupItem value="free_if_available" id="early-free" aria-describedby="early-free-help" className="mt-0.5" />
                          <div className="min-w-0">
                            <Label htmlFor="early-free" className="cursor-pointer">Free if available</Label>
                            <p id="early-free-help" className="mt-0.5 text-sm text-muted-foreground">Allow an early start at no extra charge when the slot is open.</p>
                          </div>
                        </div>
                        <div className="flex min-h-16 items-start gap-3 rounded-lg border border-border bg-card p-3.5">
                          <RadioGroupItem value="charged_normal_rate" id="early-charged" aria-describedby="early-charged-help" className="mt-0.5" />
                          <div className="min-w-0">
                            <Label htmlFor="early-charged" className="cursor-pointer">Charge the normal rate</Label>
                            <p id="early-charged-help" className="mt-0.5 text-sm text-muted-foreground">Record early time at the venue's regular hourly rate.</p>
                          </div>
                        </div>
                      </RadioGroup>
                    </div>

                    {earlyArrivalPolicy !== 'not_allowed' && (
                      <div className="space-y-2">
                        <Label htmlFor="early-arrival-window">Maximum early-arrival window</Label>
                        <Select
                          value={earlyArrivalMinutes.toString()}
                          onValueChange={(v) => setEarlyArrivalMinutes(parseInt(v))}
                        >
                          <SelectTrigger id="early-arrival-window" className="w-full sm:w-56">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="15">15 minutes</SelectItem>
                            <SelectItem value="30">30 minutes</SelectItem>
                            <SelectItem value="45">45 minutes</SelectItem>
                            <SelectItem value="60">1 hour</SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                          How early customers can start before their booked time
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Cancellation Policy */}
              <Card id="policy-cancellation" className="scroll-mt-24">
                <CardHeader className="p-5 pb-4 sm:p-6 sm:pb-4">
                  <CardTitle as="h2" className="flex items-center gap-2 text-lg">
                    <Ban aria-hidden="true" className="h-5 w-5 text-primary" />
                    Cancellation terms
                  </CardTitle>
                  <CardDescription>
                    Choose the notice window and refund outcome stored with new bookings.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 p-5 pt-0 sm:p-6 sm:pt-0">
                  <div className="space-y-3">
                    <Label id="cancellation-window-label">Notice window</Label>
                    <RadioGroup
                      aria-labelledby="cancellation-window-label"
                      value={cancellationPolicy}
                      onValueChange={setCancellationPolicy}
                    >
                    <div className="flex min-h-16 items-start gap-3 rounded-lg border border-border bg-card p-3.5">
                      <RadioGroupItem value="flexible" id="flexible" aria-describedby="flexible-help" className="mt-0.5" />
                      <div className="min-w-0 flex-1">
                        <Label htmlFor="flexible" className="cursor-pointer">Flexible</Label>
                        <p id="flexible-help" className="mt-0.5 text-sm text-muted-foreground">Use a 24-hour notice window.</p>
                      </div>
                    </div>
                    <div className="flex min-h-16 items-start gap-3 rounded-lg border border-border bg-card p-3.5">
                      <RadioGroupItem value="moderate" id="moderate" aria-describedby="moderate-help" className="mt-0.5" />
                      <div className="min-w-0 flex-1">
                        <Label htmlFor="moderate" className="cursor-pointer">Moderate</Label>
                        <p id="moderate-help" className="mt-0.5 text-sm text-muted-foreground">Use a 48-hour notice window.</p>
                      </div>
                    </div>
                    <div className="flex min-h-16 items-start gap-3 rounded-lg border border-border bg-card p-3.5">
                      <RadioGroupItem value="strict" id="strict" aria-describedby="strict-help" className="mt-0.5" />
                      <div className="min-w-0 flex-1">
                        <Label htmlFor="strict" className="cursor-pointer">Strict</Label>
                        <p id="strict-help" className="mt-0.5 text-sm text-muted-foreground">Use a 72-hour notice window.</p>
                      </div>
                    </div>
                    <div className="flex min-h-16 items-start gap-3 rounded-lg border border-border bg-card p-3.5">
                      <RadioGroupItem value="custom" id="custom" aria-describedby="custom-help" className="mt-0.5" />
                      <div className="min-w-0 flex-1">
                        <Label htmlFor="custom" className="cursor-pointer">Custom</Label>
                        <p id="custom-help" className="mt-0.5 text-sm text-muted-foreground">Set a specific notice window.</p>
                        {cancellationPolicy === "custom" && (
                          <div className="mt-3 max-w-xs space-y-1.5">
                            <Label htmlFor="custom-cancellation-hours" className="text-xs text-muted-foreground">
                              Hours before booking
                            </Label>
                            <Input
                              id="custom-cancellation-hours"
                              type="number"
                              value={customCancellationHours}
                              onChange={(e) => setCustomCancellationHours(parseInt(e.target.value) || 24)}
                              min={1}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                    </RadioGroup>
                  </div>

                  <Separator />

                  <div className="space-y-3">
                    <Label id="refund-outcome-label">Player refund outcome</Label>
                    <RadioGroup
                      aria-labelledby="refund-outcome-label"
                      value={refundType}
                      onValueChange={setRefundType}
                      className="grid gap-2 md:grid-cols-3"
                    >
                      <div className="flex min-h-20 items-start gap-3 rounded-lg border border-border bg-card p-3.5">
                        <RadioGroupItem value="full" id="full-refund" aria-describedby="full-refund-help" className="mt-0.5" />
                        <div>
                          <Label htmlFor="full-refund" className="cursor-pointer">Full before cutoff</Label>
                          <p id="full-refund-help" className="mt-0.5 text-xs leading-relaxed text-muted-foreground">No refund inside the notice window.</p>
                        </div>
                      </div>
                      <div className="flex min-h-20 items-start gap-3 rounded-lg border border-border bg-card p-3.5">
                        <RadioGroupItem value="partial" id="partial-refund" aria-describedby="partial-refund-help" className="mt-0.5" />
                        <div>
                          <Label htmlFor="partial-refund" className="cursor-pointer">50% inside cutoff</Label>
                          <p id="partial-refund-help" className="mt-0.5 text-xs leading-relaxed text-muted-foreground">Full refund before the notice window.</p>
                        </div>
                      </div>
                      <div className="flex min-h-20 items-start gap-3 rounded-lg border border-border bg-card p-3.5">
                        <RadioGroupItem value="none" id="no-refund" aria-describedby="no-refund-help" className="mt-0.5" />
                        <div>
                          <Label htmlFor="no-refund" className="cursor-pointer">No refund</Label>
                          <p id="no-refund-help" className="mt-0.5 text-xs leading-relaxed text-muted-foreground">Player cancellations receive no refund.</p>
                        </div>
                      </div>
                    </RadioGroup>
                  </div>
                </CardContent>
              </Card>

              {/* Booking Rules */}
              <Card id="policy-booking" className="scroll-mt-24">
                <CardHeader className="p-5 pb-4 sm:p-6 sm:pb-4">
                  <CardTitle as="h2" className="flex items-center gap-2 text-lg">
                    <Clock3 aria-hidden="true" className="h-5 w-5 text-primary" />
                    Booking preferences
                  </CardTitle>
                  <CardDescription>
                    Store duration, interval, and scheduling preferences for this venue.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 p-5 pt-0 sm:p-6 sm:pt-0">
                  <Alert className="bg-surface-1">
                    <Info aria-hidden="true" className="h-4 w-4" />
                    <AlertDescription>
                      These values are saved with the venue. Embedded booking tools read the duration and slot settings; other booking surfaces may not enforce every preference yet.
                    </AlertDescription>
                  </Alert>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="policy-min-duration">Minimum duration</Label>
                      <Select value={minDuration.toString()} onValueChange={(v) => setMinDuration(parseFloat(v))}>
                        <SelectTrigger id="policy-min-duration">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0.5">30 minutes</SelectItem>
                          <SelectItem value="1">1 hour</SelectItem>
                          <SelectItem value="1.5">1.5 hours</SelectItem>
                          <SelectItem value="2">2 hours</SelectItem>
                          <SelectItem value="3">3 hours</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="policy-max-duration">Maximum duration</Label>
                      <Select value={maxDuration.toString()} onValueChange={(v) => setMaxDuration(parseFloat(v))}>
                        <SelectTrigger id="policy-max-duration">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="2">2 hours</SelectItem>
                          <SelectItem value="4">4 hours</SelectItem>
                          <SelectItem value="6">6 hours</SelectItem>
                          <SelectItem value="8">8 hours</SelectItem>
                          <SelectItem value="12">12 hours</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="policy-slot-increment">Time-slot increment</Label>
                      <Select value={timeSlotIncrement.toString()} onValueChange={(v) => setTimeSlotIncrement(parseInt(v))}>
                        <SelectTrigger id="policy-slot-increment">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="15">15 minutes</SelectItem>
                          <SelectItem value="30">30 minutes</SelectItem>
                          <SelectItem value="60">60 minutes</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="policy-booking-window">Booking window</Label>
                      <Select value={bookingWindowDays.toString()} onValueChange={(v) => setBookingWindowDays(parseInt(v))}>
                        <SelectTrigger id="policy-booking-window">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="7">Up to 7 days ahead</SelectItem>
                          <SelectItem value="14">Up to 14 days ahead</SelectItem>
                          <SelectItem value="30">Up to 30 days ahead</SelectItem>
                          <SelectItem value="60">Up to 60 days ahead</SelectItem>
                          <SelectItem value="90">Up to 90 days ahead</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="policy-booking-buffer">Buffer between bookings</Label>
                      <Select value={bufferMinutes.toString()} onValueChange={(v) => setBufferMinutes(parseInt(v))}>
                        <SelectTrigger id="policy-booking-buffer">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0">No buffer</SelectItem>
                          <SelectItem value="15">15 minutes</SelectItem>
                          <SelectItem value="30">30 minutes</SelectItem>
                          <SelectItem value="60">60 minutes</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="policy-grace-period">Late-arrival grace period</Label>
                      <Select value={gracePeriodMinutes.toString()} onValueChange={(v) => setGracePeriodMinutes(parseInt(v))}>
                        <SelectTrigger id="policy-grace-period">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0">No grace period</SelectItem>
                          <SelectItem value="10">10 minutes</SelectItem>
                          <SelectItem value="15">15 minutes</SelectItem>
                          <SelectItem value="30">30 minutes</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Venue Rules & Instructions */}
              <Card id="policy-instructions" className="scroll-mt-24">
                <CardHeader className="p-5 pb-4 sm:p-6 sm:pb-4">
                  <CardTitle as="h2" className="flex items-center gap-2 text-lg">
                    <Info aria-hidden="true" className="h-5 w-5 text-primary" />
                    Rules and instructions
                  </CardTitle>
                  <CardDescription>
                    Keep operational notes with this venue's policy record.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 p-5 pt-0 sm:p-6 sm:pt-0">
                  <Alert className="bg-surface-1">
                    <Info aria-hidden="true" className="h-4 w-4" />
                    <AlertDescription>
                      These notes are saved for the venue. Automatic display on the listing and delivery after booking are not currently available.
                    </AlertDescription>
                  </Alert>
                  <div className="space-y-2">
                    <Label htmlFor="policy-venue-rules">Venue rules</Label>
                    <Textarea
                      id="policy-venue-rules"
                      placeholder="e.g., No outside food or drinks, proper sports attire required, no smoking on premises..."
                      value={venueRules}
                      onChange={(e) => setVenueRules(e.target.value)}
                      rows={4}
                      aria-describedby="policy-venue-rules-help"
                    />
                    <p id="policy-venue-rules-help" className="text-xs leading-relaxed text-muted-foreground">
                      Use this field as the source of truth for venue conduct notes.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="policy-checkin-instructions">Check-in instructions</Label>
                    <Textarea
                      id="policy-checkin-instructions"
                      placeholder="e.g., Enter through the main gate, check in at the front desk, locker rooms are on the left..."
                      value={checkinInstructions}
                      onChange={(e) => setCheckinInstructions(e.target.value)}
                      rows={4}
                      aria-describedby="policy-checkin-help"
                    />
                    <p id="policy-checkin-help" className="text-xs leading-relaxed text-muted-foreground">
                      Keep arrival details ready for your team to share with customers.
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card id="policy-save" className="scroll-mt-24">
                <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
                  <div>
                    <h2 className="font-display text-lg font-semibold tracking-extra-tight text-foreground">
                      Review and save
                    </h2>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                      Save all policy sections for {selectedVenue?.name || "this venue"} together.
                    </p>
                  </div>
                  <Button
                    type="button"
                    onClick={handleSave}
                    disabled={isSaving}
                    className="w-full sm:w-auto"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 aria-hidden="true" className="animate-spin motion-reduce:animate-none" />
                        Saving…
                      </>
                    ) : (
                      <>
                        <Save aria-hidden="true" />
                        Save policies
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      )}
    </OwnerLayout>
  );
};

export default OwnerPoliciesPage;
