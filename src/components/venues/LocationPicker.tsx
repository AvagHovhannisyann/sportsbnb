import React, { useState, useEffect, useCallback, useRef } from "react";
import { GoogleMap, Marker } from "@react-google-maps/api";
import { MapsReady } from "@/components/maps/GoogleMapsProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { MapPin, Search, Check, Loader2, X } from "lucide-react";
import { useRegion } from "@/hooks/useRegion";

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
  const [selectedPosition, setSelectedPosition] = useState<google.maps.LatLngLiteral | null>(
    latitude && longitude ? { lat: latitude, lng: longitude } : null
  );
  const [mapCenter, setMapCenter] = useState<google.maps.LatLngLiteral>(
    latitude && longitude ? { lat: latitude, lng: longitude } : regionDefault
  );
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [isConfirmed, setIsConfirmed] = useState(locationConfirmed);
  const mapRef = useRef<google.maps.Map | null>(null);

  useEffect(() => {
    if (latitude && longitude) {
      const pos = { lat: latitude, lng: longitude };
      setSelectedPosition(pos);
      setMapCenter(pos);
    }
    setIsConfirmed(locationConfirmed);
  }, [latitude, longitude, locationConfirmed]);

  const handleMapClick = useCallback((e: google.maps.MapMouseEvent) => {
    if (e.latLng) {
      const pos = { lat: e.latLng.lat(), lng: e.latLng.lng() };
      setSelectedPosition(pos);
      setIsConfirmed(false);
      onLocationConfirm(pos.lat, pos.lng, false);
    }
  }, [onLocationConfirm]);

  const searchAddress = async () => {
    const fullAddress = `${address}, ${city}`.trim();
    if (!fullAddress || fullAddress === ",") {
      setSearchError("Please enter an address and city first");
      return;
    }
    setIsSearching(true);
    setSearchError(null);
    try {
      const geocoder = new google.maps.Geocoder();
      const result = await geocoder.geocode({ address: fullAddress });
      if (result.results.length > 0) {
        const loc = result.results[0].geometry.location;
        const pos = { lat: loc.lat(), lng: loc.lng() };
        setSelectedPosition(pos);
        setMapCenter(pos);
        mapRef.current?.panTo(pos);
        setIsConfirmed(false);
        onLocationConfirm(pos.lat, pos.lng, false);
      } else {
        setSearchError("Address not found. Try clicking on the map.");
      }
    } catch {
      setSearchError("Failed to search address. Try clicking on the map.");
    } finally {
      setIsSearching(false);
    }
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
          {isSearching ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Search className="h-4 w-4 mr-2" />}
          Find on Map
        </Button>

        {searchError && (
          <Alert variant="destructive">
            <AlertDescription>{searchError}</AlertDescription>
          </Alert>
        )}

        <div className="relative rounded-lg overflow-hidden border border-border">
          <MapsReady><GoogleMap
            mapContainerStyle={{ width: "100%", height: "300px" }}
            center={mapCenter}
            zoom={13}
            onClick={handleMapClick}
            onLoad={(map) => { mapRef.current = map; }}
          >
            {selectedPosition && <Marker position={selectedPosition} />}
          </GoogleMap></MapsReady>
          <div className="absolute bottom-2 left-2 bg-background/90 backdrop-blur-sm rounded px-2 py-1 text-xs text-muted-foreground">
            Click on map to select exact location
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
