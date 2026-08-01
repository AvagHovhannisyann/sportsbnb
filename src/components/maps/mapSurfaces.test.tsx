import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { RegionProvider } from "@/hooks/useRegion";
import { YandexMapsProvider } from "./YandexMapsProvider";
import { LocationPicker } from "@/components/venues/LocationPicker";
import { VenueLocationPicker } from "@/components/venues/VenueLocationPicker";
import GamesMapView from "@/components/games/GamesMapView";
import type { Game } from "@/hooks/useGames";

/**
 * Every map surface, mounted with no Yandex key.
 *
 * This is the regression that the old implementation shipped and no test
 * caught: /nearby threw "google is not defined" with no key, because the
 * marker props were evaluated before the gate could reject them, and the
 * whole page went down with it. The suite could not have caught it — nothing
 * in it ever rendered a component. So these mount each surface and assert two
 * things only: it does not throw, and it says why the map is missing.
 */
const mount = (ui: React.ReactNode) =>
  render(
    <RegionProvider>
      <YandexMapsProvider>{ui}</YandexMapsProvider>
    </RegionProvider>,
  );

const noop = () => {};

const game = (over: Partial<Game> = {}): Game =>
  ({
    id: "g1",
    title: "Five-a-side",
    sport: "Football",
    skill_level: "all",
    status: "open",
    location: "Yerevan",
    game_date: "2030-01-01",
    game_time: "18:00:00",
    max_players: 10,
    participant_count: 4,
    latitude: 40.1792,
    longitude: 44.4991,
    ...over,
  }) as Game;

describe("map surfaces degrade rather than crash", () => {
  it("LocationPicker renders its form and a map fallback", async () => {
    mount(
      <LocationPicker
        address="1 Test Street"
        city="Yerevan"
        onAddressChange={noop}
        onCityChange={noop}
        onLocationConfirm={noop}
      />,
    );
    expect(screen.getByLabelText(/Street Address/)).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText("Map unavailable")).toBeInTheDocument());
  });

  it("VenueLocationPicker renders its form and a map fallback", async () => {
    mount(
      <VenueLocationPicker
        address="1 Test Street"
        city="Yerevan"
        onAddressChange={noop}
        onCityChange={noop}
        onLocationConfirm={noop}
        latitude={40.1792}
        longitude={44.4991}
      />,
    );
    // The confirm/clear panel is driven by the selected position, not by the
    // map, so it must still be reachable when the map is not.
    expect(screen.getByText(/Selected: 40\.179200, 44\.499100/)).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText("Map unavailable")).toBeInTheDocument());
  });

  it("GamesMapView renders a fallback when there are games but no map", async () => {
    mount(<GamesMapView games={[game(), game({ id: "g2", latitude: 40.21, longitude: 44.54 })]} />);
    await waitFor(() => expect(screen.getByText("Map unavailable")).toBeInTheDocument());
  });

  it("GamesMapView still says so when no game has coordinates", () => {
    mount(<GamesMapView games={[game({ latitude: null, longitude: null })]} />);
    expect(screen.getByText(/No games with location data available/)).toBeInTheDocument();
  });
});

describe("selected coordinates are shown latitude first", () => {
  it("prints lat then lng, matching how the app stores them", () => {
    // Yandex reports the reverse order everywhere, so the readout is worth
    // pinning: 40.18 is the latitude of Yerevan and 44.50 its longitude, and
    // a swap here would be legible on screen but easy to miss in review.
    const onConfirm = vi.fn();
    mount(
      <VenueLocationPicker
        address=""
        city=""
        onAddressChange={noop}
        onCityChange={noop}
        onLocationConfirm={onConfirm}
        latitude={40.1872}
        longitude={44.5152}
      />,
    );
    expect(screen.getByText("Selected: 40.187200, 44.515200")).toBeInTheDocument();
  });
});
