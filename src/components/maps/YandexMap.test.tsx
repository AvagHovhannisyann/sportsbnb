import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  YandexMap,
  YandexMarker,
  toYmapsBounds,
  toYmapsPoint,
  fromYmapsPoint,
} from "./YandexMap";

/**
 * The binding, driven against a fake `ymaps` (v2.1).
 *
 * The point of this file is coordinate order. v2.1 is LATITUDE FIRST, and
 * every other Yandex surface this app talks to is longitude first — the
 * Geocoder, Geosuggest, and the v3 binding this replaced. So a `{lat, lng}`
 * prop must reach the API as `[lat, lng]`, and an event coordinate must come
 * back out as `{lat, lng}`.
 *
 * That hop is where a swap survives a green pure-function suite and still puts
 * every venue in the wrong country: Yerevan is `[40.1872, 44.5152]`, and the
 * same two numbers reversed are a valid point in the Aral Sea. Nothing throws.
 */

vi.mock("./YandexMapsProvider", () => ({
  useYandexMaps: () => ({ isLoaded: true, loadError: undefined, requestLoad: () => {} }),
  MapUnavailable: () => <div>Map unavailable</div>,
}));

interface FakePlacemark {
  coordinates: YMapsLatLngTuple;
  options: YMapsPlacemarkOptions;
  geometry: YMapsGeometry;
  events: { handlers: Record<string, ((event: unknown) => void)[]> } & YMapsEventManager;
  /** The element the layout adopted, i.e. what React portalled into. */
  element?: HTMLElement;
}

const state = {
  mapElement: null as HTMLElement | null,
  mapState: null as YMapsMapState | null,
  mapOptions: null as YMapsMapOptions | null,
  /** Every setCenter/setBounds call, in order. */
  moves: [] as Array<{ center?: YMapsLatLngTuple; bounds?: YMapsBounds; zoom?: number }>,
  mapClickHandlers: [] as ((event: YMapsEventLike) => void)[],
  placemarks: [] as FakePlacemark[],
  destroyed: 0,
  /** Identity of the constructed map, to prove it is not rebuilt. */
  instances: 0,
};

/** Minimal stand-in for v2.1's event manager. */
function makeEvents() {
  const handlers: Record<string, ((event: unknown) => void)[]> = {};
  return {
    handlers,
    add(type: string | string[], cb: (event: never) => void) {
      const key = String(type);
      (handlers[key] ??= []).push(cb as (event: unknown) => void);
      return this as unknown as YMapsEventManager;
    },
    remove(type: string | string[], cb: (event: never) => void) {
      const key = String(type);
      handlers[key] = (handlers[key] ?? []).filter((h) => h !== cb);
      return this as unknown as YMapsEventManager;
    },
  };
}

function installFakeYmaps() {
  const api = {
    ready: (success?: () => void) => success?.(),
    Map: class {
      geoObjects = {
        add: (object: FakePlacemark) => {
          state.placemarks.push(object);
          return this.geoObjects;
        },
        remove: (object: FakePlacemark) => {
          const i = state.placemarks.indexOf(object);
          if (i >= 0) state.placemarks.splice(i, 1);
          return this.geoObjects;
        },
        removeAll: () => this.geoObjects,
      };
      events = makeEvents();
      behaviors = { enable: () => {}, disable: () => {} };
      constructor(
        element: HTMLElement,
        mapState: YMapsMapState,
        options?: YMapsMapOptions,
      ) {
        state.mapElement = element;
        state.mapState = mapState;
        state.mapOptions = options ?? null;
        state.instances += 1;
        // Mirror the real manager so the component's `add` is observable.
        const originalAdd = this.events.add.bind(this.events);
        this.events.add = ((type: string, cb: (e: YMapsEventLike) => void) => {
          if (type === "click") state.mapClickHandlers.push(cb);
          return originalAdd(type, cb as (e: never) => void);
        }) as typeof this.events.add;
      }
      setCenter(center: YMapsLatLngTuple, zoom?: number) {
        state.moves.push({ center, zoom });
        return Promise.resolve();
      }
      setBounds(bounds: YMapsBounds) {
        state.moves.push({ bounds });
        return Promise.resolve();
      }
      getCenter() {
        return [0, 0] as YMapsLatLngTuple;
      }
      getZoom() {
        return 12;
      }
      destroy() {
        state.destroyed += 1;
      }
    },
    Placemark: class {
      coordinates: YMapsLatLngTuple;
      options: YMapsPlacemarkOptions;
      geometry: YMapsGeometry;
      events = makeEvents();
      element?: HTMLElement;
      constructor(
        coordinates: YMapsLatLngTuple,
        _properties: Record<string, unknown>,
        options: YMapsPlacemarkOptions,
      ) {
        this.coordinates = coordinates;
        this.options = options;
        this.geometry = {
          getCoordinates: () => this.coordinates,
          setCoordinates: (next: YMapsLatLngTuple) => {
            this.coordinates = next;
          },
        };
        // Drive the layout the way the real API does: build it against a
        // parent element, which is what adopts the component's div.
        const layout = options.iconLayout as unknown as {
          __build?: (parent: HTMLElement) => void;
        };
        const parent = document.createElement("div");
        layout?.__build?.(parent);
        this.element = parent;
      }
    },
    templateLayoutFactory: {
      createClass(
        _template: string,
        overrides?: { build?: () => void; clear?: () => void },
      ) {
        // The real factory returns a class whose `build` runs with a `this`
        // exposing getParentElement(). Reproduced closely enough that the
        // component's superclass call and element adoption are exercised.
        const created = {
          superclass: { build() {}, clear() {} },
          __build(parent: HTMLElement) {
            overrides?.build?.call({
              getParentElement: () => parent,
              getData: () => ({ geoObject: {} as YMapsGeoObject }),
            });
          },
        };
        return created as unknown as YMapsLayoutClass;
      },
    },
  };
  (window as unknown as { ymaps: unknown }).ymaps = api;
}

beforeEach(() => {
  state.mapElement = null;
  state.mapState = null;
  state.mapOptions = null;
  state.moves = [];
  state.mapClickHandlers = [];
  state.placemarks = [];
  state.destroyed = 0;
  state.instances = 0;
  installFakeYmaps();
});

afterEach(() => {
  delete (window as unknown as { ymaps?: unknown }).ymaps;
});

const YEREVAN = { lat: 40.1872, lng: 44.5152 };

describe("coordinate conversion", () => {
  it("puts latitude first, the opposite of the geocoder", () => {
    expect(toYmapsPoint(YEREVAN)).toEqual([40.1872, 44.5152]);
    expect(fromYmapsPoint([40.1872, 44.5152])).toEqual(YEREVAN);
  });

  it("round-trips", () => {
    expect(fromYmapsPoint(toYmapsPoint(YEREVAN))).toEqual(YEREVAN);
  });

  it("reorders both the corners and the axes for bounds", () => {
    // App bounds: [[west, north], [east, south]], longitude first.
    // v2.1 wants: [[south, west], [north, east]], latitude first.
    expect(
      toYmapsBounds([
        [44.4, 40.25],
        [44.6, 40.1],
      ]),
    ).toEqual([
      [40.1, 44.4],
      [40.25, 44.6],
    ]);
  });
});

describe("YandexMap", () => {
  it("creates the map with latitude first", async () => {
    render(<YandexMap center={YEREVAN} zoom={13} />);
    await waitFor(() => expect(state.mapState).not.toBeNull());
    expect(state.mapState!.center).toEqual([40.1872, 44.5152]);
    expect(state.mapState!.zoom).toBe(13);
  });

  it("ships no default controls and suppresses the Yandex open-block", async () => {
    render(<YandexMap center={YEREVAN} />);
    await waitFor(() => expect(state.mapState).not.toBeNull());
    expect(state.mapState!.controls).toEqual([]);
    expect(state.mapOptions!.suppressMapOpenBlock).toBe(true);
  });

  it("converts a click coordinate back to { lat, lng }", async () => {
    const onClick = vi.fn();
    render(<YandexMap center={YEREVAN} onClick={onClick} />);
    await waitFor(() => expect(state.mapClickHandlers.length).toBe(1));

    // The API hands the handler [latitude, longitude] via get("coords").
    state.mapClickHandlers[0]({
      get: (name: string) => (name === "coords" ? [40.1792, 44.4991] : undefined),
    });
    expect(onClick).toHaveBeenCalledWith({ lat: 40.1792, lng: 44.4991 });
  });

  it("moves rather than rebuilds when the centre changes", async () => {
    const { rerender } = render(<YandexMap center={YEREVAN} zoom={12} />);
    await waitFor(() => expect(state.moves.length).toBeGreaterThan(0));

    rerender(<YandexMap center={{ lat: 40.21, lng: 44.54 }} zoom={12} />);
    await waitFor(() =>
      expect(state.moves.at(-1)).toMatchObject({ center: [40.21, 44.54] }),
    );
    expect(state.instances).toBe(1);
    expect(state.destroyed).toBe(0);
  });

  it("prefers bounds over centre when both are given", async () => {
    render(
      <YandexMap
        center={YEREVAN}
        zoom={12}
        bounds={[
          [44.4, 40.25],
          [44.6, 40.1],
        ]}
      />,
    );
    await waitFor(() => expect(state.moves.length).toBeGreaterThan(0));
    expect(state.moves.at(-1)).toMatchObject({
      bounds: [
        [40.1, 44.4],
        [40.25, 44.6],
      ],
    });
    expect(state.moves.at(-1)).not.toHaveProperty("center");
  });

  it("names the map region for assistive tech", async () => {
    render(<YandexMap center={YEREVAN} ariaLabel="Map of venues" />);
    expect(screen.getByRole("application", { name: "Map of venues" })).toBeInTheDocument();
  });

  it("destroys the instance on unmount", async () => {
    const { unmount } = render(<YandexMap center={YEREVAN} />);
    await waitFor(() => expect(state.mapState).not.toBeNull());
    unmount();
    expect(state.destroyed).toBe(1);
  });
});

describe("YandexMarker", () => {
  it("places the marker at [lat, lng] and portals its content into the element", async () => {
    render(
      <YandexMap center={YEREVAN}>
        <YandexMarker position={{ lat: 40.1792, lng: 44.4991 }}>
          <span>pin content</span>
        </YandexMarker>
      </YandexMap>,
    );
    await waitFor(() => expect(state.placemarks.length).toBe(1));
    expect(state.placemarks[0].coordinates).toEqual([40.1792, 44.4991]);
    expect(state.placemarks[0].element?.textContent).toBe("pin content");
  });

  it("updates coordinates in place when the position changes", async () => {
    const marker = (position: { lat: number; lng: number }) => (
      <YandexMap center={YEREVAN}>
        <YandexMarker position={position}>
          <span>pin</span>
        </YandexMarker>
      </YandexMap>
    );
    const { rerender } = render(marker({ lat: 40.1792, lng: 44.4991 }));
    await waitFor(() => expect(state.placemarks.length).toBe(1));

    rerender(marker({ lat: 40.21, lng: 44.54 }));
    await waitFor(() =>
      expect(state.placemarks[0].coordinates).toEqual([40.21, 44.54]),
    );
    // Still the same placemark — a rebuild would flicker mid-drag.
    expect(state.placemarks).toHaveLength(1);
  });

  it("converts a drag drop point back to { lat, lng }", async () => {
    const onDragEnd = vi.fn();
    render(
      <YandexMap center={YEREVAN}>
        <YandexMarker position={YEREVAN} draggable onDragEnd={onDragEnd}>
          <span>pin</span>
        </YandexMarker>
      </YandexMap>,
    );
    await waitFor(() => expect(state.placemarks.length).toBe(1));
    const placemark = state.placemarks[0];
    expect(placemark.options.draggable).toBe(true);
    // Draggable markers need a hit shape; the API's drag rides on it.
    expect(placemark.options.iconShape).not.toBeNull();

    // The API moves the geometry, then fires dragend with no coordinates.
    placemark.geometry.setCoordinates([40.1792, 44.4991]);
    for (const handler of placemark.events.handlers.dragend ?? []) handler(undefined);
    expect(onDragEnd).toHaveBeenCalledWith({ lat: 40.1792, lng: 44.4991 });
  });

  it("leaves a plain marker without a hit shape, so clicks reach the map", async () => {
    render(
      <YandexMap center={YEREVAN}>
        <YandexMarker position={YEREVAN}>
          <span>pin</span>
        </YandexMarker>
      </YandexMap>,
    );
    await waitFor(() => expect(state.placemarks.length).toBe(1));
    expect(state.placemarks[0].options.iconShape).toBeNull();
  });

  it("lets marker content be a real, clickable button", async () => {
    const onClick = vi.fn();
    render(
      <YandexMap center={YEREVAN}>
        <YandexMarker position={YEREVAN}>
          <button type="button" onClick={onClick}>
            Smoke Arena
          </button>
        </YandexMarker>
      </YandexMap>,
    );
    await waitFor(() => expect(state.placemarks.length).toBe(1));
    // The element lives outside the container in the fake, so reach it there.
    document.body.appendChild(state.placemarks[0].element!);
    await userEvent.click(screen.getByRole("button", { name: "Smoke Arena" }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("removes the marker from the map on unmount", async () => {
    const { rerender } = render(
      <YandexMap center={YEREVAN}>
        <YandexMarker position={YEREVAN}>
          <span>pin</span>
        </YandexMarker>
      </YandexMap>,
    );
    await waitFor(() => expect(state.placemarks.length).toBe(1));
    rerender(<YandexMap center={YEREVAN} />);
    await waitFor(() => expect(state.placemarks).toHaveLength(0));
  });
});
