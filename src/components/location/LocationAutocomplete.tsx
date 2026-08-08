import React, { useState, useEffect, useRef, useCallback } from "react";
import { MapPin, Loader2, X, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useRegion } from "@/hooks/useRegion";
import { supabase } from "@/integrations/supabase/client";
import {
  formatYandexLl,
  geocode,
  geosuggestFullText,
  toLocationPlace,
  type GeosuggestItem,
  type LocationPlace,
} from "@/lib/yandexGeo";

/** Browser-callable geocoder key, same one SmartSearch uses. */
const YANDEX_GEOCODER_API_KEY = import.meta.env.VITE_YANDEX_GEOCODER_KEY ?? "";

/** What this component hands back. Unchanged, so callers did not move. */
export type { LocationPlace };

/**
 * One row in the dropdown.
 *
 * Was a `google.maps.places.AutocompletePrediction`, keyed by `place_id` and
 * resolved through the Places geocoder. Yandex's equivalent is Geosuggest,
 * which the app already proxies through the `geosuggest` edge function — the
 * key for it is server-side, so the suggest quota is not exposed in the
 * bundle the way Places' was.
 */
interface Suggestion {
  /** Stable key. Geosuggest has no id, so position in the response is it. */
  id: string;
  mainText: string;
  secondaryText?: string;
  /** Full line, used as the input's value and as the geocode fallback. */
  fullText: string;
  /** `ymapsbm1://…`, when Geosuggest gives one. Resolves precisely. */
  uri?: string;
}

interface LocationAutocompleteProps {
  /**
   * Put on the inner `<input>`, so a `<Label htmlFor=…>` outside this
   * component can actually reach it.
   *
   * Without it the label pointed at nothing — `CreateGamePage` rendered
   * `<Label htmlFor="location">Location Address *</Label>` above a component
   * that had no element with that id — so Chrome fell back to naming the field
   * by its placeholder. `a11y-names` passed it, correctly: the control did have
   * an accessible name. It was just not the one printed beside it, which is
   * what WCAG 2.5.3 is about and what a speech-input user says out loud.
   */
  id?: string;
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
  id,
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
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  /** Guards against an earlier, slower request overwriting a later one. */
  const requestSeq = useRef(0);

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

  const centerLat = defaultLatitude ?? defaultCenter.lat;
  const centerLng = defaultLongitude ?? defaultCenter.lng;

  const searchLocations = useCallback(
    async (query: string) => {
      if (query.length < 2) {
        setSuggestions([]);
        return;
      }

      const seq = ++requestSeq.current;
      setIsLoading(true);
      try {
        // The bias window is expressed the Yandex way — `ll` is
        // "longitude,latitude" — and matches what SmartSearch and the edge
        // function already send.
        const ll = formatYandexLl({ lat: centerLat, lng: centerLng });
        const { data, error: fnError } = await supabase.functions.invoke("geosuggest", {
          body: { text: query, lang: "en", results: 6, ll, spn: "2,2", ull: ll },
        });
        if (seq !== requestSeq.current) return;

        if (fnError) {
          console.error("Geosuggest lookup failed", fnError);
          setSuggestions([]);
          return;
        }

        const items: GeosuggestItem[] = Array.isArray(data?.results) ? data.results : [];
        const next = items
          .map((item, index) => ({
            id: `geosuggest-${index}`,
            mainText: item.title?.text ?? "",
            secondaryText: item.subtitle?.text,
            fullText: geosuggestFullText(item),
            uri: item.uri,
          }))
          .filter((s) => s.mainText || s.fullText);

        setSuggestions(next);
        setIsOpen(next.length > 0);
        setSelectedIndex(-1);
      } catch (err) {
        if (seq !== requestSeq.current) return;
        console.error("Autocomplete error:", err);
        setSuggestions([]);
      } finally {
        if (seq === requestSeq.current) setIsLoading(false);
      }
    },
    [centerLat, centerLng],
  );

  /**
   * Turn a suggestion into coordinates.
   *
   * Geosuggest returns text, not a position, so this is the second half of
   * what Places' `getDetails` did in one call. The `uri` is preferred over
   * the text because it names one place; the text can match several.
   */
  const resolvePlace = async (suggestion: Suggestion): Promise<LocationPlace | null> => {
    if (!YANDEX_GEOCODER_API_KEY) {
      console.error("VITE_YANDEX_GEOCODER_KEY is not set; cannot resolve a location");
      return null;
    }
    const [place] = await geocode({
      apiKey: YANDEX_GEOCODER_API_KEY,
      uri: suggestion.uri,
      geocode: suggestion.fullText,
      results: 1,
      ll: { lat: centerLat, lng: centerLng },
    });
    if (!place) return null;
    return toLocationPlace(place, suggestion);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => searchLocations(newValue), 250);
  };

  const handleSelect = async (item: Suggestion) => {
    setInputValue(item.fullText);
    setSuggestions([]);
    setIsOpen(false);
    setIsLoading(true);

    const place = await resolvePlace(item);
    setIsLoading(false);

    if (place) onSelect(place);
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
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <Input
          id={id}
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
          <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground motion-reduce:animate-none" aria-hidden="true" />
        )}
        {!isLoading && inputValue && (
          <button
            aria-label="Clear location"
            type="button"
            onClick={handleClear}
            className="focus-ring absolute right-0 top-0 flex h-11 w-11 touch-manipulation items-center justify-center rounded-lg text-muted-foreground transition-colors duration-150 hover:text-foreground motion-reduce:transition-none"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
      </div>

      {error && <p className="text-sm text-destructive mt-1">{error}</p>}

      {isOpen && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-lg shadow-lg overflow-hidden">
          <ul className="max-h-60 overflow-auto py-1">
            {suggestions.map((item, index) => (
              <li
                key={item.id}
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
                  <div className="font-medium text-sm truncate">{item.mainText}</div>
                  {item.secondaryText && (
                    <div className="text-xs text-muted-foreground truncate">
                      {item.secondaryText}
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
