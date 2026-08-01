import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { YandexMap, YandexMarker } from "./YandexMap";

/**
 * The binding, driven against a fake `ymaps3`.
 *
 * The unit tests in src/lib/yandexGeo.test.ts prove the conversions. This
 * proves the components actually *use* them: that a `{lat, lng}` prop reaches
 * the API as `[lng, lat]`, and that a `[lng, lat]` event coordinate comes
 * back out as `{lat, lng}`. Those two hops are where a swap would survive a
 * green pure-function suite and still put every venue in the wrong country.
 */

vi.mock("./YandexMapsProvider", () => ({
  useYandexMaps: () => ({ isLoaded: true, loadError: undefined, requestLoad: () => {} }),
  MapUnavailable: () => <div>Map unavailable</div>,
}));

interface FakeMarker {
  props: YMapsMarkerProps;
  element?: HTMLElement;
  update: (p: Partial<YMapsMarkerProps>) => void;
}

const state = {
  mapProps: null as YMapsMapProps | null,
  mapElement: null as HTMLElement | null,
  locations: [] as YMapsLocationRequest[],
  listeners: [] as YMapsListenerProps[],
  markers: [] as FakeMarker[],
  destroyed: 0,
  layers: [] as string[],
};

function installFakeYmaps3() {
  const api = {
    ready: Promise.resolve(),
    YMap: class {
      constructor(element: HTMLElement, props: YMapsMapProps) {
        state.mapElement = element;
        state.mapProps = props;
      }
      addChild(child: unknown) {
        if ((child as { __kind?: string })?.__kind) state.layers.push((child as { __kind: string }).__kind);
        return this;
      }
      removeChild(child: unknown) {
        const index = state.markers.findIndex((m) => m === child);
        if (index >= 0) state.markers.splice(index, 1);
        return this;
      }
      setLocation(location: YMapsLocationRequest) {
        state.locations.push(location);
      }
      update() {}
      destroy() {
        state.destroyed += 1;
      }
    },
    YMapDefaultSchemeLayer: class {
      __kind = "scheme";
    },
    YMapDefaultFeaturesLayer: class {
      __kind = "features";
    },
    YMapListener: class {
      __kind = "listener";
      constructor(props: YMapsListenerProps) {
        state.listeners.push(props);
      }
    },
    YMapMarker: class {
      props: YMapsMarkerProps;
      element?: HTMLElement;
      constructor(props: YMapsMarkerProps, element?: HTMLElement) {
        this.props = props;
        this.element = element;
        state.markers.push(this as unknown as FakeMarker);
      }
      update(changed: Partial<YMapsMarkerProps>) {
        this.props = { ...this.props, ...changed };
      }
    },
    import: async () => ({}),
  };
  (window as unknown as { ymaps3: unknown }).ymaps3 = api;
}

beforeEach(() => {
  state.mapProps = null;
  state.mapElement = null;
  state.locations = [];
  state.listeners = [];
  state.markers = [];
  state.destroyed = 0;
  state.layers = [];
  installFakeYmaps3();
});

afterEach(() => {
  delete (window as unknown as { ymaps3?: unknown }).ymaps3;
});

const YEREVAN = { lat: 40.1872, lng: 44.5152 };

describe("YandexMap", () => {
  it("creates the map with longitude first", async () => {
    render(<YandexMap center={YEREVAN} zoom={13} />);
    await waitFor(() => expect(state.mapProps).not.toBeNull());
    expect(state.mapProps!.location).toEqual({ center: [44.5152, 40.1872], zoom: 13 });
  });

  it("adds a scheme layer, a features layer and one listener", async () => {
    render(<YandexMap center={YEREVAN} />);
    await waitFor(() => expect(state.layers.length).toBe(3));
    expect(state.layers).toEqual(["scheme", "features", "listener"]);
  });

  it("converts a click coordinate back to { lat, lng }", async () => {
    const onClick = vi.fn();
    render(<YandexMap center={YEREVAN} onClick={onClick} />);
    await waitFor(() => expect(state.listeners.length).toBe(1));

    // The API hands the handler [longitude, latitude].
    state.listeners[0].onClick!(undefined, {
      coordinates: [44.4991, 40.1792],
      screenCoordinates: [10, 10],
      stopPropagation: () => {},
    });
    expect(onClick).toHaveBeenCalledWith({ lat: 40.1792, lng: 44.4991 });
  });

  it("moves rather than rebuilds when the centre changes", async () => {
    const { rerender } = render(<YandexMap center={YEREVAN} zoom={12} />);
    await waitFor(() => expect(state.locations.length).toBeGreaterThan(0));
    const constructedOnce = state.mapProps;

    rerender(<YandexMap center={{ lat: 40.21, lng: 44.54 }} zoom={12} />);
    await waitFor(() =>
      expect(state.locations.at(-1)).toMatchObject({ center: [44.54, 40.21] }),
    );
    expect(state.mapProps).toBe(constructedOnce);
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
    await waitFor(() => expect(state.locations.length).toBeGreaterThan(0));
    expect(state.locations.at(-1)).toMatchObject({
      bounds: [
        [44.4, 40.25],
        [44.6, 40.1],
      ],
    });
    expect(state.locations.at(-1)).not.toHaveProperty("center");
  });

  it("names the map region for assistive tech", async () => {
    render(<YandexMap center={YEREVAN} ariaLabel="Map of venues" />);
    expect(screen.getByRole("application", { name: "Map of venues" })).toBeInTheDocument();
  });

  it("destroys the instance on unmount", async () => {
    const { unmount } = render(<YandexMap center={YEREVAN} />);
    await waitFor(() => expect(state.mapProps).not.toBeNull());
    unmount();
    expect(state.destroyed).toBe(1);
  });
});

describe("YandexMarker", () => {
  it("places the marker at [lng, lat] and portals its content into the element", async () => {
    render(
      <YandexMap center={YEREVAN}>
        <YandexMarker position={{ lat: 40.1792, lng: 44.4991 }}>
          <span>pin content</span>
        </YandexMarker>
      </YandexMap>,
    );
    await waitFor(() => expect(state.markers.length).toBe(1));
    expect(state.markers[0].props.coordinates).toEqual([44.4991, 40.1792]);
    expect(state.markers[0].element?.textContent).toBe("pin content");
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
    await waitFor(() => expect(state.markers.length).toBe(1));

    rerender(marker({ lat: 40.21, lng: 44.54 }));
    await waitFor(() => expect(state.markers[0].props.coordinates).toEqual([44.54, 40.21]));
    // Still the same marker — a rebuild would flicker mid-drag.
    expect(state.markers).toHaveLength(1);
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
    await waitFor(() => expect(state.markers.length).toBe(1));
    expect(state.markers[0].props.draggable).toBe(true);

    state.markers[0].props.onDragEnd!([44.4991, 40.1792]);
    expect(onDragEnd).toHaveBeenCalledWith({ lat: 40.1792, lng: 44.4991 });
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
    await waitFor(() => expect(state.markers.length).toBe(1));
    // The element lives outside the container in the fake, so reach it there.
    document.body.appendChild(state.markers[0].element!);
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
    await waitFor(() => expect(state.markers.length).toBe(1));
    rerender(<YandexMap center={YEREVAN} />);
    await waitFor(() => expect(state.markers).toHaveLength(0));
  });
});
