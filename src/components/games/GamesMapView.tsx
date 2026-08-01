import React, { useMemo, useState } from "react";
import { formatTimeOfDay } from "@/lib/time";
import { Calendar, Clock, Users } from "lucide-react";
import { MapsReady } from "@/components/maps/YandexMapsProvider";
import { YandexMap, YandexMarker, YandexPopup } from "@/components/maps/YandexMap";
import { MapDotMarker, MapMarkerButton } from "@/components/maps/MapPinMarker";
import { boundsOf, type LatLng } from "@/lib/yandexGeo";
import { format } from "date-fns";
import type { Game } from "@/hooks/useGames";
import { useRegion } from "@/hooks/useRegion";

interface GamesMapViewProps {
  games: Game[];
}

const GamesMapView: React.FC<GamesMapViewProps> = ({ games }) => {
  const gamesWithCoords = games.filter(g => g.latitude && g.longitude);
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const { defaultCenter } = useRegion();

  const center: LatLng = gamesWithCoords.length > 0
    ? { lat: gamesWithCoords[0].latitude!, lng: gamesWithCoords[0].longitude! }
    : defaultCenter;

  /**
   * Fit every game on screen.
   *
   * Google's `map.fitBounds(new LatLngBounds(), 50)` needed the script loaded
   * before the bounds object could be constructed, so this ran in `onLoad`.
   * The Yandex equivalent is a plain array of two corners — computed here,
   * unit-tested in yandexGeo.test.ts, and handed to the map as a prop, which
   * also means it re-fits when the filters change instead of only on load.
   */
  const bounds = useMemo(
    () => boundsOf(gamesWithCoords.map(g => ({ lat: g.latitude!, lng: g.longitude! }))),
    [gamesWithCoords],
  );

  if (gamesWithCoords.length === 0) {
    return (
      <div className="bg-card rounded-xl border border-border p-8 text-center">
        <p className="text-muted-foreground">No games with location data available</p>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      <MapsReady>
        <YandexMap
          style={{ width: "100%", height: "600px" }}
          ariaLabel="Map of games"
          center={center}
          zoom={12}
          bounds={bounds}
        >
          {gamesWithCoords.map((game) => {
            const spotsLeft = game.max_players - (game.participant_count || 0);
            const isFull = spotsLeft <= 0;

            return (
              <YandexMarker
                key={game.id}
                position={{ lat: game.latitude!, lng: game.longitude! }}
                anchor="center"
              >
                <MapMarkerButton
                  label={`${game.title} — ${isFull ? "full" : `${spotsLeft} spots left`}`}
                  onClick={() => setSelectedGame(game)}
                >
                  {/* Was an SVG data URI with #9ca3af / #3b82f6 baked in. The
                      same two states, drawn from tokens, so they follow the
                      theme like everything else on the page. */}
                  <MapDotMarker
                    size={24}
                    color={isFull ? "hsl(var(--muted-foreground))" : "hsl(var(--primary))"}
                  />
                </MapMarkerButton>
              </YandexMarker>
            );
          })}

          {selectedGame && (
            <YandexPopup
              position={{ lat: selectedGame.latitude!, lng: selectedGame.longitude! }}
              onClose={() => setSelectedGame(null)}
              closeLabel="Close game details"
            >
              <h3 className="pr-5 text-sm font-semibold">{selectedGame.title}</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                {selectedGame.sport} •{" "}
                {selectedGame.skill_level === "all" ? "All levels" : selectedGame.skill_level}
              </p>
              <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3" aria-hidden="true" />
                {format(new Date(selectedGame.game_date), "MMM d, yyyy")}
                <Clock className="ml-1 h-3 w-3" aria-hidden="true" />
                {formatTimeOfDay(selectedGame.game_time)}
              </p>
              {(() => {
                const spotsLeft =
                  selectedGame.max_players - (selectedGame.participant_count || 0);
                return (
                  <p
                    className={
                      spotsLeft <= 0
                        ? "mt-1 flex items-center gap-1 text-xs font-semibold text-muted-foreground"
                        : "mt-1 flex items-center gap-1 text-xs font-semibold text-primary"
                    }
                  >
                    <Users className="h-3 w-3" aria-hidden="true" />
                    {spotsLeft <= 0 ? "Full" : `${spotsLeft} spots left`}
                  </p>
                );
              })()}
              <a
                href={`/game/${selectedGame.id}`}
                className="mt-2 block rounded-md bg-primary px-3 py-2 text-center text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                View Game
              </a>
            </YandexPopup>
          )}
        </YandexMap>
      </MapsReady>
    </div>
  );
};

export default GamesMapView;
