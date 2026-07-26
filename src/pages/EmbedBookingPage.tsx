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
      const dateStr = format(selectedDate, "yyyy-MM-dd");
      const dayOfWeek = selectedDate.getDay();

      // Get venue hours
      const { data: hours } = await supabase
        .from("venue_hours")
        .select("*")
        .eq("venue_id", venueId)
        .eq("day_of_week", dayOfWeek)
        .single();

      if (!hours || hours.is_closed) {
        setAvailability([]);
        return;
      }

      // Get existing bookings
      const { data: bookings } = await supabase
        .from("bookings")
        .select("booking_time, duration_hours")
        .eq("venue_id", venueId)
        .eq("booking_date", dateStr)
        .in("status", ["confirmed", "pending"]);

      // Generate time slots
      const slots: TimeSlot[] = [];
      const [openHour, openMin] = hours.open_time.split(":").map(Number);
      const [closeHour, closeMin] = hours.close_time.split(":").map(Number);
      const openMinutes = openHour * 60 + openMin;
      const closeMinutes = closeHour * 60 + closeMin;

      for (let time = openMinutes; time < closeMinutes - 60; time += 60) {
        const h = Math.floor(time / 60);
        const m = time % 60;
        const slotTime = `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;

        const isBooked = bookings?.some(b => {
          const [bH, bM] = b.booking_time.split(":").map(Number);
          const bStart = bH * 60 + bM;
          const bEnd = bStart + b.duration_hours * 60;
          return time >= bStart && time < bEnd;
        });

        slots.push({ time: slotTime, available: !isBooked });
      }

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
      <div className="min-h-screen flex items-center justify-center bg-background">
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
            <div className="flex gap-2 overflow-x-auto pb-2">
              {dateOptions.map((date) => (
                <button
                  key={date.toISOString()}
                  onClick={() => setSelectedDate(date)}
                  className={`flex-shrink-0 p-2 rounded-lg text-center min-w-[60px] transition-colors ${
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
              <div className="flex justify-center py-4">
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