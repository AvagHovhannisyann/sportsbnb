import { describe, it, expect } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import {
  MapsReady,
  MapUnavailable,
  MissingYandexMapsKeyError,
  YandexMapsProvider,
  isYandexMapsConfigured,
} from "./YandexMapsProvider";

/**
 * The no-key path, which is the one that actually ships in CI and in any
 * deployment that has not configured Yandex yet.
 *
 * Vitest points `envDir` at a directory with no env files, so
 * `VITE_YANDEX_MAPS_API_KEY` is genuinely absent here — the same state the
 * app is in without a key, not a mock of it.
 *
 * This matters more than it looks. The Google implementation crashed on
 * /nearby with no key, because the marker props evaluated
 * `new google.maps.Size(...)` before the gate could decide not to render
 * them, and nothing in the suite noticed: every test was a pure function and
 * no test ever mounted a map surface.
 */
describe("YandexMapsProvider without a key", () => {
  it("reports itself unconfigured", () => {
    expect(isYandexMapsConfigured()).toBe(false);
  });

  it("renders children immediately rather than gating the app on a script", () => {
    render(
      <YandexMapsProvider>
        <p>page content</p>
      </YandexMapsProvider>,
    );
    expect(screen.getByText("page content")).toBeInTheDocument();
  });

  it("shows a friendly fallback where the map would be, not a blank box", async () => {
    render(
      <YandexMapsProvider>
        <MapsReady>
          <div data-testid="map">the map</div>
        </MapsReady>
      </YandexMapsProvider>,
    );

    await waitFor(() => expect(screen.getByText("Map unavailable")).toBeInTheDocument());
    expect(screen.queryByTestId("map")).not.toBeInTheDocument();
    expect(
      screen.getByText(/Maps are not configured for this environment/),
    ).toBeInTheDocument();
    // The rest of the page is explicitly promised to still work; if that copy
    // ever stops being true, this is the line that should be revisited.
    expect(screen.getByText(/Everything else on this page still works/)).toBeInTheDocument();
  });

  it("never injects the loader script when there is nothing to authenticate with", async () => {
    render(
      <YandexMapsProvider>
        <MapsReady>
          <div>the map</div>
        </MapsReady>
      </YandexMapsProvider>,
    );
    await waitFor(() => expect(screen.getByText("Map unavailable")).toBeInTheDocument());
    expect(document.getElementById("sportsbnb-ymaps3")).toBeNull();
  });
});

describe("MapUnavailable", () => {
  it("distinguishes 'not configured' from 'could not load'", () => {
    const { rerender } = render(<MapUnavailable reason={new MissingYandexMapsKeyError()} />);
    expect(screen.getByText(/not configured for this environment/)).toBeInTheDocument();

    rerender(<MapUnavailable reason={new Error("network")} />);
    expect(screen.getByText(/could not be loaded/)).toBeInTheDocument();
  });
});
