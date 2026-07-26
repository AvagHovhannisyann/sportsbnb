import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, FileText, Save, Clock, Ban, Info, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
import { useOwnerVenues } from "@/hooks/useVenues";
import { useVenuePolicy, useSaveVenuePolicy } from "@/hooks/useVenuePolicies";
import { usePlatformCancellationPolicy } from "@/hooks/useVenueEquipment";
import { formatPrice } from "@/lib/pricing";
import { toast } from "sonner";

const OwnerPoliciesPage = () => {
  const navigate = useNavigate();
  const { user, profile, isLoading: authLoading, isProfileLoading } = useAuth();
  const { data: myVenues = [], isLoading: venuesLoading } = useOwnerVenues(user?.id);

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

  const { data: existingPolicy, isLoading: policyLoading } = useVenuePolicy(selectedVenueId || undefined);
  const { data: platformCancellation } = usePlatformCancellationPolicy();
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
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
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

  return (
    <OwnerLayout title="Policies" subtitle="Set cancellation rules, booking policies, and venue instructions">
      {myVenues.length === 0 ? (
        <Card>
          <EmptyState
            icon={FileText}
            title="No venues to configure"
            description="Add a venue first to set up policies and rules."
            actionLabel="Add Your First Venue"
            actionHref="/add-venue"
          />
        </Card>
      ) : (
        <div className="max-w-3xl space-y-6">
          {/* Venue Selector */}
          <div>
            <Label className="mb-2 block">Select Venue</Label>
            <Select value={selectedVenueId || ""} onValueChange={setSelectedVenueId}>
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

          {policyLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : (
            <>
              {/* Platform Cancellation Policy Info */}
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  <strong>Platform Cancellation Policy:</strong> To ensure fairness, cancellation fees are controlled by the platform.
                  {platformCancellation && (
                    <ul className="mt-2 space-y-1 text-sm">
                      {platformCancellation.tiers.map((tier, idx) => (
                        <li key={idx}>• {tier.description} (more than {tier.hours_before}h before)</li>
                      ))}
                    </ul>
                  )}
                  <p className="mt-2 text-sm">Maximum fee is capped at {platformCancellation?.max_fee_percentage || 20}%.</p>
                </AlertDescription>
              </Alert>

              {/* Overtime & Early Arrival */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Timer className="h-5 w-5 text-primary" />
                    Overtime & Early Arrival
                  </CardTitle>
                  <CardDescription>
                    Configure charges for customers who stay longer or arrive early
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Overtime Rate (per minute)</Label>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">֏</span>
                        <Input
                          type="number"
                          min="0"
                          step="10"
                          value={overtimeRatePerMinute}
                          onChange={(e) => setOvertimeRatePerMinute(parseFloat(e.target.value) || 0)}
                          className="w-32"
                        />
                        <span className="text-sm text-muted-foreground">per minute</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Charged when customers stay beyond their booked time. 
                        {overtimeRatePerMinute > 0 && (
                          <span className="text-foreground font-medium">
                            {" "}Example: 30 min overtime = {formatPrice(overtimeRatePerMinute * 30)}
                          </span>
                        )}
                      </p>
                    </div>

                    <Separator />

                    <div className="space-y-3">
                      <Label>Early Arrival Policy</Label>
                      <RadioGroup 
                        value={earlyArrivalPolicy} 
                        onValueChange={(v) => setEarlyArrivalPolicy(v as typeof earlyArrivalPolicy)}
                      >
                        <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                          <RadioGroupItem value="not_allowed" id="early-not-allowed" className="mt-0.5" />
                          <div>
                            <Label htmlFor="early-not-allowed" className="cursor-pointer">Not Allowed</Label>
                            <p className="text-sm text-muted-foreground">Customers must wait for their booked time</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                          <RadioGroupItem value="free_if_available" id="early-free" className="mt-0.5" />
                          <div>
                            <Label htmlFor="early-free" className="cursor-pointer">Free if Available</Label>
                            <p className="text-sm text-muted-foreground">Allow early start at no extra charge if slot is open</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                          <RadioGroupItem value="charged_normal_rate" id="early-charged" className="mt-0.5" />
                          <div>
                            <Label htmlFor="early-charged" className="cursor-pointer">Charged at Normal Rate</Label>
                            <p className="text-sm text-muted-foreground">Early time is billed at your regular hourly rate</p>
                          </div>
                        </div>
                      </RadioGroup>
                    </div>

                    {earlyArrivalPolicy !== 'not_allowed' && (
                      <div className="space-y-2">
                        <Label>Maximum Early Arrival Window</Label>
                        <Select 
                          value={earlyArrivalMinutes.toString()} 
                          onValueChange={(v) => setEarlyArrivalMinutes(parseInt(v))}
                        >
                          <SelectTrigger className="w-48">
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
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Ban className="h-5 w-5 text-primary" />
                    Cancellation Window
                  </CardTitle>
                  <CardDescription>
                    Set how far in advance customers should cancel (fees are platform-controlled)
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <RadioGroup value={cancellationPolicy} onValueChange={setCancellationPolicy}>
                    <div className="flex items-start gap-3 p-4 rounded-xl bg-muted/50 hover:bg-muted/70 transition-colors cursor-pointer">
                      <RadioGroupItem value="flexible" id="flexible" className="mt-1" />
                      <div className="flex-1">
                        <Label htmlFor="flexible" className="font-medium cursor-pointer">Flexible</Label>
                        <p className="text-sm text-muted-foreground">Cancel up to 24 hours before for a full refund</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-4 rounded-xl bg-muted/50 hover:bg-muted/70 transition-colors cursor-pointer">
                      <RadioGroupItem value="moderate" id="moderate" className="mt-1" />
                      <div className="flex-1">
                        <Label htmlFor="moderate" className="font-medium cursor-pointer">Moderate</Label>
                        <p className="text-sm text-muted-foreground">Cancel up to 48 hours before for a full refund</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-4 rounded-xl bg-muted/50 hover:bg-muted/70 transition-colors cursor-pointer">
                      <RadioGroupItem value="strict" id="strict" className="mt-1" />
                      <div className="flex-1">
                        <Label htmlFor="strict" className="font-medium cursor-pointer">Strict</Label>
                        <p className="text-sm text-muted-foreground">Cancel up to 72 hours before for a full refund</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-4 rounded-xl bg-muted/50 hover:bg-muted/70 transition-colors cursor-pointer">
                      <RadioGroupItem value="custom" id="custom" className="mt-1" />
                      <div className="flex-1">
                        <Label htmlFor="custom" className="font-medium cursor-pointer">Custom</Label>
                        <p className="text-sm text-muted-foreground mb-2">Set your own cancellation window</p>
                        {cancellationPolicy === "custom" && (
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              value={customCancellationHours}
                              onChange={(e) => setCustomCancellationHours(parseInt(e.target.value) || 24)}
                              className="w-24"
                              min={1}
                            />
                            <span className="text-sm text-muted-foreground">hours before booking</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </RadioGroup>

                  <Separator />

                  <div className="space-y-3">
                    <Label>Refund Type (within cancellation window)</Label>
                    <RadioGroup value={refundType} onValueChange={setRefundType} className="flex gap-4">
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="full" id="full-refund" />
                        <Label htmlFor="full-refund" className="cursor-pointer">Full refund</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="partial" id="partial-refund" />
                        <Label htmlFor="partial-refund" className="cursor-pointer">50% refund</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="none" id="no-refund" />
                        <Label htmlFor="no-refund" className="cursor-pointer">No refund</Label>
                      </div>
                    </RadioGroup>
                  </div>
                </CardContent>
              </Card>

              {/* Booking Rules */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-primary" />
                    Booking Rules
                  </CardTitle>
                  <CardDescription>
                    Control how customers can book your venue
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Minimum Duration</Label>
                      <Select value={minDuration.toString()} onValueChange={(v) => setMinDuration(parseFloat(v))}>
                        <SelectTrigger>
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
                      <Label>Maximum Duration</Label>
                      <Select value={maxDuration.toString()} onValueChange={(v) => setMaxDuration(parseFloat(v))}>
                        <SelectTrigger>
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
                      <Label>Time Slot Increments</Label>
                      <Select value={timeSlotIncrement.toString()} onValueChange={(v) => setTimeSlotIncrement(parseInt(v))}>
                        <SelectTrigger>
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
                      <Label>Booking Window</Label>
                      <Select value={bookingWindowDays.toString()} onValueChange={(v) => setBookingWindowDays(parseInt(v))}>
                        <SelectTrigger>
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
                      <Label>Buffer Between Bookings</Label>
                      <Select value={bufferMinutes.toString()} onValueChange={(v) => setBufferMinutes(parseInt(v))}>
                        <SelectTrigger>
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
                      <Label>Late Arrival Grace Period</Label>
                      <Select value={gracePeriodMinutes.toString()} onValueChange={(v) => setGracePeriodMinutes(parseInt(v))}>
                        <SelectTrigger>
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
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Info className="h-5 w-5 text-primary" />
                    Rules & Instructions
                  </CardTitle>
                  <CardDescription>
                    Information displayed to customers before and after booking
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label>Venue Rules</Label>
                    <Textarea
                      placeholder="e.g., No outside food or drinks, proper sports attire required, no smoking on premises..."
                      value={venueRules}
                      onChange={(e) => setVenueRules(e.target.value)}
                      rows={4}
                    />
                    <p className="text-xs text-muted-foreground">
                      Displayed on the venue page before booking
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Check-in Instructions</Label>
                    <Textarea
                      placeholder="e.g., Enter through the main gate, check in at the front desk, locker rooms are on the left..."
                      value={checkinInstructions}
                      onChange={(e) => setCheckinInstructions(e.target.value)}
                      rows={4}
                    />
                    <p className="text-xs text-muted-foreground">
                      Sent to customers after booking confirmation
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Save Button */}
              <Button onClick={handleSave} disabled={isSaving} size="lg" className="w-full">
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Policies
                  </>
                )}
              </Button>
            </>
          )}
        </div>
      )}
    </OwnerLayout>
  );
};

export default OwnerPoliciesPage;
