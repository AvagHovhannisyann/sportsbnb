import { useMemo, useState } from "react";
import { Star, Loader2, Layers, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
  const { data: venues = [], isLoading } = useVenues();
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
      <div className="h-[calc(100vh-64px)] flex flex-col">
        {/* The page is a full-bleed map with a filter bar and deliberately no
            visible title, so it had no h1 and its outline began at h2. A
            visually-hidden heading gives the document a top level without
            putting anything on screen. */}
        <h1 className="sr-only">Venues on a map</h1>
        <div className="bg-card border-b p-3 flex items-center gap-3 z-10">
          <Layers className="h-4 w-4 text-muted-foreground" />
          <Select value={selectedSport} onValueChange={setSelectedSport}>
            <SelectTrigger aria-label="Sport" className="w-[160px] h-9">
              <SelectValue placeholder="All sports" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All sports</SelectItem>
              {sportTypes.map((sport) => (
                <SelectItem key={sport} value={sport}>{sport}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Badge variant="secondary">{filteredVenues.length} venues</Badge>
        </div>

        {/* Named region, for the same reason as /nearby: the map area had
            no name, so it read as an anonymous block of the page. */}
        <div role="region" aria-label="Map of venues" className="flex-1 relative">
          {isLoading ? (
            <div className="flex items-center justify-center h-full" role="status" aria-label="Loading the map">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
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
                          <Star className="h-3.5 w-3.5 fill-primary text-primary" aria-hidden="true" />
                          {selectedVenue.rating}
                        </span>
                      )}
                    </div>
                    <a
                      href={`/venue/${selectedVenue.id}`}
                      className="mt-2 block rounded-md bg-primary px-3 py-2 text-center text-sm font-medium text-primary-foreground hover:bg-primary/90"
                    >
                      View Details
                    </a>
                  </YandexPopup>
                )}
              </YandexMap>
            </MapsReady>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default VenueMapPage;
