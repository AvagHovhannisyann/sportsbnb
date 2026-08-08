import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { format, addDays } from "date-fns";
import { Calendar, Clock, MapPin, Banknote, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getCustomerPrice } from "@/lib/pricing";
import { Price } from "@/components/ui/price";
import {
  DEFAULT_WIDGET_PRIMARY_COLOR,
  parseHexColor,
  hslTriplet,
  readableForeground,
} from "@/lib/color";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { VENUE_TIME_ZONE } from "@/lib/venueTime";

interface VenueData {
  id: string;
  name: string;
  address: string;
  city: string;
  sports: string[];
  pricePerHour: number;
  imageUrl: string | null;
  description: string | null;
}

interface TimeSlot {
  time: string;
  available: boolean;
}

const EmbedBookingPage = () => {
  const { venueId } = useParams<{ venueId: string }>();
  const [searchParams] = useSearchParams();
  
  const theme = searchParams.get("theme") || "light";
  /**
   * The owner's brand colour, resolved into the two tokens the rest of the app
   * is built on rather than pushed in as a hex.
   *
   * `--primary` was being set to `#10b981` directly. Every token in this app
   * is a bare HSL channel triplet consumed as `hsl(var(--primary))`, so that
   * became `hsl(#10b981)` — invalid, dropped. Measured in the widget:
   * `bg-primary` computed to `rgba(0, 0, 0, 0)`. The brand colour was not
   * being applied, it was deleting the token, and the only colour on screen
   * came from the handful of places that also set an inline `backgroundColor`.
   *
   * `--primary-foreground` has to move with it. Those inline fills were paired
   * with a hardcoded `text-white`, which measures 2.54:1 on the default
   * emerald — a colour the owner chooses, so the text on it has to be derived.
   */
  const brand =
    parseHexColor(searchParams.get("color")) ??
    parseHexColor(DEFAULT_WIDGET_PRIMARY_COLOR)!;
  const brandVars = {
    "--primary": hslTriplet(brand),
    "--primary-foreground": hslTriplet(readableForeground(brand)),
  } as React.CSSProperties;

  const [venue, setVenue] = useState<VenueData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [availability, setAvailability] = useState<TimeSlot[]>([]);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);

  // Generate date options for next 7 days
  const dateOptions = Array.from({ length: 7 }, (_, i) => addDays(new Date(), i));

  useEffect(() => {
    fetchVenueData();
  }, [venueId]);

  useEffect(() => {
    if (venueId) {
      fetchAvailability();
    }
  }, [venueId, selectedDate]);

  const fetchVenueData = async () => {
    if (!venueId) return;
    
    setIsLoading(true);
    try {
      // There used to be an `await supabase.functions.invoke("widget-data")`
      // here whose result was destructured and then never read. It could not
      // have returned anything useful either: the function takes `venueId`
      // from the query string, and this called it with `body: null` and no
      // params, so it answered 400 every time.
      //
      // It was not free. Nothing on this page renders until it settles — the
      // widget shows a bare spinner — and this page is what owners embed in
      // their own websites, so that round trip sat in front of first paint on
      // somebody else's domain. The route smoke test caught it as a permanently
      // blank render once dynamic routes were covered.
      const { data: venueData, error: venueError } = await supabase
        .from("venues")
        .select("id, name, address, city, sports, price_per_hour, image_url, description")
        .eq("id", venueId)
        .eq("is_active", true)
        .single();

      if (venueError || !venueData) {
        console.error("Venue not found");
        return;
      }

      setVenue({
        id: venueData.id,
        name: venueData.name,
        address: venueData.address || "",
        city: venueData.city,
        sports: venueData.sports,
        pricePerHour: venueData.price_per_hour,
        imageUrl: venueData.image_url,
        description: venueData.description,
      });
    } catch (error) {
      console.error("Error fetching venue:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAvailability = async () => {
    if (!venueId) return;
    
    setLoadingSlots(true);
    try {
      /**
       * The same RPC the site itself uses, replacing a second implementation
       * of availability that disagreed with it three ways.
       *
       * 1. `.single()` on `venue_hours` for one day. Zero rows is the *normal*
       *    state — most venues never set hours — and `.single()` treats it as
       *    an error, so `hours` came back null and the widget rendered "no
       *    slots" forever. `get_available_slots` defaults to 09:00–22:00 when
       *    it finds no row, so the same venue on the same day offered a full
       *    day of slots on the site and nothing at all in the owner's own
       *    embedded widget. For a newly listed venue that is every day.
       * 2. It matched bookings on `status IN ('confirmed','pending')`. The
       *    status a hold actually carries is `pending_payment`, so a slot
       *    someone was in the middle of paying for still showed as free here.
       * 3. It ignored `blocked_dates` entirely, which the RPC checks — a day
       *    the owner had closed was bookable through their own widget.
       *
       * The RPC is SECURITY DEFINER with no REVOKE, and the public venue page
       * already calls it unauthenticated, so an embed on someone else's site
       * can call it too.
       */
      const { data: rpcSlots, error: slotsError } = await supabase.rpc("get_available_slots", {
        p_venue_id: venueId,
        p_date: format(selectedDate, "yyyy-MM-dd"),
        p_court_id: null,
      });

      if (slotsError) throw slotsError;

      // The RPC returns instants; the widget shows venue-local wall clock,
      // which is what the site shows and what the owner wrote on their door.
      const slots: TimeSlot[] = (rpcSlots ?? []).map((slot) => ({
        time: new Intl.DateTimeFormat("en-GB", {
          timeZone: VENUE_TIME_ZONE,
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        }).format(new Date(slot.slot_start)),
        available: slot.available,
      }));

      setAvailability(slots);
    } catch (error) {
      console.error("Error fetching availability:", error);
    } finally {
      setLoadingSlots(false);
    }
  };

  const handleBookNow = () => {
    if (!selectedTime || !venue) return;
    
    // Open in new window to complete booking
    const bookingUrl = `${window.location.origin}/venue/${venueId}?date=${format(selectedDate, "yyyy-MM-dd")}&time=${selectedTime}`;
    window.open(bookingUrl, "_blank");
  };

  if (isLoading) {
    return (
      <div
        className="flex min-h-dvh items-center justify-center bg-background px-4 text-center"
        role="status"
      >
        <div>
          <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
            <Loader2 className="h-5 w-5 animate-spin motion-reduce:animate-none" aria-hidden="true" />
          </div>
          <p className="text-sm font-medium text-foreground">Loading venue availability…</p>
        </div>
      </div>
    );
  }

  if (!venue) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md shadow-sm">
          <CardContent className="px-5 py-10 text-center sm:px-6">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg border border-border bg-surface-1 text-muted-foreground">
              <MapPin className="h-6 w-6" aria-hidden="true" />
            </div>
            <h1 className="font-display text-xl font-semibold tracking-extra-tight">Venue unavailable</h1>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
              This venue could not be found or is not currently accepting bookings.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div
      className={`min-h-dvh p-3 text-foreground sm:p-4 ${theme === "dark" ? "dark bg-background" : "bg-background"}`}
      style={brandVars}
    >
      <Card className="mx-auto max-w-lg overflow-hidden shadow-sm">
        {/* Header */}
        {venue.imageUrl && (
          <div className="aspect-[16/6] overflow-hidden border-b border-border bg-surface-1">
            <img
              src={venue.imageUrl}
              alt={`${venue.name} venue`}
              className="h-full w-full object-cover"
              decoding="async"
            />
          </div>
        )}

        <CardContent className="space-y-5 p-4 sm:p-5">
          {/* Venue Info */}
          <div>
            {/* An embed is rendered in its own document inside the iframe, so the
                venue name is that document's h1, not an h2 under nothing. */}
            <p className="eyebrow mb-1.5">Book a venue</p>
            <h1 className="font-display text-2xl font-semibold leading-tight tracking-extra-tight text-foreground">
              {venue.name}
            </h1>
            <p className="mt-1.5 flex items-start gap-1.5 text-sm leading-relaxed text-muted-foreground">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              {venue.address}, {venue.city}
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {venue.sports.slice(0, 3).map((sport) => (
                <Badge key={sport} variant="secondary">
                  {sport}
                </Badge>
              ))}
            </div>
          </div>

          {/* Price */}
          <div className="surface-inset flex items-center justify-between gap-4 rounded-lg p-3.5">
            <span className="flex items-center gap-2 text-sm text-muted-foreground">
              <Banknote className="h-4 w-4 shrink-0" aria-hidden="true" />
              Starting from
            </span>
            <span className="whitespace-nowrap text-lg font-semibold text-foreground">
              <Price amount={getCustomerPrice(venue.pricePerHour)} suffix="/hr" />
            </span>
          </div>

          {/* Date Selection */}
          <fieldset className="space-y-2.5">
            <legend className="flex items-center gap-2 text-sm font-semibold">
              <Calendar className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              Select date
            </legend>
            {/* A wrapping grid, not a horizontal strip. Seven buttons at the
                required touch size do not fit a narrow iframe, so the widget
                uses four columns there and returns to one row when it has room.
                Every date remains fully visible and reachable by keyboard. */}
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
              {dateOptions.map((date) => (
                <button
                  key={date.toISOString()}
                  type="button"
                  aria-pressed={format(date, "yyyy-MM-dd") === format(selectedDate, "yyyy-MM-dd")}
                  aria-label={format(date, "EEEE, MMMM d")}
                  onClick={() => setSelectedDate(date)}
                  className={`focus-ring min-h-14 min-w-0 touch-manipulation rounded-lg border px-1.5 py-2 text-center transition-[background-color,border-color,color,opacity] duration-150 active:opacity-80 motion-reduce:transition-none ${
                    format(date, "yyyy-MM-dd") === format(selectedDate, "yyyy-MM-dd")
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border-interactive bg-background text-foreground hover:border-primary/50 hover:bg-accent"
                  }`}
                >
                  <span className="block text-xs font-medium opacity-80">{format(date, "EEE")}</span>
                  <span className="stat-numeral block text-base font-semibold leading-tight">
                    {format(date, "d")}
                  </span>
                </button>
              ))}
            </div>
          </fieldset>

          {/* Time Slots */}
          <fieldset className="space-y-2.5" aria-busy={loadingSlots}>
            <legend className="flex items-center gap-2 text-sm font-semibold">
              <Clock className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              Available times
            </legend>
            {loadingSlots ? (
              <div
                className="surface-inset flex min-h-20 items-center justify-center gap-2 rounded-lg px-4 py-4 text-sm text-muted-foreground"
                role="status"
              >
                <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
                Loading available times…
              </div>
            ) : availability.length === 0 ? (
              <p className="surface-inset rounded-lg px-4 py-5 text-center text-sm text-muted-foreground">
                No availability on this date
              </p>
            ) : (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {availability.map((slot) => (
                  <button
                    key={slot.time}
                    type="button"
                    aria-pressed={slot.available ? selectedTime === slot.time : undefined}
                    aria-label={`${slot.time}${slot.available ? "" : ", unavailable"}`}
                    onClick={() => slot.available && setSelectedTime(slot.time)}
                    disabled={!slot.available}
                    className={`focus-ring stat-numeral min-h-11 touch-manipulation rounded-lg border px-2 py-2 text-sm font-medium transition-[background-color,border-color,color,opacity] duration-150 active:opacity-80 motion-reduce:transition-none ${
                      !slot.available
                        ? "cursor-not-allowed border-border bg-surface-1 text-muted-foreground line-through opacity-55"
                        : selectedTime === slot.time
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border-interactive bg-background text-foreground hover:border-primary/50 hover:bg-accent"
                    }`}
                  >
                    {slot.time}
                  </button>
                ))}
              </div>
            )}
          </fieldset>

          {/* Book Button */}
          <Button
            className="w-full"
            size="lg"
            disabled={!selectedTime}
            onClick={handleBookNow}
          >
            {selectedTime
              ? `Book for ${format(selectedDate, "MMM d")} at ${selectedTime}`
              : "Select a time to book"}
          </Button>

          {/* Footer */}
          <p className="flex items-center justify-center text-center text-xs text-muted-foreground">
            Powered by{" "}
            <a
              href={window.location.origin}
              target="_blank"
              rel="noopener noreferrer"
              className="focus-ring -my-3 ml-1 inline-flex min-h-11 items-center rounded-sm underline underline-offset-4 transition-colors hover:text-foreground motion-reduce:transition-none"
            >
              SportsBnB
            </a>
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default EmbedBookingPage;
