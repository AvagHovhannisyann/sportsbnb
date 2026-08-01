import React, { useState, useEffect, useRef, useCallback } from "react";
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
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const searchAll = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSuggestions([]);
      return;
    }

    setIsLoading(true);
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
      setIsOpen(allSuggestions.length > 0);
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
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => searchAll(newValue), 250);
  };

  const handleSelect = async (suggestion: SearchSuggestion) => {
    setInputValue("");
    setSuggestions([]);
    setIsOpen(false);

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
      case "venue": return <Building className="h-4 w-4 text-primary" />;
      case "game": return <Gamepad2 className="h-4 w-4 text-green-500" />;
      case "sport": return <Tag className="h-4 w-4 text-orange-500" />;
      case "location": return <MapPin className="h-4 w-4 text-muted-foreground" />;
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
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => suggestions.length > 0 && setIsOpen(true)}
          placeholder={placeholder}
          className="pl-10 pr-10 h-12"
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 animate-spin text-muted-foreground" />
        )}
        {!isLoading && inputValue && (
          <button
            aria-label="Clear search"
            type="button"
            onClick={() => { setInputValue(""); setSuggestions([]); setIsOpen(false); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {isOpen && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-2 bg-popover border border-border rounded-xl shadow-lg overflow-hidden">
          <div className="max-h-80 overflow-auto">
            {Object.entries(groupedSuggestions).map(([type, items]) => (
              <div key={type}>
                <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground bg-muted/50 uppercase tracking-wider">
                  {getTypeLabel(type as SearchSuggestion["type"])}s
                </div>
                <ul>
                  {items.map((suggestion) => {
                    const globalIndex = suggestions.indexOf(suggestion);
                    return (
                      <li
                        key={suggestion.id}
                        className={cn(
                          "px-3 py-2.5 cursor-pointer flex items-center gap-3 transition-colors",
                          globalIndex === selectedIndex
                            ? "bg-accent text-accent-foreground"
                            : "hover:bg-muted"
                        )}
                        onClick={() => handleSelect(suggestion)}
                        onMouseEnter={() => setSelectedIndex(globalIndex)}
                      >
                        {getIcon(suggestion.type)}
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">{suggestion.title}</div>
                          {suggestion.subtitle && (
                            <div className="text-xs text-muted-foreground truncate">
                              {suggestion.subtitle}
                            </div>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
          <div className="px-3 py-1.5 text-xs text-muted-foreground border-t border-border bg-muted/30">
            Press ↵ to select • Esc to close
          </div>
        </div>
      )}
    </div>
  );
};

export default SmartSearch;
