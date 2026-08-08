import React, { useState, useEffect, useCallback } from "react";
import { MapsReady } from "@/components/maps/YandexMapsProvider";
import { YandexMap, YandexMarker } from "@/components/maps/YandexMap";
import { MapPinMarker } from "@/components/maps/MapPinMarker";
import { geocode, type LatLng } from "@/lib/yandexGeo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { MapPin, Search, Check, Loader2, X } from "lucide-react";
import { useRegion } from "@/hooks/useRegion";

/** Browser-callable geocoder key, the same one SmartSearch uses. */
const YANDEX_GEOCODER_API_KEY = import.meta.env.VITE_YANDEX_GEOCODER_KEY ?? "";

interface LocationPickerProps {
  address: string;
  city: string;
  onAddressChange: (address: string) => void;
  onCityChange: (city: string) => void;
  onLocationConfirm: (lat: number, lng: number, confirmed: boolean) => void;
  latitude?: number | null;
  longitude?: number | null;
  locationConfirmed?: boolean;
  validationErrors?: { address?: string; city?: string; location?: string };
}

export const LocationPicker: React.FC<LocationPickerProps> = ({
  address,
  city,
  onAddressChange,
  onCityChange,
  onLocationConfirm,
  latitude,
  longitude,
  locationConfirmed = false,
  validationErrors = {},
}) => {
  const { defaultCenter: regionDefault } = useRegion();
  const [selectedPosition, setSelectedPosition] = useState<LatLng | null>(
    latitude && longitude ? { lat: latitude, lng: longitude } : null
  );
  const [mapCenter, setMapCenter] = useState<LatLng>(
    latitude && longitude ? { lat: latitude, lng: longitude } : regionDefault
  );
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [isConfirmed, setIsConfirmed] = useState(locationConfirmed);

  useEffect(() => {
    if (latitude && longitude) {
      const pos = { lat: latitude, lng: longitude };
      setSelectedPosition(pos);
      setMapCenter(pos);
    }
    setIsConfirmed(locationConfirmed);
  }, [latitude, longitude, locationConfirmed]);

  const applyPosition = useCallback((pos: LatLng) => {
    setSelectedPosition(pos);
    setIsConfirmed(false);
    onLocationConfirm(pos.lat, pos.lng, false);
  }, [onLocationConfirm]);

  /**
   * Find the typed address on the map.
   *
   * Was `new google.maps.Geocoder()`, which needed the Maps script loaded
   * before it could be constructed. The Yandex geocoder is a plain HTTP
   * endpoint, so this works whether or not the map itself rendered — which
   * matters, because the map is the thing that fails without a key.
   */
  const searchAddress = async () => {
    const fullAddress = `${address}, ${city}`.trim();
    if (!fullAddress || fullAddress === ",") {
      setSearchError("Please enter an address and city first");
      return;
    }
    if (!YANDEX_GEOCODER_API_KEY) {
      setSearchError("Address lookup is not configured. Click the map to set the location.");
      return;
    }
    setIsSearching(true);
    setSearchError(null);
    const places = await geocode({
      apiKey: YANDEX_GEOCODER_API_KEY,
      geocode: fullAddress,
      results: 1,
      ll: regionDefault,
    });
    setIsSearching(false);

    const place = places[0];
    if (!place) {
      setSearchError("Address not found. Try clicking on the map.");
      return;
    }
    const pos = { lat: place.latitude, lng: place.longitude };
    setMapCenter(pos);
    applyPosition(pos);
  };

  const handleConfirmLocation = () => {
    if (selectedPosition) {
      setIsConfirmed(true);
      onLocationConfirm(selectedPosition.lat, selectedPosition.lng, true);
    }
  };

  const handleClearLocation = () => {
    setSelectedPosition(null);
    setIsConfirmed(false);
    onLocationConfirm(0, 0, false);
  };

  return (
    <Card className={validationErrors.location ? "border-destructive" : ""}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Location & Address *
        </CardTitle>
        <CardDescription>Enter your address and confirm the exact location on the map</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="city">City *</Label>
            <Input
              id="city"
              placeholder="e.g., Yerevan"
              value={city}
              onChange={(e) => { onCityChange(e.target.value); setIsConfirmed(false); }}
              maxLength={100}
              className={validationErrors.city ? "border-destructive" : ""}
            />
            {validationErrors.city && <p className="text-sm text-destructive">{validationErrors.city}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="address">Street Address *</Label>
            <Input
              id="address"
              placeholder="Full street address"
              value={address}
              onChange={(e) => { onAddressChange(e.target.value); setIsConfirmed(false); }}
              maxLength={200}
              className={validationErrors.address ? "border-destructive" : ""}
            />
            {validationErrors.address && <p className="text-sm text-destructive">{validationErrors.address}</p>}
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={searchAddress}
          disabled={isSearching || (!address.trim() && !city.trim())}
          className="w-full"
        >
          {isSearching ? <Loader2 className="mr-2 h-4 w-4 animate-spin motion-reduce:animate-none" /> : <Search className="mr-2 h-4 w-4" />}
          Find on Map
        </Button>

        {searchError && (
          <Alert variant="destructive">
            <AlertDescription>{searchError}</AlertDescription>
          </Alert>
        )}

        <div className="relative rounded-lg overflow-hidden border border-border">
          <MapsReady>
            <YandexMap
              style={{ width: "100%", height: "300px" }}
              ariaLabel="Venue location"
              center={mapCenter}
              zoom={13}
              onClick={applyPosition}
            >
              {selectedPosition && (
                <YandexMarker
                  position={selectedPosition}
                  anchor="bottom"
                  draggable
                  onDragEnd={applyPosition}
                >
                  <MapPinMarker />
                </YandexMarker>
              )}
            </YandexMap>
          </MapsReady>
          <div className="absolute bottom-2 left-2 bg-background/90 backdrop-blur-sm rounded px-2 py-1 text-xs text-muted-foreground">
            Click the map or drag the pin to select the exact location
          </div>
        </div>

        {selectedPosition && (
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" />
                <span className="text-sm">
                  Selected: {selectedPosition.lat.toFixed(6)}, {selectedPosition.lng.toFixed(6)}
                </span>
              </div>
              <Button type="button" variant="ghost" size="sm" onClick={handleClearLocation}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            {!isConfirmed ? (
              <Button type="button" onClick={handleConfirmLocation} className="w-full">
                <Check className="h-4 w-4 mr-2" />
                Confirm This Location
              </Button>
            ) : (
              <Alert className="bg-primary/10 border-primary">
                <Check className="h-4 w-4 text-primary" />
                <AlertDescription className="text-primary">
                  Location confirmed! You can continue with the form.
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {validationErrors.location && <p className="text-sm text-destructive">{validationErrors.location}</p>}
      </CardContent>
    </Card>
  );
};
