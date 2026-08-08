import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Clock, User, Phone, Mail, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { venueLocalToInstant, addHoursToInstant } from "@/lib/venueTime";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useQueryClient } from "@tanstack/react-query";

interface Venue {
  id: string;
  name: string;
  price_per_hour: number;
}

interface ManualBookingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  venues: Venue[];
  selectedVenueId?: string | null;
  onBookingCreated?: () => void;
}

const TIME_OPTIONS = Array.from({ length: 30 }, (_, i) => {
  const hour = Math.floor(i / 2) + 6; // 6 AM to 8 PM
  const minute = i % 2 === 0 ? "00" : "30";
  return `${hour.toString().padStart(2, "0")}:${minute}`;
});

const DURATION_OPTIONS = [
  { value: "0.5", label: "30 minutes" },
  { value: "1", label: "1 hour" },
  { value: "1.5", label: "1.5 hours" },
  { value: "2", label: "2 hours" },
  { value: "3", label: "3 hours" },
  { value: "4", label: "4 hours" },
];

export function ManualBookingDialog({
  open,
  onOpenChange,
  venues,
  selectedVenueId,
  onBookingCreated,
}: ManualBookingDialogProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [venueId, setVenueId] = useState<string>(selectedVenueId || "");
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [startTime, setStartTime] = useState("10:00");
  const [duration, setDuration] = useState("1");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [price, setPrice] = useState(0);
  const [notes, setNotes] = useState("");

  // Update venue when prop changes
  useEffect(() => {
    if (selectedVenueId) {
      setVenueId(selectedVenueId);
    }
  }, [selectedVenueId]);

  // Auto-calculate price when venue or duration changes
  useEffect(() => {
    const venue = venues.find((v) => v.id === venueId);
    if (venue) {
      const hours = parseFloat(duration);
      setPrice(venue.price_per_hour * hours);
    }
  }, [venueId, duration, venues]);

  const selectedVenue = venues.find((v) => v.id === venueId);

  const handleSubmit = async () => {
    if (!venueId || !date || !customerName) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsSubmitting(true);

    try {
      // Check for overlapping bookings
      const bookingDate = format(date, "yyyy-MM-dd");
      const { data: existingBookings, error: checkError } = await supabase
        .from("bookings")
        .select("id, booking_time, duration_hours")
        .eq("venue_id", venueId)
        .eq("booking_date", bookingDate)
        .neq("status", "cancelled");

      if (checkError) throw checkError;

      // Check for time overlap
      const newStart = parseFloat(startTime.replace(":", "."));
      const newEnd = newStart + parseFloat(duration);

      const hasOverlap = existingBookings?.some((booking) => {
        const existingStart = parseFloat(booking.booking_time.replace(":", "."));
        const existingEnd = existingStart + booking.duration_hours;
        return (newStart < existingEnd && newEnd > existingStart);
      });

      if (hasOverlap) {
        toast.error("This time slot overlaps with an existing booking");
        setIsSubmitting(false);
        return;
      }

      /**
       * `venue_uuid`, `starts_at` and `ends_at` are what make this booking
       * visible to everyone else, and they were all left NULL.
       *
       * `get_available_slots` matches on `b.venue_uuid = p_venue_id` and
       * `tstzrange(b.starts_at, b.ends_at) && …`, and the `bookings_no_overlap`
       * exclusion constraint is built over the same three columns. A row with
       * NULLs in them is in neither: it falls out of the partial index and out
       * of the availability query. So an owner adding a walk-in for Saturday
       * 18:00 did not take 18:00 off the site — a player was still offered it,
       * could hold it without the constraint raising `slot_taken`, and could
       * pay for it. Two parties, one court, and nothing anywhere errored.
       *
       * The blindness was one-directional, which is why it survived: the
       * dialog's own overlap check above queries by `venue_id`, so the owner
       * *did* see player bookings. Only the player-facing direction was blind.
       *
       * Converted through `venueLocalToInstant` rather than `new Date(...)`,
       * because the RPCs interpret these as Yerevan wall-clock and `new Date`
       * would interpret them in whatever zone the owner's laptop is set to.
       */
      const startsAt = venueLocalToInstant(bookingDate, startTime);
      const endsAt = startsAt ? addHoursToInstant(startsAt, parseFloat(duration)) : null;
      if (!startsAt || !endsAt) {
        toast.error("Couldn't read that date and time — please re-enter them.");
        setIsSubmitting(false);
        return;
      }

      // Create the booking
      const { error: insertError } = await supabase.from("bookings").insert({
        venue_id: venueId,
        venue_uuid: venueId,
        venue_name: selectedVenue?.name || "",
        booking_date: bookingDate,
        booking_time: startTime,
        duration_hours: parseFloat(duration),
        starts_at: startsAt,
        ends_at: endsAt,
        total_price: price,
        status: "confirmed",
        user_id: user?.id, // Will be the owner creating it
        source: "manual",
        created_by_owner_id: user?.id,
        customer_name: customerName,
        customer_phone: customerPhone || null,
        customer_email: customerEmail || null,
        notes: notes || null,
      });

      if (insertError) {
        // 23P01 as well as 23505. Now that the row carries `starts_at`/`ends_at`
        // it is covered by `bookings_no_overlap`, which is an EXCLUDE
        // constraint — Postgres reports those as `exclusion_violation` (23P01),
        // not `unique_violation` (23505). Checking only the latter would have
        // thrown a raw database error at an owner for the one collision this
        // change exists to start catching: a player holding the slot between
        // the overlap check above and this insert.
        if (insertError.code === "23505" || insertError.code === "23P01") {
          toast.error("This time slot was just booked. Please select another time.");
          setIsSubmitting(false);
          return;
        }
        throw insertError;
      }

      toast.success("Booking created successfully!");
      
      // Reset form
      setCustomerName("");
      setCustomerPhone("");
      setCustomerEmail("");
      setNotes("");
      setDate(new Date());
      setStartTime("10:00");
      setDuration("1");

      // Refresh data
      queryClient.invalidateQueries({ queryKey: ["owner-analytics"] });
      onBookingCreated?.();
      onOpenChange(false);
    } catch (error: unknown) {
      console.error("Error creating booking:", error);
      const message =
        typeof error === "object" &&
        error !== null &&
        "message" in error &&
        typeof error.message === "string"
          ? error.message
          : "Failed to create booking";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-primary" aria-hidden="true" />
            New manual booking
          </DialogTitle>
          <DialogDescription>
            Reserve a venue for a walk-in, phone, or offline customer.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[60vh] space-y-5 overflow-y-auto overscroll-contain py-2 pr-1">
          <div className="space-y-2">
            <Label id="manual-venue-label">Venue <span aria-hidden="true">*</span></Label>
            <Select value={venueId} onValueChange={setVenueId}>
              <SelectTrigger aria-labelledby="manual-venue-label" aria-required="true">
                <SelectValue placeholder="Select venue" />
              </SelectTrigger>
              <SelectContent>
                {venues.map((venue) => (
                  <SelectItem key={venue.id} value={venue.id}>
                    {venue.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <p id="manual-date-label" className="text-sm font-medium leading-5 text-foreground">
              Date <span aria-hidden="true">*</span>
            </p>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  aria-labelledby="manual-date-label manual-date-value"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon aria-hidden="true" />
                  <span id="manual-date-value">{date ? format(date, "PPP") : "Select date"}</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label id="manual-time-label">Start time <span aria-hidden="true">*</span></Label>
              <Select value={startTime} onValueChange={setStartTime}>
                <SelectTrigger aria-labelledby="manual-time-label" aria-required="true">
                  <Clock aria-hidden="true" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIME_OPTIONS.map((time) => (
                    <SelectItem key={time} value={time}>
                      {time}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label id="manual-duration-label">Duration <span aria-hidden="true">*</span></Label>
              <Select value={duration} onValueChange={setDuration}>
                <SelectTrigger aria-labelledby="manual-duration-label" aria-required="true">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DURATION_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="manual-customer-name">Customer name <span aria-hidden="true">*</span></Label>
            <div className="relative">
              <User className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <Input
                id="manual-customer-name"
                name="customerName"
                autoComplete="name"
                placeholder="John Smith"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="pl-10"
                aria-required="true"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="manual-customer-phone">Phone <span className="font-normal text-muted-foreground">(optional)</span></Label>
              <div className="relative">
                <Phone className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                <Input
                  id="manual-customer-phone"
                  name="customerPhone"
                  type="tel"
                  autoComplete="tel"
                  placeholder="+1 234 567 8900"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="manual-customer-email">Email <span className="font-normal text-muted-foreground">(optional)</span></Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                <Input
                  id="manual-customer-email"
                  name="customerEmail"
                  type="email"
                  autoComplete="email"
                  placeholder="john@example.com"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="manual-total-price">Total price</Label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" aria-hidden="true">֏</span>
              <Input
                id="manual-total-price"
                name="totalPrice"
                type="number"
                inputMode="decimal"
                value={price}
                onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
                className="pl-9 tabular-nums"
                aria-describedby="manual-price-hint"
              />
            </div>
            <p id="manual-price-hint" className="text-xs text-muted-foreground">
              Auto-calculated based on venue rate. Adjust if needed.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="manual-booking-notes">Notes <span className="font-normal text-muted-foreground">(optional)</span></Label>
            <Textarea
              id="manual-booking-notes"
              name="notes"
              placeholder="Internal notes about this booking..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" className="w-full sm:w-auto" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button className="w-full sm:w-auto" onClick={handleSubmit} disabled={isSubmitting || !venueId || !customerName}>
            {isSubmitting ? (
              <>
                <Loader2 className="animate-spin motion-reduce:animate-none" aria-hidden="true" />
                Creating…
              </>
            ) : (
              "Create booking"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default ManualBookingDialog;
