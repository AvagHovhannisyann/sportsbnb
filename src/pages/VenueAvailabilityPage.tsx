import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Loader2, Plus, X, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import Layout from "@/components/layout/Layout";
import { useAuth } from "@/hooks/useAuth";
import { useVenueById } from "@/hooks/useVenues";
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

const VenueAvailabilityPage = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user, profile, isLoading: authLoading } = useAuth();
  const { data: venue, isLoading: venueLoading } = useVenueById(id);
  const { data: existingHours = [], isLoading: hoursLoading } = useVenueHours(id);
  const { data: blockedDates = [] } = useBlockedDates(id);

  const saveVenueHours = useSaveVenueHours();
  const addBlockedDate = useAddBlockedDate();
  const removeBlockedDate = useRemoveBlockedDate();

  const [hours, setHours] = useState<
    { day_of_week: number; open_time: string; close_time: string; is_closed: boolean }[]
  >([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [blockReason, setBlockReason] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login");
    }
    if (!authLoading && user && profile?.user_type !== "owner") {
      navigate("/dashboard");
    }
  }, [user, profile, authLoading, navigate]);

  useEffect(() => {
    if (venue && user && venue.owner_id !== user.id) {
      toast.error("You don't have permission to manage this venue");
      navigate("/owner-dashboard");
    }
  }, [venue, user, navigate]);

  useEffect(() => {
    if (!hoursLoading) {
      // Initialize hours for all days
      const initialHours = DAYS_OF_WEEK.map((_, index) => {
        const existing = existingHours.find((h) => h.day_of_week === index);
        return {
          day_of_week: index,
          open_time: existing?.open_time || "09:00",
          close_time: existing?.close_time || "21:00",
          is_closed: existing?.is_closed ?? false,
        };
      });
      setHours(initialHours);
    }
  }, [existingHours, hoursLoading]);

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
    if (!id) return;
    setIsSaving(true);
    try {
      await saveVenueHours.mutateAsync({ venueId: id, hours });
      toast.success("Operating hours saved!");
    } catch (error) {
      console.error("Error saving hours:", error);
      toast.error("Failed to save operating hours");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddBlockedDate = async () => {
    if (!id || !selectedDate) return;

    try {
      await addBlockedDate.mutateAsync({
        venueId: id,
        blockedDate: format(selectedDate, "yyyy-MM-dd"),
        reason: blockReason.trim() || undefined,
      });
      setSelectedDate(undefined);
      setBlockReason("");
      toast.success("Date blocked successfully");
    } catch (error) {
      console.error("Error blocking date:", error);
      toast.error("Failed to block date");
    }
  };

  const handleRemoveBlockedDate = async (dateId: string) => {
    if (!id) return;
    try {
      await removeBlockedDate.mutateAsync({ id: dateId, venueId: id });
      toast.success("Blocked date removed");
    } catch (error) {
      console.error("Error removing blocked date:", error);
      toast.error("Failed to remove blocked date");
    }
  };

  if (authLoading || venueLoading || hoursLoading) {
    return (
      <Layout>
        <div className="container py-16 text-center" role="status" aria-label="Loading availability">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
        </div>
      </Layout>
    );
  }

  if (!venue) {
    return (
      <Layout>
        <div className="container py-16 text-center">
          <h1 className="text-2xl font-bold text-foreground mb-2">Venue Not Found</h1>
          <Button onClick={() => navigate("/owner-dashboard")}>Back to Dashboard</Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="bg-background min-h-screen">
        <div className="container py-8 max-w-3xl">
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <Button aria-label="Back" variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" aria-hidden="true" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Availability Settings</h1>
              <p className="text-muted-foreground">{venue.name}</p>
            </div>
          </div>

          <div className="space-y-6">
            {/* Operating Hours */}
            <Card>
              <CardHeader>
                <CardTitle as="h2">Operating Hours</CardTitle>
                <CardDescription>Set your regular weekly schedule</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {hours.map((hour) => (
                  <div
                    key={hour.day_of_week}
                    /* Same wrap as OwnerHoursPage: label + toggle + two
                       128px time inputs never fitted 375px on one line. */
                    className="flex flex-wrap items-center gap-3 p-3 rounded-lg bg-muted/50 sm:gap-4"
                  >
                    <div className="w-24 font-medium text-foreground sm:w-28">
                      {DAYS_OF_WEEK[hour.day_of_week]}
                    </div>
                    <div className="flex items-center gap-2 sm:flex-1">
                      {/* Same anonymous day switches as /owner/hours had, in
                          a second copy of the opening-hours editor. The day is
                          the switch's name; Open/Closed is its state, and is
                          now a label so the word is a hit target too. */}
                      <Switch
                        id={`availability-open-${hour.day_of_week}`}
                        aria-label={DAYS_OF_WEEK[hour.day_of_week]}
                        checked={!hour.is_closed}
                        onCheckedChange={(checked) =>
                          handleHourChange(hour.day_of_week, "is_closed", !checked)
                        }
                      />
                      <Label
                        htmlFor={`availability-open-${hour.day_of_week}`}
                        className="cursor-pointer py-1 text-sm font-normal text-muted-foreground"
                      >
                        {hour.is_closed ? "Closed" : "Open"}
                      </Label>
                    </div>
                    {!hour.is_closed && (
                      <div className="flex w-full items-center gap-2 sm:w-auto">
                        <Input
                          type="time"
                          value={hour.open_time}
                          onChange={(e) =>
                            handleHourChange(hour.day_of_week, "open_time", e.target.value)
                          }
                          className="flex-1 sm:w-32 sm:flex-none"
                        />
                        <span className="text-muted-foreground">to</span>
                        <Input
                          type="time"
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
                <Button onClick={handleSaveHours} disabled={isSaving} className="w-full mt-4">
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Operating Hours"
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Blocked Dates */}
            <Card>
              <CardHeader>
                <CardTitle as="h2">Blocked Dates</CardTitle>
                <CardDescription>
                  Block specific dates for holidays or maintenance
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-4">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="justify-start">
                        <Calendar className="h-4 w-4 mr-2" />
                        {selectedDate ? format(selectedDate, "PPP") : "Select date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
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

                {blockedDates.length > 0 && (
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
                            {blocked.reason && ` - ${blocked.reason}`}
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
                            className="hover:text-destructive"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {blockedDates.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No blocked dates scheduled
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default VenueAvailabilityPage;
