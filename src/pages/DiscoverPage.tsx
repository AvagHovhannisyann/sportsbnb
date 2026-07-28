import { useState, useMemo, useEffect } from "react";
import SEOHead, { createBreadcrumbJsonLd } from "@/components/seo/SEOHead";
import { Link, useSearchParams } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { MotionProps, Variants } from "framer-motion";
import { easeOutExpo, transitionBase, transitionFast } from "@/lib/motion";
import { Check, Filter, Loader2, MapPin, Navigation, SearchX, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusPanel, ErrorPanel } from "@/components/common/StatusPanel";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import VenueCard from "@/components/venues/VenueCard";
import {
  compareVenues,
  isVenueSort,
  VENUE_SORTS,
  DEFAULT_VENUE_SORT,
  type VenueSort,
} from "@/features/venues/sortVenues";
import { describeActiveFilters, type FilterKey } from "@/features/venues/activeFilters";
import { canonicalSport } from "@/features/venues/sportFilter";
import { matchesVenueQuery } from "@/features/venues/venueSearch";
import { getCustomerPrice, formatPrice } from "@/lib/pricing";
import Layout from "@/components/layout/Layout";
import { FilterChips } from "@/components/ui/filter-chips";
import { useVenues, getVenueImage } from "@/hooks/useVenues";
import { useAuth } from "@/hooks/useAuth";
import { SmartSearch } from "@/components/search/SmartSearch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Calculate distance between two coordinates using Haversine formula
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

/** Starting ceiling for the price filter, before the catalogue is known. */
const PRICE_FLOOR_CEILING = 200000;

/* ------------------------------------------------------------------
   Motion.

   Durations and easings come from lib/motion, which mirrors the
   --dur-* / --ease-out-expo custom properties in index.css, so the two
   halves of the page that move — the framer-motion results region and
   the CSS-driven filter chips below — agree on what "fast" means.

   Under `prefers-reduced-motion: reduce` the animation props are not
   passed at all rather than being given a zero duration: the final
   state renders outright, so nothing here depends on a frame that
   never runs. That is the convention HomePage already established.
   ------------------------------------------------------------------ */

/** Gap between one card's entrance and the next. */
const CARD_STAGGER_STEP = 0.05;
/**
 * The index past which every remaining card shares the last delay.
 *
 * This grid is unpaginated — "Any sport, any city" renders the whole
 * catalogue — so an uncapped stagger would still be dealing out cards
 * two seconds after the data landed, and the further down the page you
 * look the more it reads as slowness rather than sequence. Capped, the
 * stagger costs 500ms whether there are eleven venues or a hundred,
 * and the cards past the fold arrive together (which is what someone
 * scrolling down to them wants anyway).
 */
const CARD_STAGGER_CAP = 10;

/**
 * The grid itself only fades on the way *out*; the entrance belongs to
 * the cards. Giving both an opacity animation would double it up.
 */
const resultsVariants: Variants = {
  hidden: {},
  visible: {},
  exit: { opacity: 0, transition: transitionFast },
};

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: (index: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: easeOutExpo,
      delay: Math.min(index, CARD_STAGGER_CAP) * CARD_STAGGER_STEP,
    },
  }),
};

/**
 * Entrance and press feedback for the filter chips.
 *
 * Scoped here, and in CSS, for two reasons. `FilterChips` is shared with
 * /games, which another page owns — reaching into it would change a
 * component this page does not own. And a chip's entrance is triggered
 * by the node being created, which is exactly when a CSS animation
 * fires, so keying off React's own reconciliation gets it for free: an
 * added filter animates, the chips already on screen do not re-run.
 *
 * `backwards` rather than `forwards`/`both` on purpose — a filled-forwards
 * animation keeps winning the cascade after it ends, which would beat the
 * `:active` transform below and leave the press feedback dead.
 */
const CHIP_MOTION_CSS = `
[data-venues-chips] button {
  animation: venues-chip-in var(--dur-base, 250ms) var(--ease-out-expo, cubic-bezier(0.16, 1, 0.3, 1)) backwards;
  /* Longhand, not the shorthand: the chips carry Tailwind's
     transition-colors, and a "transition" shorthand here would reset
     transition-property to "transform" alone and kill the hover fade. */
  transition-property: color, background-color, border-color, transform;
  transition-duration: var(--dur-fast, 150ms);
  transition-timing-function: var(--ease-out-expo, cubic-bezier(0.16, 1, 0.3, 1));
}
[data-venues-chips] button:active {
  transform: scale(0.96);
}
@keyframes venues-chip-in {
  from { opacity: 0; transform: scale(0.94); }
  to   { opacity: 1; transform: scale(1); }
}
@media (prefers-reduced-motion: reduce) {
  [data-venues-chips] button {
    animation: none;
    transition-property: color, background-color, border-color;
  }
  [data-venues-chips] button:active { transform: none; }
}
`;

const DiscoverPage = () => {
  const { profile } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState("");
  // Canonicalised on the way in: the sport has to be one of the strings
  // venues are tagged with, or nothing. See `canonicalSport`.
  const [selectedSport, setSelectedSport] = useState<string>(() => canonicalSport(searchParams.get("sport")));
  /**
   * `PRICE_FLOOR_CEILING` is the *starting* ceiling, not the real one.
   *
   * `maxPrice` below is `Math.max(...venuePrices, 200000)`, so it rises above
   * this whenever a venue costs more — but this range never moved off its
   * initial value, and the filter is `price_per_hour <= priceRange[1]`. A
   * venue above ֏200,000/hour was therefore filtered out of Discover on first
   * load, with the slider parked mid-track as if someone had set that filter
   * deliberately. An unfindable venue is an unbookable one, and neither the
   * player nor the owner had any way to know.
   */
  const [priceRange, setPriceRange] = useState<[number, number]>([0, PRICE_FLOOR_CEILING]);
  // Whether the ceiling is the user's choice (slider or shared URL) or still
  // just the default waiting to learn what the catalogue actually costs.
  const [priceTouched, setPriceTouched] = useState(false);
  const [selectedCity, setSelectedCity] = useState<string>("");
  // Seeded straight from the URL rather than in the mount effect below,
  // because an unrecognised value has to fall back to the default before the
  // first render orders anything — `isVenueSort` is the guard for that.
  const [sortBy, setSortBy] = useState<VenueSort>(() => {
    const fromUrl = searchParams.get("sort");
    return isVenueSort(fromUrl) ? fromUrl : DEFAULT_VENUE_SORT;
  });
  const [showFilters, setShowFilters] = useState(false);
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [searchLocation, setSearchLocation] = useState<{lat: number, lng: number, address: string} | null>(null);

  const [promotedVenueIds, setPromotedVenueIds] = useState<Set<string>>(new Set());

  const { data: venues = [], isLoading, isError, refetch, isRefetching } = useVenues();

  // Fetch promoted venues
  useEffect(() => {
    const fetchPromoted = async () => {
      const { data } = await supabase
        .from("venue_promotions")
        .select("venue_id")
        .eq("is_active", true)
        .gte("ends_at", new Date().toISOString());
      if (data) {
        setPromotedVenueIds(new Set(data.map(p => p.venue_id)));
      }
    };
    fetchPromoted();
  }, []);

  // Get unique cities from venues
  const cities = useMemo(() => {
    const citySet = new Set(venues.map(v => v.city).filter(Boolean));
    return Array.from(citySet).sort();
  }, [venues]);

  /**
   * The sports on offer, taken from the catalogue rather than from a constant.
   *
   * This filter was built from `sportTypes` — twenty sports — while a venue can
   * only be tagged with the twelve in `SPORTS_OPTIONS`, which is what
   * `VenueForm` offers an owner. The two lists have diverged, and the nine in
   * the gap (Boxing, Yoga, Table Tennis, Squash, Hockey, Baseball, Martial
   * Arts, Dance, Climbing) were filter options that could never match anything.
   * Nearly half the picker was guaranteed to return "no venues found",
   * whatever inventory existed.
   *
   * Deriving it is the same thing this page already does one block above for
   * cities, and it is better than picking either list: a filter offered is a
   * filter something matches, and the day a venue is listed for Yoga the option
   * appears on its own. Which sports an owner may choose is a separate
   * question, and a product one — see docs/handover.md.
   */
  const availableSports = useMemo(() => {
    const set = new Set(venues.flatMap((v) => v.sports ?? []).filter(Boolean));
    return Array.from(set).sort();
  }, [venues]);

  // Get max price from venues
  const maxPrice = useMemo(() => {
    if (venues.length === 0) return PRICE_FLOOR_CEILING;
    return Math.max(...venues.map(v => v.price_per_hour), PRICE_FLOOR_CEILING);
  }, [venues]);

  // Until the user picks a price, the ceiling follows the catalogue. Without
  // this the initial 200,000 stayed put and quietly excluded anything dearer.
  useEffect(() => {
    if (!priceTouched) setPriceRange(([lo]) => [lo, maxPrice]);
  }, [maxPrice, priceTouched]);

  // Handle URL params for location search
  useEffect(() => {
    const lat = searchParams.get("lat");
    const lng = searchParams.get("lng");
    const sport = searchParams.get("sport");
    const q = searchParams.get("q");
    const city = searchParams.get("city");
    const maxPrice = searchParams.get("maxPrice");

    if (lat && lng) {
      setSearchLocation({
        lat: parseFloat(lat),
        lng: parseFloat(lng),
        address: "Selected location",
      });
    }
    if (sport) {
      setSelectedSport(canonicalSport(sport));
    }
    // `location` is the hero bar's old parameter name, which this page never
    // read. Honoured as a fallback so links already shared with it start
    // working; the sync effect below then rewrites them to `q`.
    const typedPlace = q ?? searchParams.get("location");
    if (typedPlace) setSearchQuery(typedPlace);
    if (city) setSelectedCity(city);
    if (maxPrice && /^\d+$/.test(maxPrice)) {
      setPriceRange([0, parseInt(maxPrice)]);
      setPriceTouched(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep filters shareable: reflect them in the URL as they change
  useEffect(() => {
    const params = new URLSearchParams(searchParams);
    const setOrDelete = (key: string, value: string | null) => {
      if (value) params.set(key, value);
      else params.delete(key);
    };
    setOrDelete("sport", selectedSport || null);
    setOrDelete("q", searchQuery || null);
    setOrDelete("city", selectedCity || null);
    setOrDelete("maxPrice", priceTouched && priceRange[1] < maxPrice ? String(priceRange[1]) : null);
    // Only when it differs from the default, so an untouched Discover link
    // stays clean and a shared one carries the order it was shared in.
    setOrDelete("sort", sortBy === DEFAULT_VENUE_SORT ? null : sortBy);
    // The hero bar's old parameter, read once above and then retired. Without
    // this it survives every filter change and rides along in whatever the
    // user copies out of the address bar, still doing nothing.
    params.delete("location");
    setSearchParams(params, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSport, searchQuery, selectedCity, priceRange, sortBy]);

  // Auto-set city from user profile on first load.
  //
  // Skipped when the URL arrived carrying a search, because the city ANDs with
  // it: a player whose profile says Yerevan, searching the home page for
  // Gyumri, would land on "no venues found" for venues that exist. The profile
  // city is a convenience default for someone who asked for nothing in
  // particular, not a filter to impose on someone who asked for something.
  //
  // A `city` or `lat` in the URL is already covered by the two guards below,
  // which is why only `q` needs capturing — and it is captured at mount
  // because `cities` arrives with the venues, long after the URL was read.
  const [urlCarriedSearch] = useState(() => Boolean(searchParams.get("q") || searchParams.get("location")));
  useEffect(() => {
    if (profile?.city && !selectedCity && !searchLocation && !urlCarriedSearch) {
      const profileCity = profile.city.toLowerCase();
      const matchingCity = cities.find(c => c.toLowerCase() === profileCity);
      if (matchingCity) {
        setSelectedCity(matchingCity);
      }
    }
  }, [profile, selectedCity, cities, searchLocation, urlCarriedSearch]);

  const handleNearMe = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setSearchLocation(null);
        setSelectedCity("");
        setIsLocating(false);
        toast.success("Showing venues near you!");
      },
      (error) => {
        console.error("Geolocation error:", error);
        toast.error("Unable to get your location");
        setIsLocating(false);
      }
    );
  };

  const handleLocationSearch = (lat: number, lng: number, address: string) => {
    setSearchLocation({ lat, lng, address });
    setUserLocation(null);
    setSelectedCity("");
    setSearchParams({ lat: lat.toString(), lng: lng.toString() });
  };

  // Filter and sort venues
  const filteredVenues = useMemo(() => {
    let result = venues.filter((venue) => {
      // Name, address *and* city — this used to be `address || city`, which
      // hid every addressed venue from a search for its own city. See
      // features/venues/venueSearch.
      const matchesSearch = matchesVenueQuery(venue, searchQuery);
      const matchesSport = !selectedSport || venue.sports.includes(selectedSport);
      const matchesPrice = venue.price_per_hour >= priceRange[0] && venue.price_per_hour <= priceRange[1];
      const matchesCity = !selectedCity || venue.city === selectedCity;

      return matchesSearch && matchesSport && matchesPrice && matchesCity;
    });

    // Distance is annotated whenever a location is known, whatever the sort —
    // the cards show it, so it cannot be computed only when it is also the
    // ordering key.
    const locationToUse = searchLocation || (userLocation ? { lat: userLocation.lat, lng: userLocation.lng } : null);
    if (locationToUse) {
      result = result.map((venue) => ({
        ...venue,
        distance:
          venue.latitude && venue.longitude
            ? calculateDistance(locationToUse.lat, locationToUse.lng, venue.latitude, venue.longitude)
            : null,
      }));
    }

    // The comparators live in features/venues/sortVenues, where the decisions
    // that need testing are: an unreviewed venue is not a zero-rated one, a
    // venue with no coordinates sorts last rather than nearest, and promoted
    // placement never touches the price order.
    return [...result].sort(compareVenues(sortBy, promotedVenueIds));
  }, [venues, searchQuery, selectedSport, priceRange, selectedCity, userLocation, searchLocation, promotedVenueIds, sortBy]);

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedSport("");
    setPriceRange([0, maxPrice]);
    setSelectedCity("");
    setUserLocation(null);
    setSearchLocation(null);
    setSearchParams({});
  };

  const hasActiveFilters = searchQuery || selectedSport || selectedCity ||
    priceRange[0] > 0 || priceRange[1] < maxPrice || userLocation || searchLocation;

  const activeFilters = useMemo(
    () =>
      describeActiveFilters({
        searchQuery,
        selectedSport,
        selectedCity,
        priceCeiling: priceRange[1],
        maxPrice,
        priceTouched,
        locationLabel: searchLocation?.address ?? (userLocation ? "Near me" : null),
      }),
    [searchQuery, selectedSport, selectedCity, priceRange, maxPrice, priceTouched, searchLocation, userLocation],
  );

  /** Drop one filter, leaving the rest alone. */
  const clearFilter = (key: FilterKey) => {
    switch (key) {
      case "query":
        setSearchQuery("");
        break;
      case "sport":
        setSelectedSport("");
        break;
      case "city":
        setSelectedCity("");
        break;
      case "price":
        // Back to the catalogue's own ceiling, and untouched again — otherwise
        // the chip would vanish while the slider stayed where it was.
        setPriceRange([0, maxPrice]);
        setPriceTouched(false);
        break;
      case "location":
        setUserLocation(null);
        setSearchLocation(null);
        break;
    }
  };

  // Format the price a player actually pays. Sportsbnb takes no commission, so
  // this is the owner's listed rate — the comment used to claim it included a
  // 5% fee, and `getCustomerPrice` no longer adds one.
  const formatCustomerPrice = (ownerPrice: number) => {
    return formatPrice(getCustomerPrice(ownerPrice));
  };

  // ── Motion props for the results region (see the block above) ──
  const prefersReduced = useReducedMotion();

  // `initial: false` so the skeletons are simply *there* on first paint.
  // Fading a placeholder in delays the one thing it exists to do, which is
  // to say "something is coming" as early as possible. It still fades out.
  const skeletonMotion: MotionProps = prefersReduced
    ? {}
    : { initial: false, exit: { opacity: 0 }, transition: transitionFast };

  // Deliberately not `initial={false}` on <AnimatePresence>: react-query
  // serves this page from cache for a minute, so a return visit renders the
  // grid as the first branch, and suppressing that would drop the stagger on
  // exactly the loads where the page is quick enough to enjoy it.
  const gridMotion: MotionProps = prefersReduced
    ? {}
    : { variants: resultsVariants, initial: "hidden", animate: "visible", exit: "exit" };

  const cardMotion = (index: number): MotionProps =>
    prefersReduced ? {} : { variants: cardVariants, custom: index };

  const panelMotion: MotionProps = prefersReduced
    ? {}
    : {
        initial: { opacity: 0, y: 8 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0 },
        transition: transitionBase,
      };

  return (
    <Layout>
      <SEOHead
        title="Browse Sports Venues Near You"
        description="Discover and book basketball courts, football fields, tennis courts, swimming pools and more. Filter by sport, location, and price. Real-time availability."
        canonical="/venues"
        jsonLd={createBreadcrumbJsonLd([
          { name: "Home", url: "/" },
          { name: "Venues", url: "/venues" },
        ])}
      />
      <style dangerouslySetInnerHTML={{ __html: CHIP_MOTION_CSS }} />
      <div className="bg-background min-h-screen">
        {/* Search Header */}
        <div className="bg-card border-b border-border sticky top-16 z-40">
          <div className="container py-4">
            <div className="flex flex-col md:flex-row gap-4">
              {/* Smart Search */}
              <div className="flex-1">
                <SmartSearch 
                  placeholder="Search venues, games, or locations..."
                  onLocationSelect={handleLocationSearch}
                />
              </div>
              
              <div className="hidden md:flex items-center gap-3">
                {/* Near Me Button */}
                <Button
                  variant="outline"
                  onClick={handleNearMe}
                  disabled={isLocating}
                  className="gap-2"
                >
                  {isLocating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Navigation className="h-4 w-4" />
                  )}
                  Near me
                </Button>

                <Select value={selectedCity} onValueChange={setSelectedCity}>
                  <SelectTrigger aria-label="City" className="w-[160px] h-12">
                    <MapPin className="h-4 w-4 mr-2 text-muted-foreground" />
                    <SelectValue placeholder="City" />
                  </SelectTrigger>
                  <SelectContent>
                    {cities.map((city) => (
                      <SelectItem key={city} value={city}>
                        {city}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={selectedSport} onValueChange={setSelectedSport}>
                  <SelectTrigger aria-label="Sport type" className="w-[160px] h-12">
                    <SelectValue placeholder="Sport type" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableSports.map((sport) => (
                      <SelectItem key={sport} value={sport}>
                        {sport}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                {/* Advanced Price Filter */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="h-12 gap-2">
                      Price
                      {(priceRange[0] > 0 || priceRange[1] < maxPrice) && (
                        <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                          <Check className="h-3 w-3" aria-hidden="true" />
                          <span className="sr-only">Price filter active</span>
                        </Badge>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80" align="end">
                    <div className="space-y-4">
                      <div>
                        <Label className="text-sm font-medium">Price Range (per hour)</Label>
                        <p className="text-sm text-muted-foreground mt-1">
                          {formatCustomerPrice(priceRange[0])} - {formatCustomerPrice(priceRange[1])}
                        </p>
                      </div>
                      <Slider
                        value={priceRange}
                        onValueChange={(value) => {
                          setPriceTouched(true);
                          setPriceRange(value as [number, number]);
                        }}
                        max={maxPrice}
                        min={0}
                        step={1000}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{formatCustomerPrice(0)}</span>
                        <span>{formatCustomerPrice(maxPrice)}</span>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
                
                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" onClick={clearFilters}>
                    <X className="h-4 w-4 mr-1" />
                    Clear
                  </Button>
                )}
              </div>
              
              <Button
                variant="outline"
                className="md:hidden"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="h-4 w-4 mr-2" />
                Filters
                {hasActiveFilters && (
                  <Badge className="ml-2 h-5 w-5 p-0 justify-center">!</Badge>
                )}
              </Button>
            </div>
            
            {/* Mobile Filters */}
            {showFilters && (
              <div className="md:hidden pt-4 flex flex-col gap-3">
                <Button
                  variant="outline"
                  onClick={handleNearMe}
                  disabled={isLocating}
                  className="gap-2 justify-center"
                >
                  {isLocating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Navigation className="h-4 w-4" />
                  )}
                  Near me
                </Button>

                <Select value={selectedSport} onValueChange={setSelectedSport}>
                  <SelectTrigger className="h-12">
                    <SelectValue placeholder="Sport type" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableSports.map((sport) => (
                      <SelectItem key={sport} value={sport}>
                        {sport}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <div className="space-y-2 p-3 border border-border rounded-lg">
                  <Label className="text-sm font-medium">Price Range</Label>
                  <p className="text-sm text-muted-foreground">
                    {formatPrice(priceRange[0])} - {formatPrice(priceRange[1])}
                  </p>
                  <Slider
                    value={priceRange}
                    onValueChange={(value) => {
                          setPriceTouched(true);
                          setPriceRange(value as [number, number]);
                        }}
                    max={maxPrice}
                    min={0}
                    step={1000}
                    className="w-full"
                  />
                </div>
                
                {hasActiveFilters && (
                  <Button variant="ghost" onClick={clearFilters}>
                    <X className="h-4 w-4 mr-1" />
                    Clear all filters
                  </Button>
                )}
              </div>
            )}

            {/* Active location indicator */}
            {(userLocation || searchLocation) && (
              <div className="mt-3 flex items-center gap-2">
                <Badge variant="secondary" className="gap-1">
                  <Navigation className="h-3 w-3" />
                  {searchLocation?.address || "Your location"}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  Sorting by distance
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Results */}
        <div className="container py-8">
          {/* This row was `justify-between` with a single child, so the space
              the sort control now occupies was already reserved and empty.
              `flex-wrap` with the control pushed by `ms-auto` keeps it beside
              the heading on a desktop and under it on a phone, rather than
              squeezing the title. */}
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="eyebrow mb-2">Book by the hour</p>
              <h1 className="page-title">Venues</h1>
              {/* Nothing is "available" until the query resolves. Rendering
                  filteredVenues.length during load stated "0 venues available"
                  as fact on every cold visit, then contradicted itself. */}
              <p className="text-muted-foreground" aria-live="polite">
                {isLoading
                  ? "Finding venues near you…"
                  : isError
                    ? "Results unavailable"
                    : `${filteredVenues.length} ${filteredVenues.length === 1 ? "venue" : "venues"} available`}
              </p>
            </div>

            {/* Hidden while there is nothing to order, rather than rendered
                disabled: a sort control over an empty or still-loading grid is
                a promise the page cannot keep yet. */}
            {!isLoading && !isError && filteredVenues.length > 1 && (
              <div className="ms-auto flex items-center gap-2">
                <Label htmlFor="venue-sort" className="text-sm text-muted-foreground">
                  Sort by
                </Label>
                <Select value={sortBy} onValueChange={(v) => setSortBy(v as VenueSort)}>
                  <SelectTrigger id="venue-sort" className="w-[11.5rem]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {VENUE_SORTS.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* What is narrowing the grid, and a way out of each one.
              Before this the page filtered on five things and named none of
              them: desktop had a single Clear that dropped all five, mobile
              had a badge on the Filters button reading "!". A grid narrowed to
              two results was indistinguishable from an empty catalogue. */}
          {/* The wrapper is the animation's hook, nothing more: FilterChips is
              shared with /games, so the chip entrance and press feedback are
              attached from out here rather than by editing it. It renders null
              with no filters set, so this contributes no height of its own. */}
          <div data-venues-chips="">
            <FilterChips
              className="mb-6"
              chips={activeFilters}
              onRemove={(key) => clearFilter(key as FilterKey)}
              onClearAll={clearFilters}
            />
          </div>

          {/* Skeletons, results, the error and the two empty states are one
              swappable region rather than five independent branches, so the
              outgoing one can fade before the incoming one arrives — `mode
              ="wait"` sequences them, which is what turns a cold load from a
              hard cut into a crossfade. Sequential rather than overlapped
              deliberately: overlapping two grids means taking one of them out
              of flow, and a placeholder that reserves the wrong space is worse
              than a 150ms handover. */}
          <AnimatePresence mode="wait">
          {isLoading ? (
            // Skeletons rather than a centred spinner: same grid, same card
            // geometry, so the results land in place instead of shifting the
            // page down when they arrive.
            <motion.div
              key="loading"
              {...skeletonMotion}
              className="grid gap-5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
              role="status"
              aria-label="Loading venues"
            >
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="overflow-hidden rounded-2xl border border-border bg-card"
                >
                  {/* aspect-[3/2] mirrors VenueCard's own image box — a
                      skeleton whose geometry differs from the real card just
                      relocates the layout shift instead of removing it.
                      This said 5/4 while the card had moved to 3/2, so every
                      card in the grid rose 43px on load: 323x258 held, 323x215
                      delivered. scripts/layout-shift.mjs now measures it. */}
                  <Skeleton className="aspect-[3/2] w-full rounded-none bg-surface-3" />
                  <div className="space-y-3 p-4">
                    <Skeleton className="h-5 w-3/5 bg-surface-3" />
                    <Skeleton className="h-4 w-2/5 bg-surface-2" />
                    <div className="flex gap-2 pt-1">
                      <Skeleton className="h-6 w-16 rounded-full bg-surface-2" />
                      <Skeleton className="h-6 w-20 rounded-full bg-surface-2" />
                    </div>
                    <div className="flex items-center justify-between pt-2">
                      <Skeleton className="h-6 w-24 bg-surface-3" />
                      <Skeleton className="h-4 w-12 bg-surface-2" />
                    </div>
                  </div>
                </div>
              ))}
            </motion.div>
          ) : isError ? (
            /* Without this branch a failed query left the skeletons pulsing
               forever — the most misleading state available, since it promises
               content that is never coming and offers no way to retry. */
            <motion.div key="error" {...panelMotion}>
              <ErrorPanel
                what="venues"
                description="The connection dropped on the way to our servers. Your filters are still set — retrying will keep them."
                onRetry={() => refetch()}
                isRetrying={isRefetching}
                className="rounded-2xl border border-destructive/25 bg-destructive/5"
              />
            </motion.div>
          ) : filteredVenues.length > 0 ? (
            /* The key stays "results" across filter changes on purpose. Only a
               change of key runs an exit, so narrowing the grid re-flows it
               rather than fading the whole thing out and back — and the cards
               that survive the change never re-animate. What does animate is a
               card that has just become a result: it mounts under a parent
               already at "visible" and plays its own entrance. */
            <motion.div
              key="results"
              {...gridMotion}
              className="grid gap-5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
            >
              {filteredVenues.map((venue: any, index: number) => (
                /* The wrapper takes the transform so VenueCard keeps its own:
                   `.card-lift` translates the article on hover, and one element
                   cannot hold an entrance and a hover response at once. */
                <motion.div key={venue.id} {...cardMotion(index)}>
                  <VenueCard
                    id={venue.id}
                    name={venue.name}
                    image={getVenueImage(venue)}
                    location={venue.address || venue.city}
                    sports={venue.sports}
                    price={venue.price_per_hour}
                    rating={venue.rating}
                    reviewCount={venue.review_count}
                    available={venue.is_active}
                    distance={venue.distance}
                    isPromoted={promotedVenueIds.has(venue.id)}
                  />
                </motion.div>
              ))}
            </motion.div>
          ) : hasActiveFilters && venues.length > 0 ? (
            <motion.div key="no-match" {...panelMotion}>
            <StatusPanel
              icon={SearchX}
              title="Nothing matches those filters"
              description={`${venues.length} ${venues.length === 1 ? "venue is" : "venues are"} listed overall — widening the search should bring some back.`}
              className="rounded-2xl border border-border bg-surface-1"
            >
              <Button onClick={clearFilters}>Clear all filters</Button>
              {selectedSport && (
                <Button variant="outline" onClick={() => setSelectedSport("")}>
                  Any sport
                </Button>
              )}
              {selectedCity && (
                <Button variant="outline" onClick={() => setSelectedCity("")}>
                  Any city
                </Button>
              )}
            </StatusPanel>
            </motion.div>
          ) : (
            /* The catalogue itself is empty — which is the dominant fact even
               if filters happen to be set, so this branch is guarded ahead of
               the no-match one. Telling this visitor to "adjust your filters"
               was advice they often could not act on (they have none), and
               with an empty catalogue "widening the search" is simply false.
               Until venues are listed this is the most-seen screen in the app,
               so it gets a real next step instead. */
            <motion.div key="empty" {...panelMotion}>
            <StatusPanel
              icon={MapPin}
              tone="positive"
              title="No venues listed yet"
              description="We're onboarding venues across Yerevan now. If you run a pitch, court or pool, listing takes about ten minutes and costs nothing until you take a booking."
              className="rounded-2xl border border-border bg-surface-1"
            >
              <Button asChild>
                <Link to="/for-owners">List your venue</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/games">Find a game instead</Link>
              </Button>
            </StatusPanel>
            </motion.div>
          )}
          </AnimatePresence>
        </div>
      </div>
    </Layout>
  );
};

export default DiscoverPage;
