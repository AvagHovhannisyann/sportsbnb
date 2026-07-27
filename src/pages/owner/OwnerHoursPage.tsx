import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Clock, Save, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { OwnerLayout } from "@/components/owner/OwnerLayout";
import { EmptyState } from "@/components/ui/empty-state";
import { useAuth } from "@/hooks/useAuth";
import { useOwnerVenues } from "@/hooks/useVenues";
import {
  useVenueHours,
  useBlockedDates,
  useSaveVenueHours,
  useAddBlockedDate,
  useRemoveBlockedDate,
  DAYS_OF_WEEK,
} from "@/hooks/useAvailability";
import { toast } from "sonner";
import { format } from "date-fns";

const OwnerHoursPage = () => {
  const navigate = useNavigate();
  const { user, profile, isLoading: authLoading, isProfileLoading } = useAuth();
  const { data: myVenues = [], isLoading: venuesLoading } = useOwnerVenues(user?.id);

  const [selectedVenueId, setSelectedVenueId] = useState<string | null>(null);
  const [hours, setHours] = useState<
    { day_of_week: number; open_time: string; close_time: string; is_closed: boolean }[]
  >([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [blockReason, setBlockReason] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Set default venue
  useEffect(() => {
    if (myVenues.length > 0 && !selectedVenueId) {
      setSelectedVenueId(myVenues[0].id);
    }
  }, [myVenues, selectedVenueId]);

  const { data: existingHours = [], isLoading: hoursLoading } = useVenueHours(selectedVenueId || undefined);
  const { data: blockedDates = [] } = useBlockedDates(selectedVenueId || undefined);
  const saveVenueHours = useSaveVenueHours();
  const addBlockedDate = useAddBlockedDate();
  const removeBlockedDate = useRemoveBlockedDate();

  // Initialize hours when venue changes
  useEffect(() => {
    if (!hoursLoading) {
      const initialHours = DAYS_OF_WEEK.map((_, index) => {
        const existing = existingHours.find((h) => h.day_of_week === index);
        return {
          day_of_week: index,
          open_time: existing?.open_time || "09:00",
          close_time: existing?.close_time || "21:00",
          is_closed: existing?.is_closed ?? (index === 0), // Sunday closed by default
        };
      });
      setHours(initialHours);
    }
  }, [existingHours, hoursLoading, selectedVenueId]);

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
      <OwnerLayout title="Opening Hours">
        <div className="flex items-center justify-center h-64" role="status" aria-label="Loading opening hours">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </OwnerLayout>
    );
  }

  const handleHourChange = (
    dayIndex: number,
    field: "open_time" | "close_time" | "is_closed",
    value: string | boolean
  ) => {
    setHours((prev) =>
      prev.map((h) =>
        h.day_of_week === dayIndex ? { ...h, [field]: value } : h
      )
    );
  };

  const handleSaveHours = async () => {
    if (!selectedVenueId) return;
    setIsSaving(true);
    try {
      await saveVenueHours.mutateAsync({ venueId: selectedVenueId, hours });
      toast.success("Operating hours saved!");
    } catch (error) {
      toast.error("Failed to save operating hours");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddBlockedDate = async () => {
    if (!selectedVenueId || !selectedDate) return;

    try {
      await addBlockedDate.mutateAsync({
        venueId: selectedVenueId,
        blockedDate: format(selectedDate, "yyyy-MM-dd"),
        reason: blockReason.trim() || undefined,
      });
      setSelectedDate(undefined);
      setBlockReason("");
      toast.success("Date blocked successfully");
    } catch (error) {
      toast.error("Failed to block date");
    }
  };

  const handleRemoveBlockedDate = async (dateId: string) => {
    if (!selectedVenueId) return;
    try {
      await removeBlockedDate.mutateAsync({ id: dateId, venueId: selectedVenueId });
      toast.success("Blocked date removed");
    } catch (error) {
      toast.error("Failed to remove blocked date");
    }
  };


  return (
    <OwnerLayout title="Opening Hours" subtitle="Set your weekly schedule and manage exceptions">
      {myVenues.length === 0 ? (
        <Card>
          <EmptyState
            icon={Clock}
            title="No venues to configure"
            description="Add a venue first to set up opening hours."
            actionLabel="Add Your First Venue"
            actionHref="/add-venue"
          />
        </Card>
      ) : (
        <div className="max-w-3xl space-y-6">
          {/* Venue Selector */}
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

          {/* Weekly Hours */}
          <Card>
            <CardHeader>
              <CardTitle as="h2" className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                Weekly Schedule
              </CardTitle>
              <CardDescription>
                Set regular opening hours for each day of the week
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {hoursLoading ? (
                <div className="flex justify-center py-8" role="status" aria-label="Loading opening hours">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : (
                <>
                  {hours.map((hour) => (
                    <div
                      key={hour.day_of_week}
                      /* Wraps below sm. A day row is a fixed 112px label, a
                         toggle, and two 128px time inputs on one line — about
                         520px that never fitted a 375px phone, so the whole
                         opening-hours page scrolled sideways. Below sm the
                         time range drops to its own full-width line. */
                      className="flex flex-wrap items-center gap-3 p-4 rounded-xl bg-muted/50 hover:bg-muted/70 transition-colors sm:gap-4"
                    >
                      <div className="w-24 font-medium text-foreground sm:w-28">
                        {DAYS_OF_WEEK[hour.day_of_week]}
                      </div>
                      {/* All seven switches were anonymous: no id, no label,
                          no aria-label, so a screen reader read this page as
                          "switch, on" seven times with nothing to say which
                          day it was closing. The day name is the switch's
                          name; "Open"/"Closed" is its state, and is now a
                          label so tapping the word works too — the switch
                          alone is a 16px-tall target. */}
                      <div className="flex items-center gap-3">
                        <Switch
                          id={`day-open-${hour.day_of_week}`}
                          aria-label={DAYS_OF_WEEK[hour.day_of_week]}
                          checked={!hour.is_closed}
                          onCheckedChange={(checked) =>
                            handleHourChange(hour.day_of_week, "is_closed", !checked)
                          }
                        />
                        <Label
                          htmlFor={`day-open-${hour.day_of_week}`}
                          /* text-emerald-600 was off the token system, and the
                             one beside it was already on it. */
                          className={`cursor-pointer py-1 text-sm font-normal ${
                            hour.is_closed ? "text-destructive" : "text-success"
                          }`}
                        >
                          {hour.is_closed ? "Closed" : "Open"}
                        </Label>
                      </div>
                      {!hour.is_closed && (
                        <div className="flex w-full items-center gap-2 sm:ml-auto sm:w-auto">
                          <Input
                            type="time"
                            aria-label={`${DAYS_OF_WEEK[hour.day_of_week]} opening time`}
                            value={hour.open_time}
                            onChange={(e) =>
                              handleHourChange(hour.day_of_week, "open_time", e.target.value)
                            }
                            className="flex-1 sm:w-32 sm:flex-none"
                          />
                          <span className="text-muted-foreground">to</span>
                          <Input
                            type="time"
                            aria-label={`${DAYS_OF_WEEK[hour.day_of_week]} closing time`}
                            value={hour.close_time}
                            onChange={(e) =>
                              handleHourChange(hour.day_of_week, "close_time", e.target.value)
                            }
                            className="flex-1 sm:w-32 sm:flex-none"
                          />
                        </div>
                      )}
                    </div>
                  ))}
                  <Button
                    onClick={handleSaveHours}
                    disabled={isSaving}
                    className="w-full mt-4"
                    size="lg"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Save Opening Hours
                      </>
                    )}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          {/* Exceptions / Blocked Dates */}
          <Card>
            <CardHeader>
              <CardTitle as="h2">Date Exceptions</CardTitle>
              <CardDescription>
                Block specific dates for holidays, maintenance, or special events
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="justify-start w-full sm:w-auto">
                      <Clock className="h-4 w-4 mr-2" />
                      {selectedDate ? format(selectedDate, "PPP") : "Select date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={setSelectedDate}
                      disabled={(date) => date < new Date()}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <Input
                  placeholder="Reason (optional)"
                  value={blockReason}
                  onChange={(e) => setBlockReason(e.target.value)}
                  className="flex-1"
                  maxLength={100}
                />
                <Button
                  onClick={handleAddBlockedDate}
                  disabled={!selectedDate || addBlockedDate.isPending}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Block Date
                </Button>
              </div>

              {blockedDates.length > 0 ? (
                <div className="space-y-2 pt-4">
                  <Label>Upcoming Blocked Dates</Label>
                  <div className="flex flex-wrap gap-2">
                    {blockedDates.map((blocked) => (
                      <Badge
                        key={blocked.id}
                        variant="secondary"
                        className="flex items-center gap-2 py-2 px-3"
                      >
                        <span>
                          {format(new Date(blocked.blocked_date), "MMM d, yyyy")}
                          {blocked.reason && ` — ${blocked.reason}`}
                        </span>
                        {/* Named, like the removable chips in filter-chips.tsx. This was a
                            bare <button> holding a 12px X: a screen reader
                            announced "button" and nothing else, so with several
                            blocked dates listed there was no way to tell which
                            one it would remove. It had never been reported
                            because `blocked_dates` was missing from the audit
                            fixtures, so this list always rendered empty. */}
                        <button
                          onClick={() => handleRemoveBlockedDate(blocked.id)}
                          aria-label={`Remove the block on ${format(new Date(blocked.blocked_date), "MMM d, yyyy")}`}
                          className="hover:text-destructive transition-colors"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-6">
                  No blocked dates scheduled
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </OwnerLayout>
  );
};

export default OwnerHoursPage;
