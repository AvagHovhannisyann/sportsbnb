import React, { useState, useEffect, useRef, useCallback } from "react";
import { MapPin, Loader2, X, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useRegion } from "@/hooks/useRegion";

export interface LocationPlace {
  name: string;
  city?: string;
  country?: string;
  formattedAddress: string;
  latitude: number;
  longitude: number;
  type?: string;
}

interface Prediction {
  description: string;
  place_id: string;
  structured_formatting: {
    main_text: string;
    secondary_text?: string;
  };
}

interface LocationAutocompleteProps {
  value: string;
  onSelect: (place: LocationPlace) => void;
  onClear?: () => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  error?: string;
  defaultLatitude?: number;
  defaultLongitude?: number;
}

export const LocationAutocomplete: React.FC<LocationAutocompleteProps> = ({
  value,
  onSelect,
  onClear,
  placeholder = "Search for a location...",
  className,
  disabled = false,
  error,
  defaultLatitude,
  defaultLongitude,
}) => {
  const { defaultCenter } = useRegion();
  const [inputValue, setInputValue] = useState(value);
  const [suggestions, setSuggestions] = useState<Prediction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const autocompleteServiceRef = useRef<google.maps.places.AutocompleteService | null>(null);
  const geocoderRef = useRef<google.maps.Geocoder | null>(null);

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getAutocompleteService = () => {
    if (!autocompleteServiceRef.current && typeof google !== "undefined" && google.maps?.places) {
      autocompleteServiceRef.current = new google.maps.places.AutocompleteService();
    }
    return autocompleteServiceRef.current;
  };

  const getGeocoder = () => {
    if (!geocoderRef.current && typeof google !== "undefined" && google.maps) {
      geocoderRef.current = new google.maps.Geocoder();
    }
    return geocoderRef.current;
  };

  const searchLocations = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSuggestions([]);
      return;
    }

    setIsLoading(true);
    try {
      const service = getAutocompleteService();
      if (!service) {
        setIsLoading(false);
        return;
      }

      const centerLat = defaultLatitude ?? defaultCenter.lat;
      const centerLng = defaultLongitude ?? defaultCenter.lng;

      service.getPlacePredictions(
        {
          input: query,
          locationBias: new google.maps.Circle({
            center: { lat: centerLat, lng: centerLng },
            radius: 50000,
          }),
        },
        (predictions, status) => {
          if (status === google.maps.places.PlacesServiceStatus.OK && predictions) {
            setSuggestions(predictions as unknown as Prediction[]);
            setIsOpen(predictions.length > 0);
            setSelectedIndex(-1);
          } else {
            setSuggestions([]);
          }
          setIsLoading(false);
        }
      );
    } catch (err) {
      console.error("Autocomplete error:", err);
      setSuggestions([]);
      setIsLoading(false);
    }
  }, [defaultLatitude, defaultLongitude]);

  const resolvePlace = async (prediction: Prediction): Promise<LocationPlace | null> => {
    try {
      const geocoder = getGeocoder();
      if (!geocoder) return null;

      const result = await geocoder.geocode({ placeId: prediction.place_id });
      if (!result.results.length) return null;

      const geoResult = result.results[0];
      const loc = geoResult.geometry.location;

      const getComponent = (type: string) =>
        geoResult.address_components?.find(c => c.types.includes(type))?.long_name;

      return {
        name: prediction.structured_formatting.main_text,
        city: getComponent("locality") || getComponent("administrative_area_level_1"),
        country: getComponent("country"),
        formattedAddress: geoResult.formatted_address,
        latitude: loc.lat(),
        longitude: loc.lng(),
        type: geoResult.types?.[0],
      };
    } catch (err) {
      console.error("Geocoder resolve error:", err);
      return null;
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => searchLocations(newValue), 250);
  };

  const handleSelect = async (item: Prediction) => {
    setInputValue(item.description);
    setSuggestions([]);
    setIsOpen(false);
    setIsLoading(true);

    const place = await resolvePlace(item);
    setIsLoading(false);

    if (place) {
      onSelect(place);
    }
  };

  const handleClear = () => {
    setInputValue("");
    setSuggestions([]);
    setIsOpen(false);
    onClear?.();
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return;
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, suggestions.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
        break;
      case "Enter":
        e.preventDefault();
        if (selectedIndex >= 0 && suggestions[selectedIndex]) {
          handleSelect(suggestions[selectedIndex]);
        }
        break;
      case "Escape":
        setIsOpen(false);
        break;
    }
  };

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => suggestions.length > 0 && setIsOpen(true)}
          placeholder={placeholder}
          disabled={disabled}
          className={cn("pl-10 pr-10", error && "border-destructive")}
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
        {!isLoading && inputValue && (
          <button
            aria-label="Clear location"
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {error && <p className="text-sm text-destructive mt-1">{error}</p>}

      {isOpen && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-lg shadow-lg overflow-hidden">
          <ul className="max-h-60 overflow-auto py-1">
            {suggestions.map((item, index) => (
              <li
                key={item.place_id}
                className={cn(
                  "px-3 py-2 cursor-pointer flex items-start gap-3 transition-colors",
                  index === selectedIndex
                    ? "bg-accent text-accent-foreground"
                    : "hover:bg-muted"
                )}
                onClick={() => handleSelect(item)}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                <MapPin className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{item.structured_formatting.main_text}</div>
                  {item.structured_formatting.secondary_text && (
                    <div className="text-xs text-muted-foreground truncate">
                      {item.structured_formatting.secondary_text}
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default LocationAutocomplete;
