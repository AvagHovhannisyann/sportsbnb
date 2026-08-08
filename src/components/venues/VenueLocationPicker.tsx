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
import { cn } from "@/lib/utils";

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
    <Card className={validationErrors.location ? "border-destructive/60" : undefined}>
      <CardHeader className="p-5 sm:p-6">
        <CardTitle as="h2" className="flex items-center gap-2">
          <MapPin className="h-5 w-5 text-primary" aria-hidden="true" />
          Location &amp; address <span aria-hidden="true">*</span>
        </CardTitle>
        <CardDescription>
          Search for the address, position the pin, then confirm the exact venue entrance.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5 px-5 pb-5 sm:px-6 sm:pb-6">
        <div
          className="space-y-2"
          role="group"
          aria-labelledby="venue-address-label"
          aria-describedby={validationErrors.address ? "venue-address-error" : undefined}
        >
          <Label id="venue-address-label" htmlFor="venue-address-search">
            Search address <span aria-hidden="true">*</span>
          </Label>
          <LocationAutocomplete
            id="venue-address-search"
            value={address}
            onSelect={handlePlaceSelect}
            placeholder="Start typing your venue address..."
            className={cn(
              "[&_button]:right-0 [&_button]:flex [&_button]:h-11 [&_button]:w-11 [&_button]:items-center [&_button]:justify-center [&_input]:pr-11",
              validationErrors.address && "[&_input]:border-destructive",
            )}
          />
          {validationErrors.address && (
            <p id="venue-address-error" role="alert" className="text-sm text-destructive">{validationErrors.address}</p>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <p className="text-sm font-medium text-foreground">City</p>
            <div className="flex min-h-11 items-center gap-2 rounded-lg border border-border bg-surface-1 px-3.5 text-sm">
              <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              <span className={city ? "font-medium text-foreground" : "text-muted-foreground"}>
                {city || "Filled from the selected address"}
              </span>
            </div>
            {validationErrors.city && (
              <p id="venue-city-error" role="alert" className="text-sm text-destructive">{validationErrors.city}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="zipCode">Postal code</Label>
            <Input
              id="zipCode"
              name="zipCode"
              autoComplete="postal-code"
              placeholder="e.g., 0010"
              value={zipCode}
              onChange={(e) => onZipCodeChange?.(e.target.value)}
              maxLength={10}
              aria-invalid={!!validationErrors.zipCode}
              aria-describedby={validationErrors.zipCode ? "venue-postal-error" : undefined}
            />
            {validationErrors.zipCode && (
              <p id="venue-postal-error" role="alert" className="text-sm text-destructive">{validationErrors.zipCode}</p>
            )}
          </div>
        </div>

        <div
          className="relative overflow-hidden rounded-lg border border-border bg-surface-1"
          aria-describedby="venue-map-instructions"
        >
          <MapsReady>
            <YandexMap
              className="h-72 w-full sm:h-80"
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
          <div
            id="venue-map-instructions"
            className="absolute bottom-2 left-2 right-2 w-fit max-w-[calc(100%_-_1rem)] rounded-md border border-border bg-card px-2.5 py-1.5 text-xs text-muted-foreground shadow-sm"
          >
            Click the map or drag the pin to adjust
          </div>
        </div>

        {selectedPosition && (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface-1 p-3">
              <div className="flex min-w-0 items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                <span className="min-w-0 text-sm text-muted-foreground">
                  Selected coordinates<br />
                  <span className="break-all font-mono text-xs font-medium text-foreground">
                    {selectedPosition.lat.toFixed(6)}, {selectedPosition.lng.toFixed(6)}
                  </span>
                </span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={handleClearLocation}
                aria-label="Clear selected location"
              >
                <X aria-hidden="true" />
              </Button>
            </div>
            {!isConfirmed ? (
              <Button type="button" onClick={handleConfirmLocation} className="w-full">
                <Check aria-hidden="true" />
                Confirm this location
              </Button>
            ) : (
              <Alert className="border-primary/30 bg-primary-soft">
                <Check className="h-4 w-4 text-primary" aria-hidden="true" />
                <AlertDescription className="font-medium text-foreground">
                  Location confirmed. You can continue with the listing.
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {validationErrors.location && (
          <p id="venue-location-error" role="alert" className="text-sm text-destructive">{validationErrors.location}</p>
        )}
      </CardContent>
    </Card>
  );
};
