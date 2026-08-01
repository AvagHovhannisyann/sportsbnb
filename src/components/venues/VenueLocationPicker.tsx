import React, { useState, useEffect, useCallback } from "react";
import { MapsReady } from "@/components/maps/YandexMapsProvider";
import { YandexMap, YandexMarker } from "@/components/maps/YandexMap";
import { MapPinMarker } from "@/components/maps/MapPinMarker";
import type { LatLng } from "@/lib/yandexGeo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { MapPin, Check, X } from "lucide-react";
import { LocationAutocomplete, LocationPlace } from "@/components/location/LocationAutocomplete";
import { useRegion } from "@/hooks/useRegion";

interface VenueLocationPickerProps {
  address: string;
  city: string;
  zipCode?: string;
  onAddressChange: (address: string) => void;
  onCityChange: (city: string) => void;
  onZipCodeChange?: (zipCode: string) => void;
  onLocationConfirm: (lat: number, lng: number, confirmed: boolean) => void;
  latitude?: number | null;
  longitude?: number | null;
  locationConfirmed?: boolean;
  validationErrors?: { address?: string; city?: string; zipCode?: string; location?: string };
}

export const VenueLocationPicker: React.FC<VenueLocationPickerProps> = ({
  address,
  city,
  zipCode = "",
  onAddressChange,
  onCityChange,
  onZipCodeChange,
  onLocationConfirm,
  latitude,
  longitude,
  locationConfirmed = false,
  validationErrors = {},
}) => {
  const [selectedPosition, setSelectedPosition] = useState<LatLng | null>(
    latitude && longitude ? { lat: latitude, lng: longitude } : null
  );
  const { defaultCenter: regionDefault } = useRegion();
  const [mapCenter, setMapCenter] = useState<LatLng>(
    latitude && longitude ? { lat: latitude, lng: longitude } : regionDefault
  );
  const [isConfirmed, setIsConfirmed] = useState(locationConfirmed);

  useEffect(() => {
    if (latitude && longitude) {
      const pos = { lat: latitude, lng: longitude };
      setSelectedPosition(pos);
      setMapCenter(pos);
    }
    setIsConfirmed(locationConfirmed);
  }, [latitude, longitude, locationConfirmed]);

  const handleMapClick = useCallback((pos: LatLng) => {
    setSelectedPosition(pos);
    setIsConfirmed(false);
    onLocationConfirm(pos.lat, pos.lng, false);
  }, [onLocationConfirm]);

  /**
   * Dragging the pin is the same edit as clicking the map, so it goes through
   * the same handler. Yandex reports the drop point as `[lng, lat]`; the
   * `YandexMarker` wrapper has already converted it.
   */
  const handleMarkerDragEnd = useCallback((pos: LatLng) => {
    setSelectedPosition(pos);
    setIsConfirmed(false);
    onLocationConfirm(pos.lat, pos.lng, false);
  }, [onLocationConfirm]);

  const handlePlaceSelect = (place: LocationPlace) => {
    onAddressChange(place.formattedAddress);
    if (place.city) onCityChange(place.city);
    const pos = { lat: place.latitude, lng: place.longitude };
    setSelectedPosition(pos);
    // The map follows its `center` prop, so panning is a state change here
    // rather than an imperative call on a ref.
    setMapCenter(pos);
    setIsConfirmed(false);
    onLocationConfirm(place.latitude, place.longitude, false);
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
        <CardDescription>
          Search for your venue address and confirm the exact location on the map
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Search Address</Label>
          <LocationAutocomplete
            value={address}
            onSelect={handlePlaceSelect}
            placeholder="Start typing your venue address..."
            className={validationErrors.address ? "border-destructive" : ""}
          />
          {validationErrors.address && (
            <p className="text-sm text-destructive">{validationErrors.address}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          {city && (
            <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg text-sm">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">City:</span>
              <span className="font-medium">{city}</span>
            </div>
          )}
          <div className="space-y-1">
            <Label htmlFor="zipCode" className="text-sm">Zip Code / Postal Code</Label>
            <Input
              id="zipCode"
              placeholder="e.g., 0010"
              value={zipCode}
              onChange={(e) => onZipCodeChange?.(e.target.value)}
              className={validationErrors.zipCode ? "border-destructive" : ""}
              maxLength={10}
            />
            {validationErrors.zipCode && (
              <p className="text-sm text-destructive">{validationErrors.zipCode}</p>
            )}
          </div>
        </div>

        <div className="relative rounded-lg overflow-hidden border border-border">
          <MapsReady>
            <YandexMap
              style={{ width: "100%", height: "300px" }}
              ariaLabel="Venue location"
              center={mapCenter}
              zoom={13}
              onClick={handleMapClick}
            >
              {selectedPosition && (
                <YandexMarker
                  position={selectedPosition}
                  anchor="bottom"
                  draggable
                  onDragEnd={handleMarkerDragEnd}
                >
                  <MapPinMarker />
                </YandexMarker>
              )}
            </YandexMap>
          </MapsReady>
          <div className="absolute bottom-2 left-2 bg-background/90 backdrop-blur-sm rounded px-2 py-1 text-xs text-muted-foreground">
            Click the map or drag the pin to adjust
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

        {validationErrors.location && (
          <p className="text-sm text-destructive">{validationErrors.location}</p>
        )}
      </CardContent>
    </Card>
  );
};
