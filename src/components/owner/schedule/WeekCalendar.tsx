import { useState } from "react";
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

interface _RemovedBlockedSlot {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  reason?: string;
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

  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 }); // Monday
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

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

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-4">
          <h2 className="font-semibold text-foreground">{resourceName}</h2>
          <Badge variant="outline" className="text-xs">
            {format(weekStart, "MMM d")} - {format(addDays(weekStart, 6), "MMM d, yyyy")}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onBlockTime ? () => onBlockTime(new Date()) : undefined}>
            <Ban className="h-4 w-4 mr-2" />
            Block Time
          </Button>
          <Button size="sm" onClick={onNewBooking ? () => onNewBooking(new Date(), "09:00") : undefined}>
            <Plus className="h-4 w-4 mr-2" />
            New Booking
          </Button>
          <div className="flex items-center border border-border rounded-lg ml-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              aria-label="Previous week"
              onClick={() => setCurrentWeek(subWeeks(currentWeek, 1))}
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs"
              onClick={() => setCurrentWeek(new Date())}
            >
              Today
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              aria-label="Next week"
              onClick={() => setCurrentWeek(addWeeks(currentWeek, 1))}
            >
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="overflow-x-auto">
        <div className="min-w-[800px]">
          {/* Day headers */}
          <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-border">
            <div className="p-2 text-xs font-medium text-muted-foreground" />
            {weekDays.map((day) => (
              <div
                key={day.toISOString()}
                className={cn(
                  "p-3 text-center border-l border-border",
                  isSameDay(day, new Date()) && "bg-primary/5"
                )}
              >
                <div className="text-xs font-medium text-muted-foreground">
                  {format(day, "EEE")}
                </div>
                <div
                  className={cn(
                    "text-lg font-semibold mt-1",
                    isSameDay(day, new Date())
                      ? "text-primary"
                      : "text-foreground"
                  )}
                >
                  {format(day, "d")}
                </div>
              </div>
            ))}
          </div>

          {/* Time grid */}
          <div className="relative">
            {HOURS.map((hour) => (
              <div
                key={hour}
                className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-border/50"
              >
                <div className="p-2 text-xs text-muted-foreground text-right pr-3 py-4">
                  {format(setHours(new Date(), hour), "h a")}
                </div>
                {weekDays.map((day) => {
                  const dayBookings = getBookingsForDay(day).filter((b) => {
                    const bookingHour = parseInt(b.booking_time.split(":")[0]);
                    return bookingHour === hour;
                  });

                  const isBlocked = isDayBlocked(day);
                  const isClosed = isOutsideOpeningHours(day, hour);

                  return (
                    <div
                      key={`${day.toISOString()}-${hour}`}
                      className={cn(
                        "border-l border-border/50 min-h-[60px] relative",
                        isSameDay(day, new Date()) && "bg-primary/5",
                        isBlocked && "bg-destructive/10",
                        isClosed && "bg-muted/50 cursor-not-allowed"
                      )}
                    >
                      {dayBookings.map((booking) => (
                        <button
                          key={booking.id}
                          type="button"
                          /* Was a div: every booking on the owner's week was
                             mouse-only, and the calendar is the page they run
                             their day from. A real button also names itself
                             from its contents. */
                          onClick={() => onBookingClick?.(booking)}
                          className={cn(
                            "absolute left-1 right-1 rounded-md p-2 text-left cursor-pointer transition-all hover:ring-2 hover:ring-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                            /* Tone-driven, so `pending_payment` reads as
                               awaiting rather than falling through to the grey
                               used for cancelled and expired. It matched only
                               the legacy `pending`, which made an unpaid hold
                               look settled on the owner's own calendar. */
                            {
                              positive: "bg-primary text-primary-foreground",
                              /* Was `bg-amber-500 text-white` — 2.15:1, and
                                 this block carries the customer's name and
                                 time. Tinted like `danger` rather than filled,
                                 which also keeps an unpaid hold visually
                                 lighter than a confirmed booking. */
                              warning: "bg-warning/20 text-warning",
                              danger: "bg-destructive/20 text-destructive",
                              neutral: "bg-muted text-muted-foreground",
                            }[bookingStatusDescriptor(booking.status).tone]
                          )}
                          style={{
                            top: "2px",
                            height: `${booking.duration_hours * 60 - 4}px`,
                          }}
                        >
                          <div className="text-xs font-medium truncate">
                            {booking.customer_name || "Booking"}
                          </div>
                          <div className="text-xs opacity-80 truncate">
                            {formatTimeOfDay(booking.booking_time)} • {booking.venue_name}
                          </div>
                        </button>
                      ))}
                      {isBlocked && !isClosed && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-xs text-destructive/70">Blocked</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 p-3 border-t border-border bg-muted/30">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-primary" />
          <span className="text-xs text-muted-foreground">Confirmed</span>
        </div>
        <div className="flex items-center gap-2">
          {/* Follows the block above: a legend swatch that does not match the
              thing it labels is worse than no legend. */}
          <div className="w-3 h-3 rounded bg-warning/20 ring-1 ring-warning/50" />
          <span className="text-xs text-muted-foreground">Pending</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-destructive/30" />
          <span className="text-xs text-muted-foreground">Blocked</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-muted" />
          <span className="text-xs text-muted-foreground">Closed</span>
        </div>
      </div>
    </div>
  );
}

export default WeekCalendar;
