import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CalendarDays, CalendarOff, Clock3, Loader2, Plus, Save, Trash2 } from "lucide-react";
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
import { ErrorPanel } from "@/components/common/StatusPanel";
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
import { formatTimeOfDay } from "@/lib/time";
import { toast } from "sonner";
import { format } from "date-fns";

const OwnerHoursPage = () => {
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

  const {
    data: existingHours = [],
    isLoading: hoursLoading,
    isError: hoursError,
    isFetching: hoursFetching,
    refetch: refetchHours,
  } = useVenueHours(selectedVenueId || undefined);
  const {
    data: blockedDates = [],
    isLoading: blockedDatesLoading,
    isError: blockedDatesError,
    isFetching: blockedDatesFetching,
    refetch: refetchBlockedDates,
  } = useBlockedDates(selectedVenueId || undefined);
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
          <Loader2 aria-hidden="true" className="h-8 w-8 animate-spin text-primary motion-reduce:animate-none" />
        </div>
      </OwnerLayout>
    );
  }

  if (venuesError) {
    return (
      <OwnerLayout title="Opening Hours" subtitle="Set weekly availability and planned closures.">
        <Card className="max-w-3xl">
          <ErrorPanel
            what="your venues"
            description="Your schedule has not changed. Try loading your venues again."
            onRetry={() => refetchVenues()}
            isRetrying={venuesFetching}
          />
        </Card>
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

  const selectedVenue = myVenues.find((venue) => venue.id === selectedVenueId);


  return (
    <OwnerLayout
      title="Opening Hours"
      subtitle="Set weekly availability and planned closures."
    >
      {myVenues.length === 0 ? (
        <Card className="max-w-3xl">
          <EmptyState
            icon={Clock3}
            title="No venues to configure"
            description="Add a venue first to set up opening hours."
            actionLabel="Add first venue"
            actionHref="/add-venue"
          />
        </Card>
      ) : (
        <div className="max-w-5xl space-y-5">
          <section
            aria-labelledby="hours-venue-context"
            className="rounded-lg border border-border bg-surface-1 p-4 sm:flex sm:items-end sm:justify-between sm:gap-6"
          >
            <div className="min-w-0">
              <p className="eyebrow">Venue context</p>
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <h2
                  id="hours-venue-context"
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
                Weekly hours and closures below apply only to this venue.
              </p>
            </div>
            <div className="mt-4 w-full sm:mt-0 sm:max-w-xs">
              <Label htmlFor="hours-venue">Venue</Label>
              <Select value={selectedVenueId || ""} onValueChange={setSelectedVenueId}>
                <SelectTrigger id="hours-venue" className="mt-1.5">
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

          <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(19rem,0.65fr)]">
            <Card>
              <CardHeader className="p-5 pb-4 sm:p-6 sm:pb-4">
                <CardTitle as="h2" className="flex items-center gap-2 text-lg">
                  <Clock3 aria-hidden="true" className="h-5 w-5 text-primary" />
                  Weekly schedule
                </CardTitle>
                <CardDescription>
                  Set the regular hours when customers can request bookings.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
                {hoursLoading ? (
                  <div className="flex justify-center py-12" role="status" aria-label="Loading opening hours">
                    <Loader2 aria-hidden="true" className="h-6 w-6 animate-spin text-primary motion-reduce:animate-none" />
                  </div>
                ) : hoursError ? (
                  <ErrorPanel
                    what="opening hours"
                    description="Your saved schedule has not changed."
                    onRetry={() => refetchHours()}
                    isRetrying={hoursFetching}
                    className="py-8"
                  />
                ) : (
                  <>
                    <div className="divide-y divide-border overflow-hidden rounded-lg border border-border">
                      {hours.map((hour) => {
                        const day = DAYS_OF_WEEK[hour.day_of_week];
                        const statusId = `day-status-${hour.day_of_week}`;
                        const switchId = `day-open-${hour.day_of_week}`;
                        const openId = `day-opens-${hour.day_of_week}`;
                        const closeId = `day-closes-${hour.day_of_week}`;

                        return (
                          <fieldset
                            key={hour.day_of_week}
                            className="grid gap-3 bg-card p-4 sm:grid-cols-[7.5rem_8.5rem_minmax(0,1fr)] sm:items-center"
                          >
                            <legend className="sr-only">{day} opening hours</legend>
                            <div>
                              <p className="font-semibold text-foreground">{day}</p>
                              <p id={statusId} className="mt-0.5 text-xs text-muted-foreground">
                                {hour.is_closed
                                  ? "Closed all day"
                                  : `${formatTimeOfDay(hour.open_time)}–${formatTimeOfDay(hour.close_time)}`}
                              </p>
                            </div>

                            <div className="flex min-h-11 items-center gap-3">
                              <Switch
                                id={switchId}
                                aria-describedby={statusId}
                                checked={!hour.is_closed}
                                onCheckedChange={(checked) =>
                                  handleHourChange(hour.day_of_week, "is_closed", !checked)
                                }
                              />
                              <Label htmlFor={switchId} className="cursor-pointer">
                                Accept bookings
                              </Label>
                            </div>

                            {!hour.is_closed ? (
                              <div className="grid grid-cols-2 gap-3 sm:justify-self-end">
                                <div className="space-y-1.5">
                                  <Label htmlFor={openId} className="text-xs text-muted-foreground">
                                    Opens
                                  </Label>
                                  <Input
                                    id={openId}
                                    type="time"
                                    value={hour.open_time}
                                    onChange={(event) =>
                                      handleHourChange(hour.day_of_week, "open_time", event.target.value)
                                    }
                                    className="stat-numeral min-w-0"
                                  />
                                </div>
                                <div className="space-y-1.5">
                                  <Label htmlFor={closeId} className="text-xs text-muted-foreground">
                                    Closes
                                  </Label>
                                  <Input
                                    id={closeId}
                                    type="time"
                                    value={hour.close_time}
                                    onChange={(event) =>
                                      handleHourChange(hour.day_of_week, "close_time", event.target.value)
                                    }
                                    className="stat-numeral min-w-0"
                                  />
                                </div>
                              </div>
                            ) : (
                              <Badge variant="secondary" className="w-fit sm:justify-self-end">
                                Closed all day
                              </Badge>
                            )}
                          </fieldset>
                        );
                      })}
                    </div>

                    <div className="mt-5 flex flex-col gap-3 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-sm leading-relaxed text-muted-foreground">
                        Date exceptions override this weekly schedule.
                      </p>
                      <Button
                        type="button"
                        onClick={handleSaveHours}
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
                            Save hours
                          </>
                        )}
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="p-5 pb-4 sm:p-6 sm:pb-4">
                <CardTitle as="h2" className="flex items-center gap-2 text-lg">
                  <CalendarDays aria-hidden="true" className="h-5 w-5 text-primary" />
                  Date exceptions
                </CardTitle>
                <CardDescription>
                  Close a date for maintenance, holidays, or private events.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5 p-5 pt-0 sm:p-6 sm:pt-0">
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="blocked-date">Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          id="blocked-date"
                          type="button"
                          variant="outline"
                          className="w-full justify-start font-normal"
                        >
                          <CalendarDays aria-hidden="true" />
                          <span className="truncate">
                            {selectedDate ? format(selectedDate, "PPP") : "Select a date"}
                          </span>
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
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="blocked-reason">Reason <span className="font-normal text-muted-foreground">(optional)</span></Label>
                    <Input
                      id="blocked-reason"
                      placeholder="Maintenance, holiday…"
                      value={blockReason}
                      onChange={(event) => setBlockReason(event.target.value)}
                      maxLength={100}
                    />
                  </div>

                  <Button
                    type="button"
                    onClick={handleAddBlockedDate}
                    disabled={!selectedDate || addBlockedDate.isPending}
                    className="w-full"
                  >
                    {addBlockedDate.isPending ? (
                      <>
                        <Loader2 aria-hidden="true" className="animate-spin motion-reduce:animate-none" />
                        Blocking date…
                      </>
                    ) : (
                      <>
                        <Plus aria-hidden="true" />
                        Block date
                      </>
                    )}
                  </Button>
                </div>

                <div className="border-t border-border pt-5">
                  <h3 className="font-display text-base font-semibold tracking-extra-tight text-foreground">
                    Upcoming closures
                  </h3>

                  {blockedDatesLoading ? (
                    <div className="flex justify-center py-10" role="status" aria-label="Loading blocked dates">
                      <Loader2 aria-hidden="true" className="h-5 w-5 animate-spin text-primary motion-reduce:animate-none" />
                    </div>
                  ) : blockedDatesError ? (
                    <ErrorPanel
                      what="blocked dates"
                      onRetry={() => refetchBlockedDates()}
                      isRetrying={blockedDatesFetching}
                      className="py-8"
                    />
                  ) : blockedDates.length > 0 ? (
                    <ul className="mt-3 divide-y divide-border overflow-hidden rounded-lg border border-border">
                      {blockedDates.map((blocked) => {
                        const formattedDate = format(new Date(blocked.blocked_date), "MMM d, yyyy");

                        return (
                          <li key={blocked.id} className="flex min-h-16 items-center gap-3 bg-card px-3 py-2.5">
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-foreground">{formattedDate}</p>
                              <p className="truncate text-sm text-muted-foreground">
                                {blocked.reason || "No reason added"}
                              </p>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
                              onClick={() => handleRemoveBlockedDate(blocked.id)}
                              aria-label={`Remove the block on ${formattedDate}`}
                            >
                              <Trash2 aria-hidden="true" />
                            </Button>
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <div className="mt-3 flex items-start gap-3 rounded-lg border border-dashed border-border bg-surface-1 p-4">
                      <CalendarOff aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
                      <div>
                        <p className="font-medium text-foreground">No dates are blocked</p>
                        <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">
                          Your weekly schedule currently applies without exceptions.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </OwnerLayout>
  );
};

export default OwnerHoursPage;
