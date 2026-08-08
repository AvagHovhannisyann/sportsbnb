import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Loader2, Plus, X, Calendar, Clock3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorPanel } from "@/components/common/StatusPanel";
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
  const {
    data: venue,
    isLoading: venueLoading,
    isError: venueError,
    refetch: refetchVenue,
    isFetching: venueFetching,
  } = useVenueById(id);
  const {
    data: existingHours = [],
    isLoading: hoursLoading,
    isError: hoursError,
    refetch: refetchHours,
    isFetching: hoursFetching,
  } = useVenueHours(id);
  const {
    data: blockedDates = [],
    isLoading: blockedDatesLoading,
    isError: blockedDatesError,
    refetch: refetchBlockedDates,
    isFetching: blockedDatesFetching,
  } = useBlockedDates(id);

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

  if (authLoading || (!venueError && (venueLoading || (hoursLoading && !hoursError)))) {
    return (
      <Layout showMobileNav={false} showAssistant={false}>
        <div className="container max-w-4xl py-8 sm:py-12" role="status" aria-label="Loading venue availability">
          <div className="mb-8 flex items-center gap-4">
            <Skeleton className="h-11 w-11 shrink-0" />
            <div className="space-y-2">
              <Skeleton className="h-8 w-56" />
              <Skeleton className="h-4 w-40" />
            </div>
          </div>
          <Card>
            <CardContent className="space-y-3 p-5 sm:p-6">
              <Skeleton className="h-5 w-40" />
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-16 w-full" />
              ))}
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  if (venueError) {
    return (
      <Layout showMobileNav={false} showAssistant={false}>
        <div className="container max-w-3xl py-10 sm:py-16">
          <header className="mb-6">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-primary">Venue schedule</p>
            <h1 className="page-title">Hours &amp; availability</h1>
            <p className="mt-1 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
              Availability could not be opened, but no schedule settings were changed.
            </p>
          </header>
          <Card>
            <ErrorPanel
              what="this venue"
              description="We couldn't retrieve the venue. No availability settings were changed."
              onRetry={() => refetchVenue()}
              isRetrying={venueFetching}
            >
              <Button variant="outline" onClick={() => navigate("/owner-dashboard")}>Back to dashboard</Button>
            </ErrorPanel>
          </Card>
        </div>
      </Layout>
    );
  }

  if (!venue) {
    return (
      <Layout showMobileNav={false} showAssistant={false}>
        <div className="container max-w-3xl py-10 sm:py-16">
          <Card>
            <CardContent className="p-6 text-center sm:p-10">
              <h1 className="font-display text-2xl font-semibold tracking-extra-tight text-foreground">Venue not found</h1>
              <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
                This venue doesn't exist or your account cannot access it.
              </p>
              <Button className="mt-5" onClick={() => navigate("/owner-dashboard")}>Back to dashboard</Button>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout showMobileNav={false} showAssistant={false}>
      <div className="min-h-screen bg-surface-1/60">
        <div className="container max-w-4xl py-6 sm:py-10 lg:py-12">
          <header className="mb-7 grid grid-cols-[auto_minmax(0,1fr)] items-start gap-3 sm:mb-8 sm:gap-4">
            <Button
              aria-label="Go back"
              variant="ghost"
              size="icon"
              className="-ml-2"
              onClick={() => navigate(-1)}
            >
              <ArrowLeft aria-hidden="true" />
            </Button>
            <div className="min-w-0 pt-1">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-primary">Venue schedule</p>
              <h1 className="page-title">Hours &amp; availability</h1>
              <p className="mt-1 truncate text-sm text-muted-foreground sm:text-base" title={venue.name}>{venue.name}</p>
            </div>
          </header>

          <div className="space-y-5 sm:space-y-6">
            <Card>
              <CardHeader className="p-5 sm:p-6">
                <CardTitle as="h2" className="flex items-center gap-2">
                  <Clock3 className="h-5 w-5 text-primary" aria-hidden="true" />
                  Operating hours
                </CardTitle>
                <CardDescription>Set the recurring weekly window when players can book this venue.</CardDescription>
              </CardHeader>
              <CardContent className="px-5 pb-5 sm:px-6 sm:pb-6">
                {hoursError ? (
                  <ErrorPanel
                    what="operating hours"
                    description="The saved weekly schedule could not be retrieved. No hours were changed."
                    onRetry={() => refetchHours()}
                    isRetrying={hoursFetching}
                    className="py-6"
                  />
                ) : (
                  <>
                    <div className="space-y-2" aria-label="Weekly operating hours">
                      {hours.map((hour) => {
                        const day = DAYS_OF_WEEK[hour.day_of_week];
                        const switchId = `availability-open-${hour.day_of_week}`;
                        const openId = `availability-start-${hour.day_of_week}`;
                        const closeId = `availability-end-${hour.day_of_week}`;

                        return (
                          <div
                            key={hour.day_of_week}
                            className="grid gap-3 rounded-lg border border-border bg-surface-1 p-4 sm:grid-cols-[7rem_6rem_minmax(0,1fr)] sm:items-center"
                          >
                            <p className="font-semibold text-foreground">{day}</p>
                            <div className="flex min-h-11 items-center gap-2">
                              <Switch
                                id={switchId}
                                aria-label={`${day} availability`}
                                checked={!hour.is_closed}
                                onCheckedChange={(checked) =>
                                  handleHourChange(hour.day_of_week, "is_closed", !checked)
                                }
                              />
                              <Label htmlFor={switchId} className="cursor-pointer py-2 font-normal text-muted-foreground">
                                {hour.is_closed ? "Closed" : "Open"}
                              </Label>
                            </div>
                            {!hour.is_closed ? (
                              <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
                                <Label htmlFor={openId} className="sr-only">{day} opening time</Label>
                                <Input
                                  id={openId}
                                  name={`hours[${hour.day_of_week}].open_time`}
                                  type="time"
                                  value={hour.open_time}
                                  onChange={(e) =>
                                    handleHourChange(hour.day_of_week, "open_time", e.target.value)
                                  }
                                  className="min-w-0"
                                />
                                <span className="text-sm text-muted-foreground" aria-hidden="true">to</span>
                                <Label htmlFor={closeId} className="sr-only">{day} closing time</Label>
                                <Input
                                  id={closeId}
                                  name={`hours[${hour.day_of_week}].close_time`}
                                  type="time"
                                  value={hour.close_time}
                                  onChange={(e) =>
                                    handleHourChange(hour.day_of_week, "close_time", e.target.value)
                                  }
                                  className="min-w-0"
                                />
                              </div>
                            ) : (
                              <p className="text-sm text-muted-foreground">Unavailable for bookings all day</p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    <div className="mt-5 flex justify-end">
                      <Button onClick={handleSaveHours} disabled={isSaving} className="w-full sm:w-auto sm:min-w-48">
                        {isSaving ? (
                          <>
                            <Loader2 className="animate-spin motion-reduce:animate-none" aria-hidden="true" />
                            Saving…
                          </>
                        ) : (
                          "Save operating hours"
                        )}
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="p-5 sm:p-6">
                <CardTitle as="h2" className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary" aria-hidden="true" />
                  Blocked dates
                </CardTitle>
                <CardDescription>Prevent bookings on a holiday, maintenance day, or private event.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5 px-5 pb-5 sm:px-6 sm:pb-6">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <p id="blocked-date-label" className="text-sm font-medium leading-5 text-foreground">Date</p>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start font-normal"
                          aria-labelledby="blocked-date-label blocked-date-value"
                        >
                          <Calendar aria-hidden="true" />
                          <span id="blocked-date-value">{selectedDate ? format(selectedDate, "PPP") : "Select date"}</span>
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
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="block-reason">Reason <span className="font-normal text-muted-foreground">(optional)</span></Label>
                    <Input
                      id="block-reason"
                      name="blockReason"
                      placeholder="e.g., Court maintenance"
                      value={blockReason}
                      onChange={(e) => setBlockReason(e.target.value)}
                      maxLength={100}
                    />
                  </div>
                  <Button
                    onClick={handleAddBlockedDate}
                    disabled={!selectedDate || addBlockedDate.isPending}
                    className="w-full sm:col-span-2 sm:ml-auto sm:w-auto"
                  >
                    {addBlockedDate.isPending ? (
                      <Loader2 className="animate-spin motion-reduce:animate-none" aria-hidden="true" />
                    ) : (
                      <Plus aria-hidden="true" />
                    )}
                    {addBlockedDate.isPending ? "Blocking…" : "Block date"}
                  </Button>
                </div>

                <div className="border-t border-border pt-5">
                  <h3 className="text-sm font-semibold text-foreground">Upcoming blocked dates</h3>

                  {blockedDatesError ? (
                    <ErrorPanel
                      what="blocked dates"
                      description="The saved date exceptions could not be retrieved. No dates were changed."
                      onRetry={() => refetchBlockedDates()}
                      isRetrying={blockedDatesFetching}
                      className="py-6"
                    />
                  ) : blockedDatesLoading ? (
                    <div className="mt-3 space-y-2" role="status" aria-label="Loading blocked dates">
                      <Skeleton className="h-16 w-full" />
                      <Skeleton className="h-16 w-full" />
                    </div>
                  ) : blockedDates.length > 0 ? (
                    <ul className="mt-3 space-y-2" aria-live="polite">
                      {blockedDates.map((blocked) => {
                        const formattedDate = format(new Date(blocked.blocked_date), "MMM d, yyyy");
                        const isRemoving = removeBlockedDate.isPending && removeBlockedDate.variables?.id === blocked.id;

                        return (
                          <li
                            key={blocked.id}
                            className="flex min-h-16 items-center justify-between gap-3 rounded-lg border border-border bg-surface-1 py-2 pl-4 pr-2"
                          >
                            <div className="min-w-0">
                              <time dateTime={blocked.blocked_date} className="block text-sm font-semibold text-foreground">
                                {formattedDate}
                              </time>
                              <p className="mt-0.5 break-words text-xs text-muted-foreground">
                                {blocked.reason || "No reason added"}
                              </p>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemoveBlockedDate(blocked.id)}
                              disabled={isRemoving}
                              aria-label={`Remove the block on ${formattedDate}`}
                              className="shrink-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                            >
                              {isRemoving ? (
                                <Loader2 className="animate-spin motion-reduce:animate-none" aria-hidden="true" />
                              ) : (
                                <X aria-hidden="true" />
                              )}
                            </Button>
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <div className="mt-3 rounded-lg border border-dashed border-border px-4 py-8 text-center">
                      <Calendar className="mx-auto h-5 w-5 text-muted-foreground" aria-hidden="true" />
                      <p className="mt-2 text-sm font-medium text-foreground">No blocked dates</p>
                      <p className="mt-1 text-xs text-muted-foreground">Future dates you block will appear here.</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default VenueAvailabilityPage;
