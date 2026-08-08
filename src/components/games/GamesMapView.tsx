import React, { useMemo, useState } from "react";
import { formatTimeOfDay } from "@/lib/time";
import { Calendar, Clock, MapPinOff, Users } from "lucide-react";
import { Link } from "react-router-dom";
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
      <div className="rounded-xl border border-border bg-surface-1 px-5 py-12 text-center">
        <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground">
          <MapPinOff className="h-5 w-5" aria-hidden="true" />
        </div>
        <h2 className="text-lg font-semibold text-foreground">No games with location data available</h2>
        <p className="mx-auto mt-1 max-w-md text-sm leading-relaxed text-muted-foreground">
          These results do not include coordinates. Switch to the list to view every game.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
      <MapsReady>
        <YandexMap
          className="h-[26rem] w-full sm:h-[32rem] lg:h-[38rem]"
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
              <Link
                to={`/game/${selectedGame.id}`}
                className="focus-ring mt-3 flex min-h-11 items-center justify-center rounded-lg bg-primary px-3 text-center text-sm font-medium text-primary-foreground transition-colors duration-150 motion-reduce:transition-none hover:bg-primary/90"
              >
                View game
              </Link>
            </YandexPopup>
          )}
        </YandexMap>
      </MapsReady>
    </div>
  );
};

export default GamesMapView;
