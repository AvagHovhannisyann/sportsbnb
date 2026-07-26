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

      // Create the booking
      const { error: insertError } = await supabase.from("bookings").insert({
        venue_id: venueId,
        venue_name: selectedVenue?.name || "",
        booking_date: bookingDate,
        booking_time: startTime,
        duration_hours: parseFloat(duration),
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
        if (insertError.code === '23505') {
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
    } catch (error: any) {
      console.error("Error creating booking:", error);
      toast.error(error.message || "Failed to create booking");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-primary" />
            New Manual Booking
          </DialogTitle>
          <DialogDescription>
            Create a booking on behalf of a customer
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
          {/* Venue */}
          <div className="space-y-2">
            <Label>Venue *</Label>
            <Select value={venueId} onValueChange={setVenueId}>
              <SelectTrigger>
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

          {/* Date */}
          <div className="space-y-2">
            <Label>Date *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "PPP") : "Select date"}
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

          {/* Time & Duration */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Time *</Label>
              <Select value={startTime} onValueChange={setStartTime}>
                <SelectTrigger>
                  <Clock className="h-4 w-4 mr-2" />
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
              <Label>Duration *</Label>
              <Select value={duration} onValueChange={setDuration}>
                <SelectTrigger>
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

          {/* Customer Info */}
          <div className="space-y-2">
            <Label>Customer Name *</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="John Smith"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Phone (optional)</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="+1 234 567 8900"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Email (optional)</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder="john@example.com"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </div>

          {/* Price */}
          <div className="space-y-2">
            <Label>Total Price</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">֏</span>
              <Input
                type="number"
                value={price}
                onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
                className="pl-8"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Auto-calculated based on venue rate. Adjust if needed.
            </p>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Notes (optional)</Label>
            <Textarea
              placeholder="Internal notes about this booking..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || !venueId || !customerName}>
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              "Create Booking"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default ManualBookingDialog;
