import React, { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { GoogleMap, Marker, InfoWindow } from "@react-google-maps/api";
import { useGoogleMaps } from "@/components/maps/GoogleMapsProvider";
import { MapPin, Users, Sun, Moon, Zap, List, Map as MapIcon, Filter, ChevronRight, Plus, Check, Star, Clock, TrendingUp, BadgeCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useVerifiedFields } from "@/hooks/useVerifiedFields";
import { useVenues } from "@/hooks/useVenues";
import { useRegion } from "@/hooks/useRegion";
import Layout from "@/components/layout/Layout";
import SEOHead from "@/components/seo/SEOHead";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const SPORT_COLORS: Record<string, string> = {
  football: "#22c55e",
  basketball: "#f97316",
  tennis: "#eab308",
  volleyball: "#8b5cf6",
  running: "#3b82f6",
  cycling: "#06b6d4",
  swimming: "#0ea5e9",
  "multi-sport": "#ec4899",
};

const getSportColor = (sport: string) => SPORT_COLORS[sport] || "#22c55e";

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
  // Read directly rather than relying on <MapsReady> to wrap the map: that
  // component cannot protect its own children, because JSX evaluates them —
  // including `new google.maps.Size(...)` — before the wrapper decides whether
  // to render. On CI, where no Maps key is set, that threw
  // "ReferenceError: google is not defined" and took the page down.
  const { isLoaded: mapsLoaded, loadError: mapsError } = useGoogleMaps();
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

  const mapCenter = userLocation || defaultCenter;

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
        <div className="sticky top-16 z-30 bg-background/95 backdrop-blur border-b border-border">
          <div className="max-w-7xl mx-auto px-4 py-3">
            {/* Wraps: at 375px the heading plus the three controls came to
                438px against a 375px viewport, so the whole page scrolled
                sideways. */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h1 className="text-xl font-bold text-foreground">Nearby Fields</h1>
                <p className="text-sm text-muted-foreground">
                  {filteredFields.length} verified field{filteredFields.length !== 1 ? "s" : ""} found
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Select value={sportFilter} onValueChange={setSportFilter}>
                  <SelectTrigger aria-label="Sport" className="w-32 h-9">
                    <Filter className="h-3.5 w-3.5 mr-1" />
                    <SelectValue placeholder="Sport" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All sports</SelectItem>
                    {allSports.map(s => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="flex rounded-lg border border-border overflow-hidden">
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
                      "p-2 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-inset",
                      view === "map"
                        ? "bg-primary text-primary-foreground focus-visible:ring-primary-foreground"
                        : "bg-background text-muted-foreground hover:bg-muted focus-visible:ring-ring"
                    )}
                  >
                    <MapIcon className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    aria-label="List view"
                    aria-pressed={view === "list"}
                    onClick={() => setView("list")}
                    className={cn(
                      "p-2 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-inset",
                      view === "list"
                        ? "bg-primary text-primary-foreground focus-visible:ring-primary-foreground"
                        : "bg-background text-muted-foreground hover:bg-muted focus-visible:ring-ring"
                    )}
                  >
                    <List className="h-4 w-4" />
                  </button>
                </div>

                <Button variant="outline" size="sm" onClick={() => navigate("/nearby/submit")}>
                  <Plus className="h-4 w-4 mr-1" /> Add Field
                </Button>
              </div>
            </div>
          </div>
        </div>

        {view === "map" ? (
          // A named region. The Maps API injects its own unnamed pan controls,
          // which are not ours to fix — but the area they sit in is, and it
          // had no name either, so the map read as an anonymous block of the
          // page. `ariaLabel` on MapOptions would be the tidier home for this,
          // but it is absent from the installed @types/google.maps.
          <div
            role="region"
            aria-label="Map of nearby fields"
            className="h-[calc(100vh-180px)]"
          >
            {!mapsLoaded ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                {mapsError ? "Map unavailable" : "Loading map…"}
              </div>
            ) : (
            <GoogleMap
              mapContainerStyle={{ width: "100%", height: "100%" }}
              center={mapCenter}
              zoom={13}
            >
              {/* User location */}
              {userLocation && (
                <Marker
                  position={userLocation}
                  icon={{
                    url: `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20"><circle cx="10" cy="10" r="8" fill="#4285F4" stroke="white" stroke-width="2"/></svg>')}`,
                    scaledSize: new google.maps.Size(20, 20),
                  }}
                />
              )}

              {/* Verified fields - colored by sport */}
              {filteredFields.map(field => (
                <Marker
                  key={field.id}
                  position={{ lat: field.latitude, lng: field.longitude }}
                  onClick={() => { setSelectedMarker(field); setSelectedMarkerType("field"); }}
                  icon={{
                    url: `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28"><circle cx="14" cy="14" r="12" fill="${getSportColor(field.sport_type)}" stroke="white" stroke-width="2"/><text x="14" y="18" text-anchor="middle" fill="white" font-size="12">✓</text></svg>`)}`,
                    scaledSize: new google.maps.Size(28, 28),
                  }}
                />
              ))}

              {/* Promoted venues */}
              {promotedVenues.map(venue => (
                <Marker
                  key={`venue-${venue.id}`}
                  position={{ lat: venue.latitude!, lng: venue.longitude! }}
                  onClick={() => { setSelectedMarker(venue); setSelectedMarkerType("venue"); }}
                  icon={{
                    url: `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><circle cx="16" cy="16" r="14" fill="#2563eb" stroke="white" stroke-width="2"/><text x="16" y="21" text-anchor="middle" fill="white" font-size="16">⭐</text></svg>')}`,
                    scaledSize: new google.maps.Size(32, 32),
                  }}
                />
              ))}

              {/* Field info window */}
              {selectedMarker && selectedMarkerType === "field" && (
                <InfoWindow
                  position={{ lat: selectedMarker.latitude, lng: selectedMarker.longitude }}
                  onCloseClick={() => setSelectedMarker(null)}
                >
                  <div style={{ maxWidth: 250, padding: 4 }}>
                    {/* Google draws this popup on its own white surface, so
                        these keep literal light-surface colours rather than
                        app tokens — but the glyphs are icons now, matching the
                        Star that the venue window below already used. */}
                    <h3 style={{ fontWeight: 600, marginBottom: 4, display: "flex", alignItems: "center", gap: 4 }}>
                      <BadgeCheck size={14} aria-hidden="true" />
                      {selectedMarker.name}
                      <span style={{ color: "#15803d", fontSize: 12 }}>
                        {selectedMarker.is_public ? "FREE" : "PAID"}
                      </span>
                    </h3>
                    <p style={{ fontSize: 12, margin: "2px 0" }}>
                      {selectedMarker.sport_type} • {selectedMarker.surface_type || "N/A"}
                    </p>
                    <p style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 4 }}>
                      {selectedMarker.has_lighting ? (
                        <Sun size={12} aria-hidden="true" />
                      ) : (
                        <Moon size={12} aria-hidden="true" />
                      )}
                      {selectedMarker.has_lighting ? "Lit" : "No lights"} •
                      <Star size={12} style={{ fill: "currentColor" }} aria-hidden="true" />
                      {selectedMarker.condition_rating}/5
                    </p>
                    {busynessOf(selectedMarker.busyness_score) && (
                      <p style={{ fontWeight: 600, fontSize: 12 }}>
                        {busynessOf(selectedMarker.busyness_score)!.label}
                      </p>
                    )}
                    {selectedMarker.peak_hours && (
                      <p style={{ fontSize: 11, display: "flex", alignItems: "center", gap: 4 }}>
                        <TrendingUp size={11} aria-hidden="true" />
                        Peak: {selectedMarker.peak_hours}
                      </p>
                    )}
                    {selectedMarker.active_checkins > 0 && (
                      <p style={{ color: "#15803d", fontSize: 12, display: "flex", alignItems: "center", gap: 4 }}>
                        <Users size={12} aria-hidden="true" />
                        {selectedMarker.active_checkins} players here now
                      </p>
                    )}
                    {selectedMarker.address && <p style={{ fontSize: 11, color: "gray" }}>{selectedMarker.address}</p>}
                  </div>
                </InfoWindow>
              )}

              {/* Venue info window */}
              {selectedMarker && selectedMarkerType === "venue" && (
                <InfoWindow
                  position={{ lat: selectedMarker.latitude!, lng: selectedMarker.longitude! }}
                  onCloseClick={() => setSelectedMarker(null)}
                >
                  <div style={{ maxWidth: 250, padding: 4 }}>
                    <h3 style={{ fontWeight: 600, marginBottom: 4, display: "flex", alignItems: "center", gap: 4 }}>
                      <Star size={14} style={{ fill: "currentColor" }} aria-hidden="true" />
                      {selectedMarker.name}
                      {/* Was #2563eb — a stock blue that appears nowhere else
                          in an app whose primary is green. */}
                      <span style={{ color: "#0f766e", fontSize: 12 }}>BOOKABLE</span>
                    </h3>
                    <p style={{ fontSize: 12 }}>{selectedMarker.sports?.join(", ")} • ֏{selectedMarker.price_per_hour}/hr</p>
                    {selectedMarker.rating > 0 && (
                      <p style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 4 }}>
                        <Star className="h-3 w-3 fill-primary text-primary" aria-hidden="true" />
                        {selectedMarker.rating} ({selectedMarker.review_count || 0} reviews)
                      </p>
                    )}
                    <p style={{ fontSize: 11, color: "gray" }}>{selectedMarker.address || selectedMarker.city}</p>
                    <a href={`/venue/${selectedMarker.id}`} style={{ display: "block", textAlign: "center", padding: 6, background: "#0f766e", color: "white", borderRadius: 6, textDecoration: "none", marginTop: 6, fontSize: 13 }}>
                      Book Now →
                    </a>
                  </div>
                </InfoWindow>
              )}
            </GoogleMap>
            )}
          </div>
        ) : (
          <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
            {/* Promoted venues section */}
            {promotedVenues.length > 0 && (
              <div className="space-y-3">
                {/* The app's only two text-sm h2s, and its only two headings
                    that opened with an emoji. Uppercase eyebrow styling is a
                    fine choice for a list label — keeping it, but the glyph
                    becomes an icon like every other heading's. */}
                <h2 className="flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  <Star className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
                  Bookable venues near you
                </h2>
                {promotedVenues.slice(0, 3).map(venue => (
                  <Card
                    key={`venue-${venue.id}`}
                    className="p-4 cursor-pointer hover:bg-muted/50 transition-colors border-primary/20"
                    onClick={() => navigate(`/venue/${venue.id}`)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Zap className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <div className="font-medium text-foreground flex items-center gap-2">
                            {venue.name}
                            <Badge variant="secondary" className="text-xs">Bookable</Badge>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {venue.sports?.join(", ")} • ֏{venue.price_per_hour}/hr
                            {venue.rating > 0 && (
                              <>
                                {" • "}
                                <Star className="inline h-3 w-3 fill-primary text-primary" aria-hidden="true" />{" "}
                                {venue.rating}
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </Card>
                ))}
              </div>
            )}

            {/* Verified fields */}
            <div className="space-y-3">
              <h2 className="flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" />
                Verified public fields
              </h2>
              {isLoading ? (
                <div className="text-center py-12 text-muted-foreground">Loading fields...</div>
              ) : filteredFields.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground mb-2">No verified fields found yet</p>
                  <p className="text-sm text-muted-foreground">Fields are added through our AI discovery pipeline and verified before appearing here.</p>
                </div>
              ) : (
                filteredFields.map((field) => (
                  <Card key={field.id} className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        <div
                          className="w-10 h-10 rounded-lg flex items-center justify-center"
                          style={{ backgroundColor: `${getSportColor(field.sport_type)}20` }}
                        >
                          <MapPin className="h-5 w-5" style={{ color: getSportColor(field.sport_type) }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-foreground">{field.name}</div>
                          <div className="flex items-center gap-2 mt-0.5">
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
                          <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                            {field.has_lighting && (
                              <span className="flex items-center gap-0.5"><Sun className="h-3 w-3" /> Lit</span>
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
                            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                              {field.peak_hours && (
                                <span className="flex items-center gap-0.5">
                                  <TrendingUp className="h-3 w-3" /> Peak: {field.peak_hours}
                                </span>
                              )}
                              {field.best_time && (
                                <span className="flex items-center gap-0.5">
                                  <Clock className="h-3 w-3" /> Best: {field.best_time}
                                </span>
                              )}
                            </div>
                          )}
                          {field.active_checkins > 0 && (
                            <div className="flex items-center gap-1 mt-1.5 text-xs text-green-600">
                              <Users className="h-3 w-3" />
                              {field.active_checkins} playing now
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col gap-1.5 shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => { e.stopPropagation(); checkIn(field.id); }}
                        >
                          <Check className="h-3.5 w-3.5 mr-1" /> I'm here
                        </Button>
                      </div>
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
