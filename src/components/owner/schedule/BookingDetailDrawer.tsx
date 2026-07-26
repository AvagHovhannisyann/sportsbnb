import { format, parseISO } from "date-fns";
import { TONE_CHIP } from "@/lib/chips";
import {
  Calendar,
  Clock,
  Banknote,
  User,
  MapPin,
  MessageCircle,
  CheckCircle,
  XCircle,
  RefreshCw,
  } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { useState } from "react";
import { bookingStatusDescriptor, type BookingStatusTone } from "@/features/booking/status";

interface Booking {
  id: string;
  booking_date: string;
  booking_time: string;
  duration_hours: number;
  venue_name: string;
  total_price: number;
  status: string;
  customer_name?: string;
  customer_email?: string;
}

interface BookingDetailDrawerProps {
  booking: Booking | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm?: (id: string) => void;
  onCancel?: (id: string) => void;
  onReschedule?: (id: string) => void;
  onContact?: (id: string) => void;
}

export function BookingDetailDrawer({
  booking,
  open,
  onOpenChange,
  onConfirm,
  onCancel,
  onReschedule,
  onContact,
}: BookingDetailDrawerProps) {
  const [note, setNote] = useState("");

  if (!booking) return null;

  const bookingDate = parseISO(booking.booking_date);
  // Keyed by tone, like OwnerBookingsPage. This map knew three statuses out of
  // the ten the CHECK constraint allows, so everything in-app payment added
  // fell through to grey — and the label beside it printed the raw column,
  // giving an owner "Pending_payment" in a drawer they open on every booking.
  const toneClasses: Record<BookingStatusTone, string> = {
    positive: TONE_CHIP.positive,
    warning: TONE_CHIP.warning,
    danger: "bg-destructive/10 text-destructive",
    neutral: "bg-muted text-muted-foreground",
  };
  const status = bookingStatusDescriptor(booking.status);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center justify-between">
            <span>Booking Details</span>
            <Badge className={toneClasses[status.tone]}>{status.label}</Badge>
          </SheetTitle>
          <SheetDescription>
            Booking ID: {booking.id.slice(0, 8)}...
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Customer Info */}
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="font-medium text-foreground">
                {booking.customer_name || "Customer"}
              </p>
              <p className="text-sm text-muted-foreground">
                {booking.customer_email || "No email provided"}
              </p>
            </div>
          </div>

          <Separator />

          {/* Booking Details */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                <MapPin className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Venue</p>
                <p className="font-medium text-foreground">{booking.venue_name}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                <Calendar className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Date</p>
                <p className="font-medium text-foreground">
                  {format(bookingDate, "EEEE, MMMM d, yyyy")}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                <Clock className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Time & Duration</p>
                <p className="font-medium text-foreground">
                  {booking.booking_time} • {booking.duration_hours} hour
                  {booking.duration_hours > 1 ? "s" : ""}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                <Banknote className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Amount</p>
                <p className="font-medium text-foreground">
                  ֏{booking.total_price.toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Add Note */}
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">
              Add a note
            </label>
            <Textarea
              placeholder="Add internal notes about this booking..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="resize-none"
              rows={3}
            />
          </div>

          <Separator />

          {/* Actions */}
          <div className="space-y-3">
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => onContact?.(booking.id)}
            >
              <MessageCircle className="h-4 w-4 mr-2" />
              Contact Customer
            </Button>

            {/* Deliberately not widened to `pending_payment`. That status
                means the customer has a hold and has not paid; confirming it
                by hand would hand out a court for free, and Phase 2 revoked
                the client's UPDATE on booking status anyway — the payment
                callback is what confirms. Legacy `pending` predates payment
                and is still an owner decision. */}
            {booking.status === "pending" && (
              <Button
                className="w-full justify-start"
                onClick={() => onConfirm?.(booking.id)}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Confirm Booking
              </Button>
            )}

            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => onReschedule?.(booking.id)}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Reschedule
            </Button>

            {booking.status !== "cancelled" && (
              <Button
                variant="destructive"
                className="w-full justify-start"
                onClick={() => onCancel?.(booking.id)}
              >
                <XCircle className="h-4 w-4 mr-2" />
                Cancel Booking
              </Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default BookingDetailDrawer;
