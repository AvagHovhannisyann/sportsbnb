import { useMemo, useState } from "react";
import { ArrowLeft, Star, Loader2, MapPin, SlidersHorizontal } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ErrorPanel } from "@/components/common/StatusPanel";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Layout from "@/components/layout/Layout";
import { useVenues, getVenueImage } from "@/hooks/useVenues";
import { MapsReady } from "@/components/maps/YandexMapsProvider";
import { YandexMap, YandexMarker, YandexPopup } from "@/components/maps/YandexMap";
import { MapPinMarker, MapMarkerButton } from "@/components/maps/MapPinMarker";
import { boundsOf, type LatLng } from "@/lib/yandexGeo";
import { sportTypes } from "@/data/constants";
import { formatPrice, getCustomerPrice } from "@/lib/pricing";
import { useRegion } from "@/hooks/useRegion";

const VenueMapPage = () => {
  const {
    data: venues = [],
    isLoading,
    isError,
    refetch,
    isRefetching,
  } = useVenues();
  const [selectedSport, setSelectedSport] = useState<string>("");
  const [selectedVenue, setSelectedVenue] = useState<any>(null);
  const { defaultCenter: regionCenter } = useRegion();

  const filteredVenues = venues.filter((v) => {
    if (!v.latitude || !v.longitude) return false;
    if (selectedSport && selectedSport !== "all" && !v.sports.includes(selectedSport)) return false;
    return true;
  });

  const center: LatLng = filteredVenues.length > 0
    ? { lat: filteredVenues[0].latitude!, lng: filteredVenues[0].longitude! }
    : regionCenter;

  // A prop rather than a one-shot `fitBounds` in `onLoad`, so changing the
  // sport filter re-frames the map instead of leaving it where it was.
  const bounds = useMemo(
    () => boundsOf(filteredVenues.map(v => ({ lat: v.latitude!, lng: v.longitude! }))),
    [filteredVenues],
  );

  return (
    <Layout>
      <div className="flex min-h-[calc(100dvh-4rem)] flex-col bg-background">
        <div className="z-10 border-b border-border bg-card">
          <div className="container flex flex-wrap items-center justify-between gap-3 py-3">
            <div className="flex min-w-0 items-center gap-2">
              <Button asChild variant="ghost" className="h-11 shrink-0 px-2.5">
                <Link to="/venues" aria-label="Back to venue list">
                  <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                  <span className="hidden sm:inline">List</span>
                </Link>
              </Button>
              <div className="min-w-0">
                <h1 className="truncate text-lg font-semibold text-foreground sm:text-xl">Venue map</h1>
                <p className="text-xs text-muted-foreground" aria-live="polite">
                  {isLoading
                    ? "Loading venues…"
                    : isError
                      ? "Venue data unavailable"
                      : `${filteredVenues.length} on the map`}
                </p>
              </div>
            </div>

          <Select value={selectedSport || "all"} onValueChange={setSelectedSport}>
            <SelectTrigger aria-label="Filter map by sport" className="h-11 w-40">
              <SlidersHorizontal className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <SelectValue placeholder="All sports" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All sports</SelectItem>
              {sportTypes.map((sport) => (
                <SelectItem key={sport} value={sport}>{sport}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          </div>
        </div>

        {/* Named region, for the same reason as /nearby: the map area had
            no name, so it read as an anonymous block of the page. */}
        <div role="region" aria-label="Map of venues" className="relative min-h-[26rem] flex-1">
          {isLoading ? (
            <div className="flex h-full min-h-[26rem] items-center justify-center bg-surface-1" role="status">
              <div className="rounded-xl border border-border bg-card px-5 py-4 text-center shadow-sm">
                <Loader2 className="mx-auto h-5 w-5 animate-spin text-primary motion-reduce:animate-none" aria-hidden="true" />
                <p className="mt-2 text-sm font-medium text-foreground">Loading the map</p>
              </div>
            </div>
          ) : isError ? (
            <div className="container flex h-full min-h-[26rem] items-center py-8">
              <ErrorPanel
                what="venues"
                description="The map is ready, but the venue list could not be loaded."
                onRetry={() => refetch()}
                isRetrying={isRefetching}
                className="w-full rounded-xl border border-destructive/25 bg-destructive/5"
              />
            </div>
          ) : (
            <>
              <MapsReady>
                <YandexMap
                  style={{ width: "100%", height: "100%" }}
                  ariaLabel="Map of venues"
                  center={center}
                  zoom={12}
                  bounds={bounds}
                >
                {filteredVenues.map((venue) => (
                  <YandexMarker
                    key={venue.id}
                    position={{ lat: venue.latitude!, lng: venue.longitude! }}
                    anchor="bottom"
                  >
                    <MapMarkerButton
                      label={venue.name}
                      onClick={() => setSelectedVenue(venue)}
                    >
                      <MapPinMarker />
                    </MapMarkerButton>
                  </YandexMarker>
                ))}

                {selectedVenue && (
                  <YandexPopup
                    position={{ lat: selectedVenue.latitude!, lng: selectedVenue.longitude! }}
                    onClose={() => setSelectedVenue(null)}
                    closeLabel="Close venue details"
                  >
                    {/* Was inline hex on Google's own white balloon surface.
                        This popup is our DOM, so it uses the app's tokens and
                        follows the dark theme. */}
                    <img
                      src={getVenueImage(selectedVenue)}
                      alt={selectedVenue.name}
                      loading="lazy"
                      className="mb-2 h-24 w-full rounded-lg object-cover"
                    />
                    <h3 className="pr-5 text-sm font-semibold">{selectedVenue.name}</h3>
                    <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" aria-hidden="true" />
                      {selectedVenue.address || selectedVenue.city}
                    </p>
                    <div className="mt-2 flex items-center justify-between">
                      <strong className="text-sm">
                        {formatPrice(getCustomerPrice(selectedVenue.price_per_hour))}/hr
                      </strong>
                      {selectedVenue.rating > 0 && (
                        <span className="inline-flex items-center gap-1 text-sm">
                          <Star className="h-3.5 w-3.5 fill-warning text-warning" aria-hidden="true" />
                          {selectedVenue.rating}
                        </span>
                      )}
                    </div>
                    <a
                      href={`/venue/${selectedVenue.id}`}
                      className="mt-3 flex min-h-11 items-center justify-center rounded-lg bg-primary px-3 py-2 text-center text-sm font-semibold text-primary-foreground transition-colors duration-150 motion-reduce:transition-none hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      View Details
                    </a>
                  </YandexPopup>
                )}
                </YandexMap>
              </MapsReady>
              {filteredVenues.length === 0 && (
                <div className="pointer-events-none absolute left-3 right-3 top-3 z-10 mx-auto max-w-md rounded-xl border border-border bg-card/95 p-4 text-center shadow-md backdrop-blur-sm">
                  <p className="text-sm font-semibold text-foreground">No mapped venues for this sport</p>
                  <p className="mt-1 text-xs text-muted-foreground">Choose another sport to see available locations.</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default VenueMapPage;
