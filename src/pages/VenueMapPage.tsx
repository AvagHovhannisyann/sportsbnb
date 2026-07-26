import { useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { MapPin, Star, Loader2, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Layout from "@/components/layout/Layout";
import { useVenues, getVenueImage } from "@/hooks/useVenues";
import { GoogleMap, Marker, InfoWindow } from "@react-google-maps/api";
import { MapsReady } from "@/components/maps/GoogleMapsProvider";
import { sportTypes } from "@/data/constants";
import { formatPrice, getCustomerPrice } from "@/lib/pricing";
import { useRegion } from "@/hooks/useRegion";

const VenueMapPage = () => {
  const navigate = useNavigate();
  const { data: venues = [], isLoading } = useVenues();
  const [selectedSport, setSelectedSport] = useState<string>("");
  const [selectedVenue, setSelectedVenue] = useState<any>(null);
  const { defaultCenter: regionCenter } = useRegion();

  const filteredVenues = venues.filter((v) => {
    if (!v.latitude || !v.longitude) return false;
    if (selectedSport && selectedSport !== "all" && !v.sports.includes(selectedSport)) return false;
    return true;
  });

  const center = filteredVenues.length > 0
    ? { lat: filteredVenues[0].latitude!, lng: filteredVenues[0].longitude! }
    : regionCenter;

  const onLoad = useCallback((map: google.maps.Map) => {
    if (filteredVenues.length > 1) {
      const bounds = new google.maps.LatLngBounds();
      filteredVenues.forEach(v => bounds.extend({ lat: v.latitude!, lng: v.longitude! }));
      map.fitBounds(bounds, 50);
    }
  }, [filteredVenues]);

  return (
    <Layout>
      <div className="h-[calc(100vh-64px)] flex flex-col">
        <div className="bg-card border-b p-3 flex items-center gap-3 z-10">
          <Layers className="h-4 w-4 text-muted-foreground" />
          <Select value={selectedSport} onValueChange={setSelectedSport}>
            <SelectTrigger className="w-[160px] h-9">
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

        <div className="flex-1 relative">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <MapsReady><GoogleMap
              mapContainerStyle={{ width: "100%", height: "100%" }}
              center={center}
              zoom={12}
              onLoad={onLoad}
            >
              {filteredVenues.map((venue) => (
                <Marker
                  key={venue.id}
                  position={{ lat: venue.latitude!, lng: venue.longitude! }}
                  onClick={() => setSelectedVenue(venue)}
                />
              ))}

              {selectedVenue && (
                <InfoWindow
                  position={{ lat: selectedVenue.latitude!, lng: selectedVenue.longitude! }}
                  onCloseClick={() => setSelectedVenue(null)}
                >
                  <div style={{ minWidth: 200, padding: 4 }}>
                    <img
                      src={getVenueImage(selectedVenue)}
                      alt={selectedVenue.name}
                      style={{ width: "100%", height: 96, objectFit: "cover", borderRadius: 8, marginBottom: 8 }}
                    />
                    <h3 style={{ fontWeight: 600 }}>{selectedVenue.name}</h3>
                    <p style={{ fontSize: 12, color: "#6b7280", margin: "4px 0" }}>
                      📍 {selectedVenue.address || selectedVenue.city}
                    </p>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
                      <strong>{formatPrice(getCustomerPrice(selectedVenue.price_per_hour))}/hr</strong>
                      {selectedVenue.rating > 0 && (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                          <Star className="h-3.5 w-3.5 fill-primary text-primary" aria-hidden="true" />
                          {selectedVenue.rating}
                        </span>
                      )}
                    </div>
                    <a
                      href={`/venue/${selectedVenue.id}`}
                      style={{ display: "block", textAlign: "center", padding: 8, background: "#3b82f6", color: "white", borderRadius: 6, textDecoration: "none", marginTop: 8, fontSize: 14 }}
                    >
                      View Details
                    </a>
                  </div>
                </InfoWindow>
              )}
            </GoogleMap></MapsReady>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default VenueMapPage;
