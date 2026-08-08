import { useEffect, useRef, useState } from "react";
import { formatTimeOfDay } from "@/lib/time";
import {
  format,
  startOfWeek,
  addDays,
  addWeeks,
  subWeeks,
  isSameDay,
  parseISO,
  setHours,
} from "date-fns";
import { ChevronLeft, ChevronRight, Plus, Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { bookingStatusDescriptor } from "@/features/booking/status";

interface Booking {
  id: string;
  booking_date: string;
  booking_time: string;
  duration_hours: number;
  venue_name: string;
  total_price: number;
  status: string;
  customer_name?: string;
}

interface WeekCalendarProps {
  bookings: Booking[];
  // No `blockedSlots`. It was declared, defaulted and never read, and no caller
  // ever passed it — the residue of partial-day blocking, which the schema
  // cannot store (see BlockTimeDialog). Leaving the prop in place advertised a
  // capability this component does not have.
  blockedDates?: { blocked_date: string; reason?: string | null }[];
  openingHours?: { day_of_week: number; open_time: string; close_time: string; is_closed: boolean }[];
  onBookingClick?: (booking: Booking) => void;
  onNewBooking?: (date: Date, time: string) => void;
  onBlockTime?: (date: Date) => void;
  resourceName?: string;
}

const HOURS = Array.from({ length: 15 }, (_, i) => i + 6); // 6 AM to 8 PM

export function WeekCalendar({
  bookings,
  blockedDates = [],
  openingHours = [],
  onBookingClick,
  onNewBooking,
  onBlockTime,
  resourceName = "Court 1",
}: WeekCalendarProps) {
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const mobileAgendaRef = useRef<HTMLDivElement>(null);

  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 }); // Monday
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  useEffect(() => {
    // Begin a phone-sized week on the day that matters now. This is a
    // presentation-only position change: it runs after paint, never delays
    // input, and uses no animated travel (including with reduced motion).
    const frame = window.requestAnimationFrame(() => {
      const scroller = mobileAgendaRef.current;
      if (!scroller) return;

      const currentDay = scroller.querySelector<HTMLElement>('[data-current-day="true"]');
      const target = currentDay ?? scroller.querySelector<HTMLElement>("[data-calendar-day]");
      if (!target) return;

      const paddingLeft = Number.parseFloat(window.getComputedStyle(scroller).paddingLeft) || 0;
      scroller.scrollTo({
        left: Math.max(0, target.offsetLeft - scroller.offsetLeft - paddingLeft),
        behavior: "auto",
      });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [currentWeek]);

  const getBookingsForDay = (day: Date) => {
    return bookings.filter((b) => {
      const bookingDate = parseISO(b.booking_date);
      return isSameDay(bookingDate, day);
    });
  };

  const getBlockedForDay = (day: Date) => {
    return blockedDates.filter((b) => {
      const blockedDate = parseISO(b.blocked_date);
      return isSameDay(blockedDate, day);
    });
  };

  const isOutsideOpeningHours = (day: Date, hour: number) => {
    const dayOfWeek = day.getDay();
    const hours = openingHours.find((h) => h.day_of_week === dayOfWeek);
    if (!hours) return false;
    if (hours.is_closed) return true;
    
    const openHour = parseInt(hours.open_time.split(":")[0]);
    const closeHour = parseInt(hours.close_time.split(":")[0]);
    return hour < openHour || hour >= closeHour;
  };

  const isDayBlocked = (day: Date) => {
    return getBlockedForDay(day).length > 0;
  };

  const getOpeningHoursForDay = (day: Date) => {
    return openingHours.find((hours) => hours.day_of_week === day.getDay());
  };

  const statusClasses = {
    positive: "border-primary/25 bg-primary-soft text-primary",
    warning: "border-warning/25 bg-warning/10 text-warning",
    danger: "border-destructive/25 bg-destructive/10 text-destructive",
    neutral: "border-border bg-muted text-muted-foreground",
  } as const;

  return (
    <section className="overflow-hidden rounded-lg border border-border bg-card shadow-xs" aria-labelledby="week-calendar-heading">
      <div className="border-b border-border p-4 sm:p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="min-w-0">
            <h2 id="week-calendar-heading" className="truncate font-display text-lg font-semibold tracking-extra-tight text-foreground">
              {resourceName}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {format(weekStart, "MMM d")}–{format(addDays(weekStart, 6), "MMM d, yyyy")}
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            {(onBlockTime || onNewBooking) && (
              <div className="grid grid-cols-2 gap-2 sm:flex">
                {onBlockTime && (
                  <Button variant="outline" onClick={() => onBlockTime(new Date())}>
                    <Ban aria-hidden="true" />
                    Block day
                  </Button>
                )}
                {onNewBooking && (
                  <Button onClick={() => onNewBooking(new Date(), "09:00")}>
                    <Plus aria-hidden="true" />
                    New booking
                  </Button>
                )}
              </div>
            )}
            <div className="grid grid-cols-[2.75rem_minmax(4.5rem,1fr)_2.75rem] items-center rounded-lg border border-border bg-background sm:ml-1 sm:w-auto">
              <Button
                variant="ghost"
                size="icon"
                aria-label="Previous week"
                onClick={() => setCurrentWeek(subWeeks(currentWeek, 1))}
              >
                <ChevronLeft aria-hidden="true" />
              </Button>
              <Button
                variant="ghost"
                className="rounded-none px-3 text-xs"
                onClick={() => setCurrentWeek(new Date())}
              >
                Today
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Next week"
                onClick={() => setCurrentWeek(addWeeks(currentWeek, 1))}
              >
                <ChevronRight aria-hidden="true" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Phones use a day-by-day agenda. A seven-column time grid is still
          available from tablet width, where horizontal scroll is deliberate. */}
      <div className="md:hidden">
        <p className="border-b border-border bg-surface-1 px-4 py-2 text-xs text-muted-foreground">
          Swipe through each day of the week.
        </p>
        <div
          ref={mobileAgendaRef}
          className="flex snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain p-4"
          aria-label="Days in the selected week"
        >
          {weekDays.map((day) => {
            const dayBookings = getBookingsForDay(day);
            const blocks = getBlockedForDay(day);
            const dayHours = getOpeningHoursForDay(day);
            const blocked = blocks.length > 0;
            const today = isSameDay(day, new Date());

            return (
              <article
                key={day.toISOString()}
                data-calendar-day
                data-current-day={today ? "true" : "false"}
                className={cn(
                  "w-[82vw] max-w-72 shrink-0 snap-start rounded-lg border bg-background p-4",
                  today ? "border-primary/40" : "border-border",
                )}
              >
                <header className="flex items-start justify-between gap-3 border-b border-border pb-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{format(day, "EEEE")}</p>
                    <h3 className="mt-0.5 font-display text-lg font-semibold tracking-extra-tight text-foreground">
                      {format(day, "MMM d")}
                    </h3>
                  </div>
                  {today && <Badge>Today</Badge>}
                </header>

                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  <span className="rounded-full border border-border bg-surface-1 px-2.5 py-1 text-muted-foreground">
                    {!dayHours
                      ? "Hours not set"
                      : dayHours.is_closed
                        ? "Closed all day"
                        : `${formatTimeOfDay(dayHours.open_time)}–${formatTimeOfDay(dayHours.close_time)}`}
                  </span>
                  {blocked && (
                    <span className="rounded-full border border-destructive/25 bg-destructive/10 px-2.5 py-1 font-medium text-destructive">
                      Blocked all day
                    </span>
                  )}
                </div>

                {blocked && blocks[0]?.reason && (
                  <p className="mt-3 rounded-lg bg-destructive/5 px-3 py-2 text-xs leading-relaxed text-destructive">
                    {blocks[0].reason}
                  </p>
                )}

                <div className="mt-3 space-y-2">
                  {dayBookings.length > 0 ? (
                    dayBookings.map((booking) => {
                      const bookingStatus = bookingStatusDescriptor(booking.status);
                      return (
                        <button
                          key={booking.id}
                          type="button"
                          disabled={!onBookingClick}
                          onClick={() => onBookingClick?.(booking)}
                          className="min-h-16 w-full rounded-lg border border-border bg-card p-3 text-left shadow-xs transition-[background-color,border-color,box-shadow] duration-150 hover:border-foreground/25 hover:bg-surface-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-default motion-reduce:transition-none"
                        >
                          <span className="flex items-start justify-between gap-2">
                            <span className="min-w-0">
                              <span className="block truncate text-sm font-semibold text-foreground">
                                {booking.customer_name || "Booking"}
                              </span>
                              <span className="mt-0.5 block text-xs text-muted-foreground">
                                {formatTimeOfDay(booking.booking_time)} · {booking.duration_hours} hour{booking.duration_hours !== 1 ? "s" : ""}
                              </span>
                            </span>
                            <span className={cn("shrink-0 rounded-full border px-2 py-1 text-xs font-semibold", statusClasses[bookingStatus.tone])}>
                              {bookingStatus.label}
                            </span>
                          </span>
                        </button>
                      );
                    })
                  ) : (
                    <div className="rounded-lg border border-dashed border-border px-3 py-6 text-center">
                      <p className="text-sm font-medium text-foreground">No bookings</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {blocked || dayHours?.is_closed ? "This day is unavailable." : "No customers are scheduled."}
                      </p>
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </div>

      <div className="hidden overflow-x-auto overscroll-x-contain outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring md:block" tabIndex={0} aria-label="Weekly schedule grid; scroll horizontally to see all days">
        <div className="min-w-[900px]">
          <div className="grid grid-cols-[64px_repeat(7,1fr)] border-b border-border bg-surface-1">
            <div className="p-2 text-xs font-medium text-muted-foreground" aria-hidden="true" />
            {weekDays.map((day) => {
              const blockedDay = getBlockedForDay(day)[0];

              return (
                <div
                  key={day.toISOString()}
                  className={cn(
                    "border-l border-border p-3 text-center",
                    isSameDay(day, new Date()) && "bg-primary-soft",
                  )}
                >
                  <div className="text-xs font-medium text-muted-foreground">{format(day, "EEE")}</div>
                  <div className={cn("mt-1 text-lg font-semibold", isSameDay(day, new Date()) ? "text-primary" : "text-foreground")}>
                    {format(day, "d")}
                  </div>
                  {blockedDay && (
                    <span
                      className="mt-1 inline-flex rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-semibold text-destructive"
                      title={blockedDay.reason || "Blocked all day"}
                    >
                      Blocked
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          <div className="relative">
            {HOURS.map((hour) => (
              <div key={hour} className="grid grid-cols-[64px_repeat(7,1fr)] border-b border-border/70">
                <div className="px-2 py-4 pr-3 text-right text-xs tabular-nums text-muted-foreground">
                  {format(setHours(new Date(), hour), "h a")}
                </div>
                {weekDays.map((day) => {
                  const dayBookings = getBookingsForDay(day).filter((booking) => {
                    const bookingHour = parseInt(booking.booking_time.split(":")[0]);
                    return bookingHour === hour;
                  });
                  const blocked = isDayBlocked(day);
                  const closed = isOutsideOpeningHours(day, hour);

                  return (
                    <div
                      key={`${day.toISOString()}-${hour}`}
                      className={cn(
                        "relative min-h-[60px] border-l border-border/70",
                        isSameDay(day, new Date()) && "bg-primary-soft/45",
                        blocked && "bg-destructive/5",
                        closed && "bg-surface-1",
                      )}
                    >
                      {dayBookings.map((booking) => {
                        const tone = bookingStatusDescriptor(booking.status).tone;
                        return (
                          <button
                            key={booking.id}
                            type="button"
                            disabled={!onBookingClick}
                            onClick={() => onBookingClick?.(booking)}
                            className={cn(
                              "absolute left-1 right-1 z-10 cursor-pointer overflow-hidden rounded-md border p-2 text-left shadow-xs transition-[box-shadow,border-color] duration-150 hover:ring-2 hover:ring-ring/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none",
                              tone === "positive" && "border-primary/30 bg-primary text-primary-foreground",
                              tone === "warning" && "border-warning/30 bg-warning/15 text-warning",
                              tone === "danger" && "border-destructive/30 bg-destructive/15 text-destructive",
                              tone === "neutral" && "border-border bg-muted text-muted-foreground",
                            )}
                            style={{ top: "2px", height: `${booking.duration_hours * 60 - 4}px` }}
                          >
                            <span className="sr-only">{bookingStatusDescriptor(booking.status).label}: </span>
                            <span className="block truncate text-xs font-semibold">{booking.customer_name || "Booking"}</span>
                            <span className="block truncate text-xs opacity-80">
                              {formatTimeOfDay(booking.booking_time)} · {booking.venue_name}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="hidden flex-wrap items-center gap-x-5 gap-y-2 border-t border-border bg-surface-1 px-4 py-3 md:flex" aria-label="Schedule legend">
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-sm bg-primary" aria-hidden="true" />
          <span className="text-xs text-muted-foreground">Confirmed</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-sm border border-warning/50 bg-warning/20" aria-hidden="true" />
          <span className="text-xs text-muted-foreground">Awaiting action</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-sm bg-destructive/25" aria-hidden="true" />
          <span className="text-xs text-muted-foreground">Blocked day</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-sm border border-border bg-surface-3" aria-hidden="true" />
          <span className="text-xs text-muted-foreground">Closed hours</span>
        </div>
      </div>
    </section>
  );
}

export default WeekCalendar;
