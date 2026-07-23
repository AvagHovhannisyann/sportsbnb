import { useState, useMemo, useEffect } from "react";
import SEOHead, { createBreadcrumbJsonLd } from "@/components/seo/SEOHead";
import { useSearchParams } from "react-router-dom";
import { Search, Filter, MapPin, X, Loader2, Navigation } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
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
import { sportTypes } from "@/data/constants";
import { getCustomerPrice, formatPrice } from "@/lib/pricing";
import Layout from "@/components/layout/Layout";
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

const DiscoverPage = () => {
  const { profile } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSport, setSelectedSport] = useState<string>(searchParams.get("sport") || "");
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 200000]);
  const [selectedCity, setSelectedCity] = useState<string>("");
  const [showFilters, setShowFilters] = useState(false);
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [searchLocation, setSearchLocation] = useState<{lat: number, lng: number, address: string} | null>(null);

  const [promotedVenueIds, setPromotedVenueIds] = useState<Set<string>>(new Set());

  const { data: venues = [], isLoading } = useVenues();

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

  // Get max price from venues
  const maxPrice = useMemo(() => {
    if (venues.length === 0) return 200000;
    return Math.max(...venues.map(v => v.price_per_hour), 200000);
  }, [venues]);

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
      setSelectedSport(sport);
    }
    if (q) setSearchQuery(q);
    if (city) setSelectedCity(city);
    if (maxPrice && /^\d+$/.test(maxPrice)) setPriceRange([0, parseInt(maxPrice)]);
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
    setOrDelete("maxPrice", priceRange[1] < 200000 ? String(priceRange[1]) : null);
    setSearchParams(params, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSport, searchQuery, selectedCity, priceRange]);

  // Auto-set city from user profile on first load
  useEffect(() => {
    if (profile?.city && !selectedCity && !searchLocation) {
      const profileCity = profile.city.toLowerCase();
      const matchingCity = cities.find(c => c.toLowerCase() === profileCity);
      if (matchingCity) {
        setSelectedCity(matchingCity);
      }
    }
  }, [profile, selectedCity, cities, searchLocation]);

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
      const location = venue.address || venue.city;
      const matchesSearch =
        venue.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        location.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesSport = !selectedSport || venue.sports.includes(selectedSport);
      const matchesPrice = venue.price_per_hour >= priceRange[0] && venue.price_per_hour <= priceRange[1];
      const matchesCity = !selectedCity || venue.city === selectedCity;

      return matchesSearch && matchesSport && matchesPrice && matchesCity;
    });

    // Sort by distance if we have location
    const locationToUse = searchLocation || (userLocation ? { lat: userLocation.lat, lng: userLocation.lng } : null);
    
    if (locationToUse) {
      result = result.map(venue => ({
        ...venue,
        distance: venue.latitude && venue.longitude
          ? calculateDistance(locationToUse.lat, locationToUse.lng, venue.latitude, venue.longitude)
          : null,
      })).sort((a, b) => {
        if (a.distance === null) return 1;
        if (b.distance === null) return -1;
        return a.distance - b.distance;
      });
    } else {
      // Sort promoted venues first when not sorting by distance
      result.sort((a, b) => {
        const aPromoted = promotedVenueIds.has(a.id) ? 1 : 0;
        const bPromoted = promotedVenueIds.has(b.id) ? 1 : 0;
        return bPromoted - aPromoted;
      });
    }

    return result;
  }, [venues, searchQuery, selectedSport, priceRange, selectedCity, userLocation, searchLocation, promotedVenueIds]);

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

  // Format customer-facing prices (including 5% fee)
  const formatCustomerPrice = (ownerPrice: number) => {
    return formatPrice(getCustomerPrice(ownerPrice));
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
                  <SelectTrigger className="w-[160px] h-12">
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
                  <SelectTrigger className="w-[160px] h-12">
                    <SelectValue placeholder="Sport type" />
                  </SelectTrigger>
                  <SelectContent>
                    {sportTypes.map((sport) => (
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
                          ✓
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
                        onValueChange={(value) => setPriceRange(value as [number, number])}
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
                    {sportTypes.map((sport) => (
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
                    onValueChange={(value) => setPriceRange(value as [number, number])}
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
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-foreground mb-1">Venues</h1>
              <p className="text-muted-foreground">
                {filteredVenues.length} {filteredVenues.length === 1 ? "venue" : "venues"} available
              </p>
            </div>
          </div>

          {isLoading ? (
            <div className="text-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
              <p className="text-muted-foreground">Loading venues...</p>
            </div>
          ) : filteredVenues.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredVenues.map((venue: any) => (
                <VenueCard
                  key={venue.id}
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
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">No venues found</h3>
              <p className="text-muted-foreground mb-4">
                Try adjusting your filters or search query
              </p>
              <Button variant="outline" onClick={clearFilters}>
                Clear filters
              </Button>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default DiscoverPage;
