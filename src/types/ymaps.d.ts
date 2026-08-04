/**
 * Hand-written types for the slice of the Yandex JS API v2.1 this app uses.
 *
 * The API is not distributed on npm — it exists only as the global `ymaps`
 * the loader script installs — so a declaration file is the honest shape of
 * it. `@types/yandex-maps` exists but covers the whole surface loosely; these
 * are the six things this app constructs, typed tightly enough that a wrong
 * argument is a compile error.
 *
 * ## Coordinates are LATITUDE FIRST
 *
 * This is the single most dangerous fact about v2.1, and it is the opposite of
 * every other Yandex product this codebase touches. The Geocoder and Geosuggest
 * HTTP APIs answer longitude-first (`"44.5152 40.1872"` for Yerevan), and the
 * JS API v3 this file replaced was longitude-first too. v2.1 is `[lat, lng]`.
 *
 * Swapping them is not a visible crash. Yerevan at `[40.1872, 44.5152]` is
 * correct; the same numbers reversed are a valid point in the Aral Sea, so a
 * map renders happily with every venue in the wrong country. `src/lib/
 * yandexGeo.ts` owns the longitude-first conversions for the HTTP APIs, and
 * deliberately does not export a latitude-first one — YandexMap.tsx converts
 * at its own boundary, next to the code that could get it wrong, with tests
 * that assert the order.
 */

export {};

declare global {
  /** `[latitude, longitude]` — v2.1's order. See the file comment. */
  type YMapsLatLngTuple = [number, number];

  /** `[[south, west], [north, east]]` — lower-left corner first. */
  type YMapsBounds = [YMapsLatLngTuple, YMapsLatLngTuple];

  interface YMapsEventLike {
    /** `get("coords")` yields `[lat, lng]` for pointer events. */
    get(name: string): unknown;
  }

  interface YMapsEventManager {
    add(
      types: string | string[],
      callback: (event: YMapsEventLike) => void,
      context?: unknown,
    ): YMapsEventManager;
    remove(
      types: string | string[],
      callback: (event: YMapsEventLike) => void,
      context?: unknown,
    ): YMapsEventManager;
  }

  interface YMapsGeometry {
    getCoordinates(): YMapsLatLngTuple;
    setCoordinates(coordinates: YMapsLatLngTuple): void;
  }

  interface YMapsGeoObject {
    geometry: YMapsGeometry;
    events: YMapsEventManager;
    options: { set(name: string, value: unknown): void };
  }

  interface YMapsGeoObjectCollection {
    add(object: YMapsGeoObject): YMapsGeoObjectCollection;
    remove(object: YMapsGeoObject): YMapsGeoObjectCollection;
    removeAll(): YMapsGeoObjectCollection;
  }

  /** Options accepted by `setCenter` / `setBounds`. */
  interface YMapsMoveOptions {
    /** Animation duration in ms. 0 or absent for an instant jump. */
    duration?: number;
    /** `setBounds` only: clamp to a zoom level that actually exists. */
    checkZoomRange?: boolean;
    timingFunction?: string;
  }

  interface YMapsMapState {
    center?: YMapsLatLngTuple;
    zoom?: number;
    bounds?: YMapsBounds;
    /** Empty array means "no default controls", which is what this app wants. */
    controls?: string[];
    behaviors?: string[];
    type?: string;
  }

  interface YMapsMapOptions {
    /** Hides the "Open in Yandex Maps" chrome in the corner. */
    suppressMapOpenBlock?: boolean;
    yandexMapDisablePoiInteractivity?: boolean;
    minZoom?: number;
    maxZoom?: number;
  }

  interface YMapsMap {
    geoObjects: YMapsGeoObjectCollection;
    events: YMapsEventManager;
    behaviors: { enable(name: string | string[]): void; disable(name: string | string[]): void };
    /**
     * Returns a `vow` promise, not a native one — typed as `PromiseLike` so
     * callers cannot assume `catch`/`finally` exist on it. See YandexMap.tsx.
     */
    setCenter(
      center: YMapsLatLngTuple,
      zoom?: number,
      options?: YMapsMoveOptions,
    ): PromiseLike<void>;
    setBounds(bounds: YMapsBounds, options?: YMapsMoveOptions): PromiseLike<void>;
    getCenter(): YMapsLatLngTuple;
    getZoom(): number;
    destroy(): void;
  }

  /**
   * What `templateLayoutFactory.createClass` hands back.
   *
   * `superclass` is how v2.1 does inheritance: an override must call
   * `Layout.superclass.build.call(this)` or the template never renders. It is
   * declared here so that call needs no cast.
   */
  interface YMapsLayoutClass {
    superclass: {
      build(this: YMapsLayoutInstance): void;
      clear(this: YMapsLayoutInstance): void;
    };
  }

  interface YMapsLayoutInstance {
    getParentElement(): HTMLElement;
    getData(): { geoObject: YMapsGeoObject };
  }

  interface YMapsPlacemarkOptions {
    draggable?: boolean;
    iconLayout?: YMapsLayoutClass | string;
    iconShape?: {
      type: string;
      coordinates: number[] | number[][];
      radius?: number;
    } | null;
    iconOffset?: [number, number];
    zIndex?: number;
    cursor?: string;
    interactivityModel?: string;
  }

  interface Ymaps {
    /**
     * v2.1's ready takes callbacks rather than being a promise. Calling it
     * with no arguments returns a promise-like, but the callback form is the
     * one documented and the one used here.
     */
    ready(successCallback?: () => void, errorCallback?: (error: Error) => void): void;
    Map: new (
      element: HTMLElement | string,
      state: YMapsMapState,
      options?: YMapsMapOptions,
    ) => YMapsMap;
    Placemark: new (
      coordinates: YMapsLatLngTuple,
      properties?: Record<string, unknown>,
      options?: YMapsPlacemarkOptions,
    ) => YMapsGeoObject;
    templateLayoutFactory: {
      createClass(
        template: string,
        overrides?: {
          build?(this: YMapsLayoutInstance): void;
          clear?(this: YMapsLayoutInstance): void;
        },
      ): YMapsLayoutClass;
    };
  }

  interface Window {
    ymaps?: Ymaps;
  }
}
