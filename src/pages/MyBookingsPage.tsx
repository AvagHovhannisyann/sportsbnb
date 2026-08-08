import { useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, CalendarCheck, Clock, MapPin, Loader2 } from "lucide-react";
import Layout from "@/components/layout/Layout";
import SEOHead from "@/components/seo/SEOHead";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorPanel } from "@/components/common/StatusPanel";
import { Skeleton } from "@/components/ui/skeleton";
import { TONE_CHIP } from "@/lib/chips";
import { formatTimeOfDay } from "@/lib/time";
import { useAuth } from "@/hooks/useAuth";
import { useMyBookings, type MyBooking } from "@/features/booking/hooks/useMyBookings";
import { isUpcoming } from "@/features/booking/upcoming";
import { bookingStatusDescriptor } from "@/features/booking/status";
import { formatAmd } from "@/features/booking/hooks/useBookingFlow";
import { format } from "date-fns";
import { atVenue } from "@/lib/venueTime";

const toneClasses = TONE_CHIP;

/** The day a booking is on, from whichever column the row actually has. */
function bookingDay(booking: MyBooking): string {
  const source = booking.starts_at ?? booking.booking_date;
  if (!source) return "Date unknown";
  // `atVenue` for a real instant; the legacy date-only column is already a
  // venue-local calendar date, so it is read as civil time rather than shifted.
  const date = booking.starts_at ? atVenue(source) : new Date(`${source}T00:00:00`);
  return Number.isNaN(date.valueOf()) ? "Date unknown" : format(date, "EEE d MMM yyyy");
}

function bookingTime(booking: MyBooking): string {
  if (booking.starts_at) {
    const start = new Date(booking.starts_at);
    if (!Number.isNaN(start.valueOf())) return format(atVenue(start), "HH:mm");
  }
  return formatTimeOfDay(booking.booking_time) || "—";
}

/**
 * What the player paid. `amount_minor` is the Phase 2 column in minor units;
 * `total_price` is the legacy major-unit one, kept for rows written before it.
 */
function bookingAmount(booking: MyBooking): string {
  if (booking.amount_minor != null) return formatAmd(booking.amount_minor);
  if (booking.total_price) return formatAmd(Math.round(booking.total_price * 100));
  return "—";
}

const BookingRow = ({ booking }: { booking: MyBooking }) => {
  const { label, tone } = bookingStatusDescriptor(booking.status, "player");
  return (
    <Card className="overflow-hidden">
      <CardContent className="grid gap-4 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:p-5">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <h3 className="min-w-0 truncate font-display text-base font-semibold tracking-tight text-foreground">
              {booking.venue_name}
            </h3>
            <Badge className={toneClasses[tone]}>{label}</Badge>
          </div>
          <dl className="mt-3 grid gap-x-5 gap-y-2 text-sm text-muted-foreground sm:grid-cols-[minmax(0,1fr)_auto_auto]">
            <div className="flex min-w-0 items-center gap-2">
              <CalendarCheck className="h-4 w-4 shrink-0 text-foreground-soft" aria-hidden="true" />
              <dt className="sr-only">Date</dt>
              <dd className="truncate">{bookingDay(booking)}</dd>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 shrink-0 text-foreground-soft" aria-hidden="true" />
              <dt className="sr-only">Time and duration</dt>
              <dd className="whitespace-nowrap tabular-nums">
                {bookingTime(booking)} · {booking.duration_hours}h
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3 border-t border-border pt-2 sm:border-0 sm:pt-0">
              <dt className="font-medium text-muted-foreground sm:sr-only">Paid</dt>
              <dd className="whitespace-nowrap font-semibold tabular-nums text-foreground">{bookingAmount(booking)}</dd>
            </div>
          </dl>
        </div>
        <div className="flex shrink-0 gap-2 border-t border-border pt-3 sm:border-0 sm:pt-0">
          {booking.venue_uuid && (
            <Button asChild variant="ghost" size="sm" className="h-11 flex-1 sm:flex-none">
              <Link to={`/venue/${booking.venue_uuid}`} aria-label={`View ${booking.venue_name}`}>
                <MapPin className="h-4 w-4" aria-hidden="true" />
                Venue
              </Link>
            </Button>
          )}
          <Button asChild variant="outline" size="sm" className="h-11 flex-1 sm:flex-none">
            {/* The accessible name has to say *which* booking, or a screen
                reader hears "Details, Details, Details" down the whole list. */}
            <Link
              to={`/booking/${booking.id}/status`}
              aria-label={`Details for ${booking.venue_name} on ${bookingDay(booking)}`}
            >
              Details
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

/**
 * The bookings a player has made.
 *
 * This page did not exist. `/booking/:id/status` showed one booking to whoever
 * already had its id; the dashboard tile reading "Confirmed bookings" counted
 * `booking_intents`, the WhatsApp handoff retired when in-app payment landed;
 * and the checkout error panel's "View my bookings" pointed at `/my-activity`,
 * a tab id inside CommunityPage that has never been a route. So a player could
 * pay for a court and have nowhere in the app that listed it —
 * `scripts/dead-routes.mjs` found the broken link, and the missing page behind
 * it was the actual defect.
 */
const MyBookingsPage = () => {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const { data: bookings = [], isLoading, isError, refetch, isFetching } = useMyBookings(user?.id);

  const { upcoming, past } = useMemo(() => {
    const now = new Date();
    return {
      upcoming: bookings.filter((b) => isUpcoming(b, now)),
      past: bookings.filter((b) => !isUpcoming(b, now)),
    };
  }, [bookings]);

  if (authLoading || isLoading) {
    return (
      <Layout>
        <div className="container max-w-4xl px-4 py-7 sm:px-6 sm:py-10">
          <div className="mb-7">
            <p className="text-eyebrow mb-2">Player account</p>
            <h1 className="page-title">My bookings</h1>
            <p className="text-muted-foreground">Track every court you have reserved and what happens next.</p>
          </div>
          <div className="space-y-3" role="status" aria-label="Loading your bookings">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-40 w-full rounded-lg sm:h-28" />
            ))}
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <SEOHead title="My bookings — Sportsbnb" description="The courts you have booked." noIndex />
      <div className="container max-w-4xl px-4 py-7 sm:px-6 sm:py-10">
        <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-eyebrow mb-2">Player account</p>
            <h1 className="page-title">My bookings</h1>
            <p className="max-w-xl leading-relaxed text-muted-foreground">
              Track every court you have reserved and what happens next.
            </p>
          </div>
          <Button variant="ghost" className="h-11 self-start sm:self-auto" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Dashboard
          </Button>
        </div>

        {/* A failed request is not an empty history. "You haven't booked
            anything yet" is a claim about someone's own money, and making it
            because a query fell over is the case error-affordance.mjs exists
            for. */}
        {isError ? (
          <Card>
            <ErrorPanel
              what="your bookings"
              description="We couldn't load them. Nothing has changed — try again in a moment."
              onRetry={() => refetch()}
              isRetrying={isFetching}
            />
          </Card>
        ) : bookings.length === 0 ? (
          <EmptyState
            icon={CalendarCheck}
            title="No bookings yet"
            description="Once you book a court it will show up here, with its status and what you paid."
            actionLabel="Find a venue"
            actionHref="/venues"
            bordered
          />
        ) : (
          <div className="space-y-10">
            {upcoming.length > 0 && (
              <section aria-labelledby="upcoming-heading">
                <div className="mb-3 flex items-center justify-between gap-4">
                  <h2 id="upcoming-heading" className="font-display text-xl font-semibold tracking-tight text-foreground">
                    Upcoming
                  </h2>
                  <span className="text-sm tabular-nums text-muted-foreground">
                    {upcoming.length} {upcoming.length === 1 ? "booking" : "bookings"}
                  </span>
                </div>
                <div className="space-y-3">
                  {upcoming.map((b) => (
                    <BookingRow key={b.id} booking={b} />
                  ))}
                </div>
              </section>
            )}
            {past.length > 0 && (
              <section aria-labelledby="past-heading">
                <div className="mb-3 flex items-center justify-between gap-4">
                  <h2 id="past-heading" className="font-display text-xl font-semibold tracking-tight text-foreground">
                    Past
                  </h2>
                  <span className="text-sm tabular-nums text-muted-foreground">
                    {past.length} {past.length === 1 ? "booking" : "bookings"}
                  </span>
                </div>
                <div className="space-y-3">
                  {past.map((b) => (
                    <BookingRow key={b.id} booking={b} />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}

        {isFetching && !isError && (
          <p className="mt-6 flex items-center gap-2 text-sm text-muted-foreground" role="status" aria-live="polite">
            <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
            Refreshing…
          </p>
        )}
      </div>
    </Layout>
  );
};

export default MyBookingsPage;
