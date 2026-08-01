/**
 * Hand-written types for the slice of the Yandex JS API v3 this app uses.
 *
 * Yandex ships `@yandex/ymaps3-types`, but it peer-depends on
 * `@vue/runtime-core` and `@types/react-dom` and re-exports Vue/React wrapper
 * types from its entry point; pulling it in for the six classes below would
 * add a Vue dependency to a project that has none. The API itself is not
 * distributed on npm at all — it exists only as the global `ymaps3` the
 * loader script installs — so a declaration file is the honest shape of it.
 *
 * Every type here is copied from the published `.d.ts`. Coordinates are
 * `[longitude, latitude]`; see src/lib/yandexGeo.ts.
 */

export {};

declare global {
  /** `[longitude, latitude]`. */
  type YMapsLngLat = [number, number];

  /** `[top-left, bottom-right]` — `[[west, north], [east, south]]`. */
  type YMapsLngLatBounds = [YMapsLngLat, YMapsLngLat];

  interface YMapsLocationRequest {
    center?: YMapsLngLat;
    zoom?: number;
    bounds?: YMapsLngLatBounds;
    /** Animation duration in ms. 0 or absent for an instant jump. */
    duration?: number;
    easing?: string;
  }

  interface YMapsMapEvent {
    readonly coordinates: YMapsLngLat;
    readonly screenCoordinates: [number, number];
    stopPropagation(): void;
  }

  /** Base class for anything that can be added to a map. */
  interface YMapsEntity<Props = unknown> {
    update(changedProps: Partial<Props>): void;
  }

  interface YMapsMapProps {
    location: YMapsLocationRequest;
    className?: string;
    mode?: "auto" | "raster" | "vector";
    behaviors?: string[];
    theme?: "light" | "dark";
    margin?: [number, number, number, number];
    zoomRange?: { min: number; max: number };
  }

  interface YMapsMap extends YMapsEntity<YMapsMapProps> {
    addChild(child: YMapsEntity<never>, index?: number): YMapsMap;
    removeChild(child: YMapsEntity<never>): YMapsMap;
    setLocation(location: YMapsLocationRequest): void;
    destroy(): void;
    readonly zoom: number;
    readonly center: YMapsLngLat;
  }

  interface YMapsMarkerProps {
    coordinates: YMapsLngLat;
    zIndex?: number;
    draggable?: boolean;
    mapFollowsOnDrag?: boolean;
    blockEvents?: boolean;
    blockBehaviors?: boolean;
    /** Drag handlers receive the new coordinates, longitude first. */
    onDragStart?: (coordinates: YMapsLngLat) => void;
    onDragMove?: (coordinates: YMapsLngLat) => void;
    onDragEnd?: (coordinates: YMapsLngLat) => void;
    onClick?: (event: MouseEvent, mapEvent: YMapsMapEvent) => void;
  }

  interface YMapsListenerProps {
    /** "any" listens on every layer; omit to listen on the default one. */
    layer?: string;
    onClick?: (object: unknown, event: YMapsMapEvent) => void;
    onFastClick?: (object: unknown, event: YMapsMapEvent) => void;
    onUpdate?: (object: {
      type: "update";
      location: Required<YMapsLocationRequest>;
      mapInAction: boolean;
    }) => void;
  }

  interface Ymaps3 {
    /** Resolves once the main module is loaded and its DOM is built. */
    readonly ready: Promise<void>;
    YMap: new (
      element: HTMLElement,
      props: YMapsMapProps,
      children?: YMapsEntity<never>[],
    ) => YMapsMap;
    YMapDefaultSchemeLayer: new (props?: {
      zIndex?: number;
      visible?: boolean;
    }) => YMapsEntity<never>;
    YMapDefaultFeaturesLayer: new (props?: {
      zIndex?: number;
      visible?: boolean;
    }) => YMapsEntity<never>;
    YMapMarker: new (
      props: YMapsMarkerProps,
      element?: HTMLElement,
    ) => YMapsEntity<YMapsMarkerProps>;
    YMapListener: new (
      props: YMapsListenerProps,
    ) => YMapsEntity<YMapsListenerProps>;
    import: (packageName: string) => Promise<unknown>;
  }

  interface Window {
    ymaps3?: Ymaps3;
  }
}
