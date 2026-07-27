import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { format, addDays } from "date-fns";
import { Calendar, Clock, MapPin, Banknote, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getCustomerPrice, formatPrice } from "@/lib/pricing";
import { parseHexColor, hslTriplet, readableForeground } from "@/lib/color";
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
  const brand = parseHexColor(searchParams.get("color")) ?? parseHexColor("#10b981")!;
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
      <div className="min-h-screen flex items-center justify-center bg-background" role="status" aria-label="Loading availability">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!venue) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">Venue not found or unavailable.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div 
      className={`min-h-screen p-4 ${theme === "dark" ? "dark bg-gray-900" : "bg-gray-50"}`}
      style={brandVars}
    >
      <Card className="max-w-md mx-auto overflow-hidden">
        {/* Header */}
        {venue.imageUrl && (
          <div 
            className="h-32 bg-cover bg-center" 
            style={{ backgroundImage: `url(${venue.imageUrl})` }}
          />
        )}
        
        <CardContent className="p-4 space-y-4">
          {/* Venue Info */}
          <div>
            {/* An embed is rendered in its own document inside the iframe, so the
                venue name is that document's h1, not an h2 under nothing. */}
            <h1 className="text-xl font-semibold text-foreground">{venue.name}</h1>
            <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
              <MapPin className="h-4 w-4" />
              {venue.address}, {venue.city}
            </p>
            <div className="flex gap-1 mt-2">
              {venue.sports.slice(0, 3).map((sport) => (
                <Badge key={sport} variant="secondary" className="text-xs">
                  {sport}
                </Badge>
              ))}
            </div>
          </div>

          {/* Price */}
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <span className="text-sm text-muted-foreground flex items-center gap-1">
              <Banknote className="h-4 w-4" />
              Starting from
            </span>
            <span className="text-lg font-semibold text-primary">
              {formatPrice(getCustomerPrice(venue.pricePerHour))}/hr
            </span>
          </div>

          {/* Date Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              Select Date
            </label>
            {/* A seven-column grid, not a horizontal scroll strip. Seven
                buttons at `min-w-[60px]` plus gaps need 468px; the strip is
                414px wide inside the embed's `max-w-md` card, so the last day
                was cut off with 6 of its 60 pixels showing and `scrollLeft`
                stayed at 0 when it was focused — measured, and reported by
                focus-visible.mjs as a control entirely covered by the page
                behind it. A fixed count of items in a fixed-width card is a
                grid; scrolling was never going to fit them. */}
            <div className="grid grid-cols-7 gap-1 pb-2">
              {dateOptions.map((date) => (
                <button
                  key={date.toISOString()}
                  onClick={() => setSelectedDate(date)}
                  className={`min-w-0 rounded-lg p-1.5 text-center transition-colors ${
                    format(date, "yyyy-MM-dd") === format(selectedDate, "yyyy-MM-dd")
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted hover:bg-muted/80"
                  }`}
                >
                  <div className="text-xs">{format(date, "EEE")}</div>
                  <div className="text-lg font-semibold">{format(date, "d")}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Time Slots */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-1">
              <Clock className="h-4 w-4" />
              Available Times
            </label>
            {loadingSlots ? (
              <div className="flex justify-center py-4" role="status" aria-label="Loading availability">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : availability.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No availability on this date
              </p>
            ) : (
              <div className="grid grid-cols-4 gap-2">
                {availability.map((slot) => (
                  <button
                    key={slot.time}
                    onClick={() => slot.available && setSelectedTime(slot.time)}
                    disabled={!slot.available}
                    className={`p-2 text-sm rounded-lg transition-colors ${
                      !slot.available
                        ? "bg-muted text-muted-foreground cursor-not-allowed line-through"
                        : selectedTime === slot.time
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted hover:bg-muted/80"
                    }`}
                  >
                    {slot.time}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Book Button */}
          <Button 
            className="w-full" 
            disabled={!selectedTime}
            onClick={handleBookNow}
          >
            {selectedTime 
              ? `Book for ${format(selectedDate, "MMM d")} at ${selectedTime}`
              : "Select a time to book"
            }
          </Button>

          {/* Footer */}
          <p className="text-xs text-center text-muted-foreground">
            Powered by{" "}
            <a 
              href={window.location.origin} 
              target="_blank" 
              rel="noopener noreferrer"
              className="underline hover:text-foreground"
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