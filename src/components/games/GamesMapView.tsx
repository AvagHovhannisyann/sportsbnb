import React, { useCallback } from "react";
import { GoogleMap, Marker, InfoWindow } from "@react-google-maps/api";
import { MapsReady } from "@/components/maps/GoogleMapsProvider";
import { format } from "date-fns";
import type { Game } from "@/hooks/useGames";
import { useState } from "react";
import { useRegion } from "@/hooks/useRegion";

interface GamesMapViewProps {
  games: Game[];
}

const GamesMapView: React.FC<GamesMapViewProps> = ({ games }) => {
  const gamesWithCoords = games.filter(g => g.latitude && g.longitude);
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const { defaultCenter } = useRegion();

  const center = gamesWithCoords.length > 0
    ? { lat: gamesWithCoords[0].latitude!, lng: gamesWithCoords[0].longitude! }
    : defaultCenter;

  const onLoad = useCallback((map: google.maps.Map) => {
    if (gamesWithCoords.length > 1) {
      const bounds = new google.maps.LatLngBounds();
      gamesWithCoords.forEach(g => bounds.extend({ lat: g.latitude!, lng: g.longitude! }));
      map.fitBounds(bounds, 50);
    }
  }, [gamesWithCoords]);

  if (gamesWithCoords.length === 0) {
    return (
      <div className="bg-card rounded-xl border border-border p-8 text-center">
        <p className="text-muted-foreground">No games with location data available</p>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      <MapsReady><GoogleMap
        mapContainerStyle={{ width: "100%", height: "600px" }}
        center={center}
        zoom={12}
        onLoad={onLoad}
      >
        {gamesWithCoords.map((game) => {
          const spotsLeft = game.max_players - (game.participant_count || 0);
          const isFull = spotsLeft <= 0;

          return (
            <Marker
              key={game.id}
              position={{ lat: game.latitude!, lng: game.longitude! }}
              onClick={() => setSelectedGame(game)}
              icon={{
                url: `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="${isFull ? '#9ca3af' : '#3b82f6'}"><circle cx="12" cy="12" r="10"/></svg>`)}`,
                scaledSize: new google.maps.Size(24, 24),
              }}
            />
          );
        })}

        {selectedGame && (
          <InfoWindow
            position={{ lat: selectedGame.latitude!, lng: selectedGame.longitude! }}
            onCloseClick={() => setSelectedGame(null)}
          >
            <div style={{ minWidth: 220, padding: 4 }}>
              <h3 style={{ fontWeight: 600, marginBottom: 4 }}>{selectedGame.title}</h3>
              <p style={{ fontSize: 12, color: "#6b7280", margin: "4px 0" }}>
                {selectedGame.sport} • {selectedGame.skill_level === "all" ? "All levels" : selectedGame.skill_level}
              </p>
              <p style={{ fontSize: 12, color: "#6b7280" }}>
                📅 {format(new Date(selectedGame.game_date), "MMM d, yyyy")} · 🕐 {selectedGame.game_time}
              </p>
              <p style={{ fontSize: 12, color: (selectedGame.max_players - (selectedGame.participant_count || 0)) <= 0 ? "#6b7280" : "#3b82f6", fontWeight: 600 }}>
                👥 {(selectedGame.max_players - (selectedGame.participant_count || 0)) <= 0 ? "Full" : `${selectedGame.max_players - (selectedGame.participant_count || 0)} spots left`}
              </p>
              <a
                href={`/game/${selectedGame.id}`}
                style={{ display: "block", textAlign: "center", padding: 8, background: "#3b82f6", color: "white", borderRadius: 6, textDecoration: "none", marginTop: 8, fontSize: 14 }}
              >
                View Game
              </a>
            </div>
          </InfoWindow>
        )}
      </GoogleMap></MapsReady>
    </div>
  );
};

export default GamesMapView;
