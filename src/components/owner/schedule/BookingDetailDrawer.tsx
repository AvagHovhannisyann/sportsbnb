import { format, parseISO } from "date-fns";
import { formatTimeOfDay } from "@/lib/time";
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { bookingStatusDescriptor, type BookingStatusTone } from "@/features/booking/status";
import { Price } from "@/components/ui/price";

interface Booking {
  id: string;
  booking_date: string;
  booking_time: string;
  duration_hours: number;
  venue_name: string;
  total_price: number;
  status: string;
  customer_name?: string | null;
  customer_email?: string | null;
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
  if (!booking) return null;

  const bookingDate = parseISO(booking.booking_date);
  // Keyed by tone, like OwnerBookingsPage. This map knew three statuses out of
  // the ten the CHECK constraint allows, so everything in-app payment added
  // fell through to grey — and the label beside it printed the raw column,
  // giving an owner "Pending_payment" in a drawer they open on every booking.
  const toneClasses: Record<BookingStatusTone, string> = {
    positive: TONE_CHIP.positive,
    warning: TONE_CHIP.warning,
    danger: TONE_CHIP.danger,
    neutral: TONE_CHIP.neutral,
  };
  const status = bookingStatusDescriptor(booking.status);
  const hasActions =
    !!onContact ||
    !!onReschedule ||
    !!onCancel ||
    (booking.status === "pending" && !!onConfirm);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <Badge className={`w-fit ${toneClasses[status.tone]}`}>{status.label}</Badge>
          <SheetTitle>Booking details</SheetTitle>
          <SheetDescription className="font-mono text-xs">
            Booking {booking.id.slice(0, 8)}…
          </SheetDescription>
        </SheetHeader>

        <div className="mt-3 space-y-5">
          <section aria-labelledby="booking-customer-heading" className="rounded-lg border border-border bg-surface-1 p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-primary shadow-xs">
                <User className="h-5 w-5" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <h3 id="booking-customer-heading" className="font-semibold text-foreground">
                  {booking.customer_name || "Customer name not provided"}
                </h3>
                <p className="mt-0.5 break-all text-sm text-muted-foreground">
                  {booking.customer_email || "No email provided"}
                </p>
              </div>
            </div>
          </section>

          <Separator />

          <section aria-labelledby="booking-summary-heading">
            <h3 id="booking-summary-heading" className="mb-3 text-sm font-semibold text-foreground">Reservation summary</h3>
            <dl className="divide-y divide-border rounded-lg border border-border bg-card">
              <div className="flex gap-3 p-3.5">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                <div className="min-w-0">
                  <dt className="text-xs text-muted-foreground">Venue</dt>
                  <dd className="mt-0.5 break-words text-sm font-medium text-foreground">{booking.venue_name}</dd>
                </div>
              </div>
              <div className="flex gap-3 p-3.5">
                <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                <div>
                  <dt className="text-xs text-muted-foreground">Date</dt>
                  <dd className="mt-0.5 text-sm font-medium text-foreground">{format(bookingDate, "EEEE, MMMM d, yyyy")}</dd>
                </div>
              </div>
              <div className="flex gap-3 p-3.5">
                <Clock className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                <div>
                  <dt className="text-xs text-muted-foreground">Time &amp; duration</dt>
                  <dd className="mt-0.5 text-sm font-medium text-foreground">
                    {formatTimeOfDay(booking.booking_time)} · {booking.duration_hours} hour{booking.duration_hours !== 1 ? "s" : ""}
                  </dd>
                </div>
              </div>
              <div className="flex gap-3 p-3.5">
                <Banknote className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                <div>
                  <dt className="text-xs text-muted-foreground">Total amount</dt>
                  <dd className="mt-0.5 text-sm font-semibold text-foreground"><Price amount={booking.total_price} /></dd>
                </div>
              </div>
            </dl>
          </section>

          {hasActions && (
            <>
              <Separator />
              <section aria-labelledby="booking-actions-heading" className="space-y-2">
                <h3 id="booking-actions-heading" className="mb-3 text-sm font-semibold text-foreground">Booking actions</h3>
                {onContact && (
                  <Button variant="outline" className="w-full justify-start" onClick={() => onContact(booking.id)}>
                    <MessageCircle aria-hidden="true" />
                    Contact customer
                  </Button>
                )}

                {/* Deliberately not widened to `pending_payment`. That status
                    is confirmed only by the payment callback. */}
                {booking.status === "pending" && onConfirm && (
                  <Button className="w-full justify-start" onClick={() => onConfirm(booking.id)}>
                    <CheckCircle aria-hidden="true" />
                    Confirm booking
                  </Button>
                )}

                {onReschedule && (
                  <Button variant="outline" className="w-full justify-start" onClick={() => onReschedule(booking.id)}>
                    <RefreshCw aria-hidden="true" />
                    Reschedule
                  </Button>
                )}

                {booking.status !== "cancelled" && onCancel && (
                  <Button variant="destructive" className="w-full justify-start" onClick={() => onCancel(booking.id)}>
                    <XCircle aria-hidden="true" />
                    Cancel booking
                  </Button>
                )}
              </section>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default BookingDetailDrawer;
