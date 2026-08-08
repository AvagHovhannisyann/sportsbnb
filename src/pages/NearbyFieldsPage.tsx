import React, { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MapsReady } from "@/components/maps/YandexMapsProvider";
import { YandexMap, YandexMarker, YandexPopup } from "@/components/maps/YandexMap";
import { MapDotMarker, MapMarkerButton } from "@/components/maps/MapPinMarker";
import type { LatLng } from "@/lib/yandexGeo";
import { MapPin, Users, Sun, Moon, Zap, List, Map as MapIcon, Filter, ChevronRight, Plus, Check, Star, Clock, TrendingUp, BadgeCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useVerifiedFields } from "@/hooks/useVerifiedFields";
import { useVenues } from "@/hooks/useVenues";
import { useRegion } from "@/hooks/useRegion";
import Layout from "@/components/layout/Layout";
import SEOHead from "@/components/seo/SEOHead";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const SPORT_COLORS: Record<string, string> = {
  football: "hsl(var(--primary))",
  basketball: "hsl(var(--brand-tuff))",
  tennis: "hsl(var(--warning))",
  volleyball: "hsl(var(--chart-4))",
  running: "hsl(var(--information))",
  cycling: "hsl(var(--chart-2))",
  swimming: "hsl(var(--information))",
  "multi-sport": "hsl(var(--chart-5))",
};

const getSportColor = (sport: string) => SPORT_COLORS[sport] || "hsl(var(--primary))";

/**
 * How busy a field is, said once.
 *
 * This was two separate ternaries — one in the map's info window, one on the
 * list card — that produced different strings, and both prefixed the label
 * with a coloured circle emoji while the badge around it was *already*
 * carrying the same colour. The signal was stated three times: in the emoji,
 * in the text, and in the chip.
 *
 * The chip colours were also raw palette, and measured on the card surface:
 *
 *   text-green-600 4.34:1 · text-amber-600 4.49:1 · text-red-600 3.07:1
 *
 * All three under the 4.5:1 that text this size needs. Nothing caught it —
 * `palette-contrast.mjs` looks for `bg-<palette>-<shade>` paired with
 * text-white/black, and this shape is a palette *text* colour on a tint, which
 * that check structurally cannot see. The token tints below measure 6.05, 7.13
 * and 4.61 in the same place.
 */
const BUSYNESS = {
  likely_free: {
    label: "Likely free",
    chip: "border-success/20 bg-success/10 text-success",
  },
  moderate: {
    label: "Moderate",
    chip: "border-warning/20 bg-warning/10 text-warning",
  },
  busy: {
    label: "Busy",
    chip: "border-destructive/20 bg-destructive/10 text-destructive",
  },
} as const;

const busynessOf = (score: string | null | undefined) =>
  score && score !== "unknown" ? BUSYNESS[score as keyof typeof BUSYNESS] ?? null : null;

const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const NearbyFieldsPage: React.FC = () => {
  const navigate = useNavigate();
  // `<MapsReady>` is safe to wrap the map with again.
  //
  // It was not, under Google: JSX evaluates children before the wrapper
  // decides whether to render them, and the markers' `icon` props contained
  // `new google.maps.Size(...)`. With no Maps key — CI, and any deployment
  // without one — that threw "google is not defined" and took the whole page
  // down, so this page had to read the load state itself and branch. The
  // Yandex markers are plain components with no global in their props, so
  // there is nothing left to evaluate early.
  const { fields, isLoading, checkIn } = useVerifiedFields();
  const { data: venues } = useVenues();
  const { defaultCenter, regionLabel } = useRegion();
  const [view, setView] = useState<"map" | "list">("map");
  const [sportFilter, setSportFilter] = useState<string>("all");
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedMarker, setSelectedMarker] = useState<any>(null);
  const [selectedMarkerType, setSelectedMarkerType] = useState<"field" | "venue" | null>(null);

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        toast.success("Location found!");
      },
      () => {
        setUserLocation(defaultCenter);
        toast.info(`Using ${regionLabel} as default location`);
      },
      { enableHighAccuracy: true, timeout: 5000 }
    );
  }, []);

  const allSports = useMemo(() => {
    const sports = new Set<string>();
    fields.forEach(f => sports.add(f.sport_type));
    return Array.from(sports).sort();
  }, [fields]);

  const filteredFields = useMemo(() => {
    let result = fields;
    if (sportFilter !== "all") {
      result = result.filter(f => f.sport_type === sportFilter);
    }
    if (userLocation) {
      result = result
        .map(f => ({ ...f, distance: getDistance(userLocation.lat, userLocation.lng, f.latitude, f.longitude) }))
        .sort((a, b) => a.distance - b.distance);
    }
    return result;
  }, [fields, sportFilter, userLocation]);

  const promotedVenues = useMemo(() => {
    if (!venues) return [];
    let result = venues.filter(v => v.is_active);
    if (sportFilter !== "all") {
      result = result.filter(v => v.sports?.includes(sportFilter));
    }
    if (userLocation) {
      result = result
        .filter(v => v.latitude && v.longitude)
        .map(v => ({ ...v, distance: getDistance(userLocation.lat, userLocation.lng, v.latitude!, v.longitude!) }))
        .sort((a, b) => (a as any).distance - (b as any).distance)
        .slice(0, 5);
    }
    return result;
  }, [venues, sportFilter, userLocation]);

  const mapCenter: LatLng = userLocation || defaultCenter;

  return (
    <Layout>
      {/* No " | Sportsbnb" in the title — SEOHead appends the site name
          itself, so passing it made the tab read "Nearby Sports Fields |
          Sportsbnb | Sportsbnb". */}
      <SEOHead
        title="Nearby Sports Fields"
        description="Discover verified public sports fields and courts near you. See real-time occupancy, check in, and find the best spots to play."
      />

      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="sticky top-16 z-30 border-b border-border bg-card/95 backdrop-blur-md supports-[backdrop-filter]:bg-card/90">
          <div className="container py-3">
            {/* Wraps: at 375px the heading plus the three controls came to
                438px against a 375px viewport, so the whole page scrolled
                sideways. */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-xl font-semibold text-foreground">Nearby fields</h1>
                <p className="text-sm text-muted-foreground">
                  {filteredFields.length} verified field{filteredFields.length !== 1 ? "s" : ""} found
                </p>
              </div>

              <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
                <Select value={sportFilter} onValueChange={setSportFilter}>
                  <SelectTrigger aria-label="Sport" className="h-11 min-w-36 flex-1 sm:w-40 sm:flex-none">
                    <Filter className="h-3.5 w-3.5" aria-hidden="true" />
                    <SelectValue placeholder="Sport" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All sports</SelectItem>
                    {allSports.map(s => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="flex overflow-hidden rounded-lg border border-border-interactive bg-card">
                  {/* Both buttons carry an *inset* ring rather than the app's
                      `focus-ring` utility. That utility is `ring-offset-2`,
                      and an offset ring drawn inside this `overflow-hidden`
                      container is clipped away by it — painted, then cropped,
                      which is the same invisible-indicator outcome by a
                      different route. An inset ring stays in the button's own
                      box. Before this the pair had no focus styling at all and
                      measured 98 and 64 changed pixels, which is the browser's
                      default outline and nothing of the app's.

                      The ring colour is set alongside the fill for a reason:
                      `--ring` and `--primary` are the same value in the dark
                      theme (151 90% 47%), so an inset `ring-ring` on the
                      active button is green on green. The first attempt at
                      this made the active button *worse* — 98 changed pixels
                      down to 24, because `outline-none` removed the browser
                      default and the ring it was replaced with was invisible.
                      `focus-ring` avoids the whole problem elsewhere with
                      `ring-offset-2`, which lifts the ring off the fill; that
                      is exactly what this container's `overflow-hidden`
                      crops. */}
                  <button
                    type="button"
                    aria-label="Map view"
                    aria-pressed={view === "map"}
                    onClick={() => setView("map")}
                    className={cn(
                      "flex h-11 w-11 items-center justify-center transition-colors duration-150 outline-none motion-reduce:transition-none focus-visible:ring-2 focus-visible:ring-inset",
                      view === "map"
                        ? "bg-primary text-primary-foreground focus-visible:ring-primary-foreground"
                        : "bg-background text-muted-foreground hover:bg-muted focus-visible:ring-ring"
                    )}
                  >
                    <MapIcon className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    aria-label="List view"
                    aria-pressed={view === "list"}
                    onClick={() => setView("list")}
                    className={cn(
                      "flex h-11 w-11 items-center justify-center transition-colors duration-150 outline-none motion-reduce:transition-none focus-visible:ring-2 focus-visible:ring-inset",
                      view === "list"
                        ? "bg-primary text-primary-foreground focus-visible:ring-primary-foreground"
                        : "bg-background text-muted-foreground hover:bg-muted focus-visible:ring-ring"
                    )}
                  >
                    <List className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>

                <Button variant="outline" className="h-11" onClick={() => navigate("/nearby/submit")}>
                  <Plus className="h-4 w-4" aria-hidden="true" /> Add field
                </Button>
              </div>
            </div>
          </div>
        </div>

        {view === "map" ? (
          // A named region. The Maps API injects its own unnamed pan controls,
          // which are not ours to fix — but the area they sit in is, and it
          // had no name either, so the map read as an anonymous block of the
          // page.
          <div
            role="region"
            aria-label="Map of nearby fields"
            className="h-[calc(100dvh-13rem)] min-h-[26rem] sm:h-[calc(100dvh-10.5rem)]"
          >
            <MapsReady>
              <YandexMap
                style={{ width: "100%", height: "100%" }}
                ariaLabel="Map of nearby fields"
                center={mapCenter}
                zoom={13}
              >
                {/* User location */}
                {userLocation && (
                  <YandexMarker position={userLocation} anchor="center" zIndex={10}>
                    <MapDotMarker size={20} color="hsl(var(--ring))" />
                  </YandexMarker>
                )}

                {/* Verified fields - colored by sport */}
                {filteredFields.map(field => (
                  <YandexMarker
                    key={field.id}
                    position={{ lat: field.latitude, lng: field.longitude }}
                    anchor="center"
                  >
                    <MapMarkerButton
                      label={`${field.name} — verified ${field.sport_type} field`}
                      onClick={() => { setSelectedMarker(field); setSelectedMarkerType("field"); }}
                    >
                      {/* The tick was an SVG <text> node inside a data URI, so
                          it set in whatever font the renderer picked. It is a
                          Lucide icon now, like every other tick in the app. */}
                      <MapDotMarker size={28} color={getSportColor(field.sport_type)}>
                        <Check className="h-3.5 w-3.5" strokeWidth={3} />
                      </MapDotMarker>
                    </MapMarkerButton>
                  </YandexMarker>
                ))}

                {/* Promoted venues */}
                {promotedVenues.map(venue => (
                  <YandexMarker
                    key={`venue-${venue.id}`}
                    position={{ lat: venue.latitude!, lng: venue.longitude! }}
                    anchor="center"
                    zIndex={5}
                  >
                    <MapMarkerButton
                      label={`${venue.name} — bookable venue`}
                      onClick={() => { setSelectedMarker(venue); setSelectedMarkerType("venue"); }}
                    >
                      {/* Was ⭐ in a data URI on #2563eb — a stock blue that
                          appears nowhere else in an app whose primary is
                          green. */}
                      <MapDotMarker size={32} color="hsl(var(--primary))">
                        <Star className="h-4 w-4 fill-current" />
                      </MapDotMarker>
                    </MapMarkerButton>
                  </YandexMarker>
                ))}

                {/* Field popup */}
                {selectedMarker && selectedMarkerType === "field" && (
                  <YandexPopup
                    position={{ lat: selectedMarker.latitude, lng: selectedMarker.longitude }}
                    onClose={() => setSelectedMarker(null)}
                    closeLabel="Close field details"
                  >
                    {/* This is our own DOM, not Google's white balloon, so the
                        literal light-surface colours these used are gone and
                        the popup follows the theme. */}
                    <h3 className="flex items-center gap-1 pr-5 text-sm font-semibold">
                      <BadgeCheck className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      <span className="truncate">{selectedMarker.name}</span>
                      <span className="shrink-0 text-xs text-success">
                        {selectedMarker.is_public ? "FREE" : "PAID"}
                      </span>
                    </h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {selectedMarker.sport_type} • {selectedMarker.surface_type || "N/A"}
                    </p>
                    <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                      {selectedMarker.has_lighting ? (
                        <Sun className="h-3 w-3" aria-hidden="true" />
                      ) : (
                        <Moon className="h-3 w-3" aria-hidden="true" />
                      )}
                      {selectedMarker.has_lighting ? "Lit" : "No lights"} •
                      <Star className="h-3 w-3 fill-current" aria-hidden="true" />
                      {selectedMarker.condition_rating}/5
                    </p>
                    {busynessOf(selectedMarker.busyness_score) && (
                      <p className="mt-1 text-xs font-semibold">
                        {busynessOf(selectedMarker.busyness_score)!.label}
                      </p>
                    )}
                    {selectedMarker.peak_hours && (
                      <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                        <TrendingUp className="h-3 w-3" aria-hidden="true" />
                        Peak: {selectedMarker.peak_hours}
                      </p>
                    )}
                    {selectedMarker.active_checkins > 0 && (
                      <p className="mt-1 flex items-center gap-1 text-xs text-success">
                        <Users className="h-3 w-3" aria-hidden="true" />
                        {selectedMarker.active_checkins} players here now
                      </p>
                    )}
                    {selectedMarker.address && (
                      <p className="mt-1 text-xs text-muted-foreground">{selectedMarker.address}</p>
                    )}
                  </YandexPopup>
                )}

                {/* Venue popup */}
                {selectedMarker && selectedMarkerType === "venue" && (
                  <YandexPopup
                    position={{ lat: selectedMarker.latitude!, lng: selectedMarker.longitude! }}
                    onClose={() => setSelectedMarker(null)}
                    closeLabel="Close venue details"
                  >
                    <h3 className="flex items-center gap-1 pr-5 text-sm font-semibold">
                      <Star className="h-3.5 w-3.5 shrink-0 fill-current" aria-hidden="true" />
                      <span className="truncate">{selectedMarker.name}</span>
                      <span className="shrink-0 text-xs text-primary">BOOKABLE</span>
                    </h3>
                    <p className="mt-1 text-xs">
                      {selectedMarker.sports?.join(", ")} • ֏{selectedMarker.price_per_hour}/hr
                    </p>
                    {selectedMarker.rating > 0 && (
                      <p className="mt-1 flex items-center gap-1 text-xs">
                        <Star className="h-3 w-3 fill-primary text-primary" aria-hidden="true" />
                        {selectedMarker.rating} ({selectedMarker.review_count || 0} reviews)
                      </p>
                    )}
                    <p className="mt-1 text-xs text-muted-foreground">
                      {selectedMarker.address || selectedMarker.city}
                    </p>
                    <a
                      href={`/venue/${selectedMarker.id}`}
                      className="mt-3 flex min-h-11 items-center justify-center rounded-lg bg-primary px-3 py-2 text-center text-sm font-semibold text-primary-foreground transition-colors duration-150 motion-reduce:transition-none hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      Book Now →
                    </a>
                  </YandexPopup>
                )}
              </YandexMap>
            </MapsReady>
          </div>
        ) : (
          <div className="container max-w-4xl space-y-8 py-6 sm:py-8">
            {/* Promoted venues section */}
            {promotedVenues.length > 0 && (
              <div className="space-y-3">
                <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
                  <Star className="h-4 w-4 fill-warning text-warning" aria-hidden="true" />
                  Bookable venues near you
                </h2>
                {promotedVenues.slice(0, 3).map(venue => (
                  <Card key={`venue-${venue.id}`} className="overflow-hidden border-border p-0 shadow-none">
                    <button
                      type="button"
                      className="flex min-h-20 w-full items-center gap-3 p-4 text-left transition-colors duration-150 hover:bg-surface-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring motion-reduce:transition-none"
                      onClick={() => navigate(`/venue/${venue.id}`)}
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                        <Zap className="h-5 w-5 text-primary" aria-hidden="true" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-x-2 gap-y-1 font-medium text-foreground">
                          <span className="truncate">{venue.name}</span>
                          <Badge variant="secondary" className="text-xs">Bookable</Badge>
                        </span>
                        <span className="mt-1 block text-sm text-muted-foreground">
                          <span className="line-clamp-1">{venue.sports?.join(", ")}</span>
                          <span className="mt-0.5 flex flex-wrap items-center gap-x-1.5">
                            <span>֏{venue.price_per_hour}/hr</span>
                            {venue.rating > 0 && (
                              <span className="inline-flex items-center gap-1">
                                <span aria-hidden="true">•</span>
                                <Star className="h-3 w-3 fill-warning text-warning" aria-hidden="true" />
                                {venue.rating}
                              </span>
                            )}
                          </span>
                        </span>
                      </span>
                      <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
                    </button>
                  </Card>
                ))}
              </div>
            )}

            {/* Verified fields */}
            <div className="space-y-3">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
                <BadgeCheck className="h-4 w-4 text-primary" aria-hidden="true" />
                Verified public fields
              </h2>
              {isLoading ? (
                <div className="space-y-3" role="status" aria-label="Loading nearby fields">
                  {[0, 1, 2].map((item) => (
                    <div key={item} className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
                      <Skeleton className="h-10 w-10 shrink-0 rounded-lg" />
                      <div className="min-w-0 flex-1 space-y-2">
                        <Skeleton className="h-4 w-1/2" />
                        <Skeleton className="h-3 w-3/4" />
                      </div>
                      <Skeleton className="hidden h-11 w-24 rounded-lg sm:block" />
                    </div>
                  ))}
                </div>
              ) : filteredFields.length === 0 ? (
                <div className="rounded-xl border border-border bg-surface-1 px-5 py-10 text-center">
                  <MapPin className="mx-auto h-6 w-6 text-muted-foreground" aria-hidden="true" />
                  <p className="mt-3 font-medium text-foreground">No verified fields match this sport</p>
                  <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
                    Try another sport, or add a local field for the community to review.
                  </p>
                  <Button variant="outline" className="mt-5 h-11" onClick={() => navigate("/nearby/submit")}>
                    <Plus className="h-4 w-4" aria-hidden="true" /> Add a field
                  </Button>
                </div>
              ) : (
                filteredFields.map((field) => (
                  <Card key={field.id} className="p-4 shadow-none">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex min-w-0 flex-1 items-start gap-3">
                        <div
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface-1"
                        >
                          <MapPin
                            className="h-5 w-5"
                            style={{ color: getSportColor(field.sport_type) }}
                            aria-hidden="true"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-medium text-foreground">{field.name}</div>
                          <div className="mt-1 flex flex-wrap items-center gap-2">
                            <span className="text-sm text-muted-foreground">
                              {field.sport_type} • {field.surface_type || "Unknown surface"}
                            </span>
                            {busynessOf(field.busyness_score) && (
                              <Badge
                                variant="outline"
                                className={cn("text-xs", busynessOf(field.busyness_score)!.chip)}
                              >
                                {busynessOf(field.busyness_score)!.label}
                              </Badge>
                            )}
                          </div>
                          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                            {field.has_lighting && (
                              <span className="flex items-center gap-0.5"><Sun className="h-3 w-3" aria-hidden="true" /> Lit</span>
                            )}
                            {/* Three lines above this one already draw their
                                icon with Lucide; this was the odd star out. */}
                            <span className="flex items-center gap-0.5">
                              <Star className="h-3 w-3 fill-current" aria-hidden="true" />
                              {field.condition_rating}/5
                            </span>
                            {field.distance !== undefined && (
                              <span>{field.distance < 1 ? `${Math.round(field.distance * 1000)}m` : `${field.distance.toFixed(1)}km`} away</span>
                            )}
                          </div>
                          {(field.peak_hours || field.best_time) && (
                            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                              {field.peak_hours && (
                                <span className="flex items-center gap-0.5">
                                  <TrendingUp className="h-3 w-3" aria-hidden="true" /> Peak: {field.peak_hours}
                                </span>
                              )}
                              {field.best_time && (
                                <span className="flex items-center gap-0.5">
                                  <Clock className="h-3 w-3" aria-hidden="true" /> Best: {field.best_time}
                                </span>
                              )}
                            </div>
                          )}
                          {field.active_checkins > 0 && (
                            <div className="mt-1.5 flex items-center gap-1 text-xs text-success">
                              <Users className="h-3 w-3" aria-hidden="true" />
                              {field.active_checkins} playing now
                            </div>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        className="h-11 w-full shrink-0 sm:w-auto"
                        onClick={() => checkIn(field.id)}
                      >
                        <Check className="h-4 w-4" aria-hidden="true" /> I'm here
                      </Button>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default NearbyFieldsPage;
