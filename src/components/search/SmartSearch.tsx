import React, { useState, useEffect, useRef, useCallback, useId } from "react";
import { MapPin, Loader2, X, Search, Building, Gamepad2, Tag } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { sportTypes } from "@/data/constants";
import { orIlike } from "@/lib/postgrest";
import {
  YEREVAN,
  formatYandexLl,
  geocode,
  geosuggestFullText,
  type GeosuggestItem,
} from "@/lib/yandexGeo";

// Browser-callable geocoder key. It is necessarily public — it ships in the
// bundle — but it was hardcoded here, which meant it could not be swapped per
// environment or rotated without a code change, and it sits in git history.
// Configured like VITE_YANDEX_MAPS_API_KEY instead. Restrict it by HTTP
// referrer in the Yandex console; the quota is billable. Note that this is a
// *different* key from the Maps one — Geocoder and JS API are separate Yandex
// products and neither key authorises the other.
const YANDEX_GEOCODER_API_KEY = import.meta.env.VITE_YANDEX_GEOCODER_KEY ?? "";

interface SearchSuggestion {
  id: string;
  type: "location" | "venue" | "game" | "sport";
  title: string;
  subtitle?: string;
  data?: any;
}

interface SmartSearchProps {
  placeholder?: string;
  className?: string;
  onLocationSelect?: (lat: number, lng: number, address: string) => void;
}

export const SmartSearch: React.FC<SmartSearchProps> = ({
  placeholder = "Search venues, games, or locations...",
  className,
  onLocationSelect,
}) => {
  const navigate = useNavigate();
  const [inputValue, setInputValue] = useState("");
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const listboxId = useId();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(
    () => () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    },
    [],
  );

  const searchAll = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSuggestions([]);
      setIsOpen(false);
      setHasSearched(false);
      return;
    }

    setIsLoading(true);
    setHasSearched(false);
    setIsOpen(true);
    const allSuggestions: SearchSuggestion[] = [];

    try {
      // Sport matching (local), against the one list venues are tagged from.
      //
      // This was a second copy of it, hardcoded here: twelve entries against
      // the canonical twenty, and not a subset. It offered "Running", which is
      // not a sport any venue can be tagged with, so accepting that suggestion
      // navigated to a filter that could never match anything. And it was
      // missing Boxing, Yoga, Table Tennis, Squash, Hockey, Baseball, Martial
      // Arts, Dance and Climbing — nine real sports that a venue can offer and
      // that this search would never suggest, however far you typed their name.
      sportTypes
        .filter(sport => sport.toLowerCase().includes(query.toLowerCase()))
        .slice(0, 2)
        .forEach(sport => {
          allSuggestions.push({
            id: `sport-${sport}`,
            type: "sport",
            title: sport,
            subtitle: "Sport category",
            data: { sport },
          });
        });

      // DB searches + Geosuggest in parallel
      const [venuesRes, gamesRes, geosuggestRes] = await Promise.all([
        supabase
          .from("venues")
          .select("id, name, city, address")
          .eq("is_active", true)
          .or(orIlike(["name", "city", "address"], query))
          .limit(3),
        supabase
          .from("games")
          .select("id, title, sport, location")
          .eq("status", "open")
          .gte("game_date", new Date().toISOString().split("T")[0])
          .or(orIlike(["title", "sport", "location"], query))
          .limit(3),
        supabase.functions.invoke("geosuggest", {
          body: {
            text: query,
            lang: "en",
            results: 4,
            // "longitude,latitude" — see src/lib/yandexGeo.ts.
            ll: formatYandexLl(YEREVAN),
            spn: "2,2",
            ull: formatYandexLl(YEREVAN),
          },
        }).then(({ data, error }) => error ? { results: [] } : data).catch(() => ({ results: [] })),
      ]);

      // Errors used to be dropped here, so a 400 and a genuine no-match drew
      // the same empty dropdown. They are still not shown to the user — a
      // suggestion list is the wrong place for an error panel — but they reach
      // the console, which is the difference between a reproducible bug and an
      // invisible one.
      if (venuesRes.error) console.error("SmartSearch venue lookup failed", venuesRes.error);
      if (gamesRes.error) console.error("SmartSearch game lookup failed", gamesRes.error);

      venuesRes.data?.forEach(venue => {
        allSuggestions.push({
          id: `venue-${venue.id}`,
          type: "venue",
          title: venue.name,
          subtitle: venue.address || venue.city,
          data: venue,
        });
      });

      gamesRes.data?.forEach(game => {
        allSuggestions.push({
          id: `game-${game.id}`,
          type: "game",
          title: game.title,
          subtitle: `${game.sport} • ${game.location}`,
          data: game,
        });
      });

      const geosuggestItems = geosuggestRes?.results || [];

      if (geosuggestItems.length > 0) {
        geosuggestItems.forEach((item: GeosuggestItem, index: number) => {
          allSuggestions.push({
            id: `location-${index}`,
            type: "location",
            title: item.title?.text || "Location",
            subtitle: item.subtitle?.text,
            data: { uri: item.uri, fullText: geosuggestFullText(item) },
          });
        });
      } else {
        // Geosuggest returned nothing — fall back to the Geocoder, which is
        // looser about partial names. Response parsing lives in yandexGeo so
        // the "longitude first" reading is written down once; this used to
        // dig through `featureMember[].GeoObject.Point.pos` by hand here.
        const places = await geocode({
          apiKey: YANDEX_GEOCODER_API_KEY,
          geocode: query,
          results: 4,
          restrictToSpn: true,
        });
        places.forEach((place, index) => {
          allSuggestions.push({
            id: `location-fallback-${index}`,
            type: "location",
            title: place.name || "Location",
            subtitle: place.formattedAddress,
            data: { fullText: place.formattedAddress, ...place },
          });
        });
      }

      setSuggestions(allSuggestions);
      setIsOpen(true);
      setHasSearched(true);
      setSelectedIndex(-1);
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const resolveLocationCoords = async (data: any): Promise<{ lat: number; lng: number; address: string } | null> => {
    // A fallback suggestion already carries its coordinates — it came from the
    // Geocoder — so there is nothing to look up a second time.
    if (typeof data?.latitude === "number" && typeof data?.longitude === "number") {
      return { lat: data.latitude, lng: data.longitude, address: data.fullText };
    }
    // Without a key the request is rejected by Yandex anyway; `geocode`
    // short-circuits to an empty list, which keeps venue and game suggestions
    // working instead of failing the whole search.
    const [place] = await geocode({
      apiKey: YANDEX_GEOCODER_API_KEY,
      uri: data?.uri,
      geocode: data?.fullText,
      results: 1,
    });
    if (!place) return null;
    return {
      lat: place.latitude,
      lng: place.longitude,
      address: place.formattedAddress || data?.fullText,
    };
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    setHasSearched(false);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => searchAll(newValue), 250);
  };

  const handleSelect = async (suggestion: SearchSuggestion) => {
    setInputValue("");
    setSuggestions([]);
    setIsOpen(false);
    setHasSearched(false);

    switch (suggestion.type) {
      case "venue":
        navigate(`/venue/${suggestion.data.id}`);
        break;
      case "game":
        navigate(`/game/${suggestion.data.id}`);
        break;
      case "sport":
        navigate(`/venues?sport=${encodeURIComponent(suggestion.data.sport)}`);
        break;
      case "location": {
        const coords = await resolveLocationCoords(suggestion.data);
        if (coords) {
          if (onLocationSelect) {
            onLocationSelect(coords.lat, coords.lng, coords.address);
          } else {
            navigate(`/venues?lat=${coords.lat}&lng=${coords.lng}`);
          }
        }
        break;
      }
    }
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

  const getIcon = (type: SearchSuggestion["type"]) => {
    switch (type) {
      case "venue": return <Building className="h-4 w-4 text-primary" aria-hidden="true" />;
      case "game": return <Gamepad2 className="h-4 w-4 text-information" aria-hidden="true" />;
      case "sport": return <Tag className="h-4 w-4 text-brand-tuff" aria-hidden="true" />;
      case "location": return <MapPin className="h-4 w-4 text-muted-foreground" aria-hidden="true" />;
    }
  };

  const getTypeLabel = (type: SearchSuggestion["type"]) => {
    switch (type) {
      case "venue": return "Venue";
      case "game": return "Game";
      case "sport": return "Sport";
      case "location": return "Location";
    }
  };

  const groupedSuggestions = suggestions.reduce((acc, s) => {
    if (!acc[s.type]) acc[s.type] = [];
    acc[s.type].push(s);
    return acc;
  }, {} as Record<string, SearchSuggestion[]>);

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <div className="relative">
        <Search
          className="absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => suggestions.length > 0 && setIsOpen(true)}
          placeholder={placeholder}
          role="combobox"
          aria-label="Search venues, games, sports, or locations"
          aria-autocomplete="list"
          aria-expanded={isOpen}
          aria-controls={listboxId}
          aria-activedescendant={
            selectedIndex >= 0 && suggestions[selectedIndex]
              ? `${listboxId}-option-${selectedIndex}`
              : undefined
          }
          autoComplete="off"
          className="h-12 pl-11 pr-12"
        />
        {isLoading && (
          <>
            <Loader2
              className="absolute right-3.5 top-1/2 h-5 w-5 -translate-y-1/2 animate-spin text-muted-foreground motion-reduce:animate-none"
              aria-hidden="true"
            />
            <span className="sr-only" role="status">Searching</span>
          </>
        )}
        {!isLoading && inputValue && (
          <button
            aria-label="Clear search"
            type="button"
            onClick={() => {
              setInputValue("");
              setSuggestions([]);
              setIsOpen(false);
              setHasSearched(false);
              inputRef.current?.focus();
            }}
            className="absolute right-0 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground outline-none transition-colors duration-150 motion-reduce:transition-none hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        )}
      </div>

      {isOpen && (suggestions.length > 0 || hasSearched || isLoading) && (
        <div className="absolute z-50 mt-2 w-full overflow-hidden rounded-xl border border-border bg-popover shadow-lg">
          <div
            id={listboxId}
            role="listbox"
            aria-label="Search suggestions"
            className="max-h-[min(22rem,55vh)] overflow-y-auto overscroll-contain p-1.5"
          >
            {isLoading && suggestions.length === 0 ? (
              <div className="flex min-h-16 items-center gap-3 px-3 text-sm text-muted-foreground" role="status">
                <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
                Looking for matches…
              </div>
            ) : suggestions.length === 0 ? (
              <div className="px-3 py-5 text-sm text-muted-foreground" role="status">
                No matches yet. Try a venue, sport, or neighborhood.
              </div>
            ) : (
              Object.entries(groupedSuggestions).map(([type, items]) => (
                <div
                  key={type}
                  role="group"
                  aria-label={`${getTypeLabel(type as SearchSuggestion["type"])} suggestions`}
                >
                  <div className="px-3 pb-1 pt-2 text-xs font-semibold text-muted-foreground">
                    {getTypeLabel(type as SearchSuggestion["type"])}s
                  </div>
                  {items.map((suggestion) => {
                    const globalIndex = suggestions.indexOf(suggestion);
                    return (
                      <button
                        key={suggestion.id}
                        id={`${listboxId}-option-${globalIndex}`}
                        type="button"
                        role="option"
                        aria-selected={globalIndex === selectedIndex}
                        className={cn(
                          "flex min-h-11 w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-left outline-none transition-colors duration-100 motion-reduce:transition-none",
                          globalIndex === selectedIndex
                            ? "bg-accent text-accent-foreground"
                            : "hover:bg-surface-1 focus-visible:bg-accent",
                        )}
                        onClick={() => handleSelect(suggestion)}
                        onMouseDown={(event) => event.preventDefault()}
                        onMouseEnter={() => setSelectedIndex(globalIndex)}
                      >
                        {getIcon(suggestion.type)}
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium">{suggestion.title}</span>
                          {suggestion.subtitle && (
                            <span className="block truncate text-xs text-muted-foreground">
                              {suggestion.subtitle}
                            </span>
                          )}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ))
            )}
          </div>
          {suggestions.length > 0 && (
            <p className="hidden border-t border-border bg-surface-1 px-3 py-2 text-xs text-muted-foreground sm:block">
              Use ↑ and ↓ to browse · Enter to select · Esc to close
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default SmartSearch;
