import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { useReducedMotion } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { LatLng, LngLatBounds } from "@/lib/yandexGeo";
import { MapUnavailable, useYandexMaps } from "./YandexMapsProvider";

/**
 * A thin React binding for the Yandex JS API v2.1.
 *
 * v2.1 is imperative — you construct objects and add them to `geoObjects` — so
 * this file does the job `@react-google-maps/api` did: hold the instance for
 * its lifetime, keep its props in sync, and let children declare markers
 * without touching the instance themselves.
 *
 * Why v2.1 and not v3 is answered in YandexMapsProvider.tsx: the key this
 * project has is not entitled to v3, which answered every load with 403.
 *
 * Two things worth knowing about the marker implementation:
 *
 *  - v2.1 draws markers from *layout templates*, not from DOM elements you
 *    hand over. `YandexMarker` therefore builds a one-off layout class whose
 *    `build` adopts a `<div>` this component owns, and React portals into that
 *    div. The content is real React — the app's own components, keyboard
 *    reachable — rather than the hand-encoded SVG data URIs the Google
 *    implementation used and no screen reader ever saw.
 *
 *  - There is no `InfoWindow`. `<YandexPopup>` is a marker whose content is a
 *    card, anchored above its point.
 */

/* ────────────────────────────────────────────────────────────────────────
 * Coordinate order.
 *
 * v2.1 is LATITUDE FIRST, which is the opposite of the Geocoder and Geosuggest
 * HTTP APIs (longitude first, converted in src/lib/yandexGeo.ts) and the
 * opposite of the v3 binding this replaced. The conversion lives here, beside
 * the code that would get it wrong, and is asserted in YandexMap.test.tsx.
 *
 * A swap does not throw. Yerevan reversed is a valid point in the Aral Sea, so
 * the map renders perfectly with every venue in the wrong country.
 * ──────────────────────────────────────────────────────────────────────── */

/** `{ lat, lng }` → v2.1's `[lat, lng]`. */
export const toYmapsPoint = (point: LatLng): YMapsLatLngTuple => [point.lat, point.lng];

/** v2.1's `[lat, lng]` → `{ lat, lng }`. */
export const fromYmapsPoint = (coordinates: YMapsLatLngTuple): LatLng => ({
  lat: coordinates[0],
  lng: coordinates[1],
});

/**
 * The app's bounds type → v2.1's.
 *
 * `LngLatBounds` is `[[west, north], [east, south]]` with each pair
 * longitude-first. v2.1 wants `[[south, west], [north, east]]`, latitude
 * first — a different corner order *and* a different axis order, which is why
 * this is a named function with a test rather than an inline literal.
 */
export const toYmapsBounds = (bounds: LngLatBounds): YMapsBounds => {
  const [[west, north], [east, south]] = bounds;
  return [
    [south, west],
    [north, east],
  ];
};

const MapInstanceContext = createContext<YMapsMap | null>(null);

export interface YandexMapProps {
  /** Centre, used when `bounds` is absent. */
  center: LatLng;
  zoom?: number;
  /**
   * Fit these corners instead of centring. Takes precedence over
   * center/zoom; pass null to fall back to them.
   */
  bounds?: LngLatBounds | null;
  className?: string;
  style?: React.CSSProperties;
  /** Fires for clicks on the map itself, with the point clicked. */
  onClick?: (point: LatLng) => void;
  /** Names the map region for assistive tech. */
  ariaLabel?: string;
  children?: React.ReactNode;
}

/** Panning/zooming animation, in ms. Zero when the user asked for less motion. */
const PAN_DURATION = 300;

export const YandexMap: React.FC<YandexMapProps> = ({
  center,
  zoom = 12,
  bounds = null,
  className,
  style,
  onClick,
  ariaLabel,
  children,
}) => {
  const { isLoaded, loadError } = useYandexMaps();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [map, setMap] = useState<YMapsMap | null>(null);
  const prefersReduced = useReducedMotion();

  // Handlers live in a ref so a new closure on every render does not tear
  // down and rebuild the map. The listener is attached once.
  const onClickRef = useRef(onClick);
  useEffect(() => {
    onClickRef.current = onClick;
  }, [onClick]);

  // The location the map is *created* with. Read once; later changes go
  // through the update effect below, which animates rather than remounts.
  const initialState = useRef<YMapsMapState>({
    center: toYmapsPoint(center),
    zoom,
  });

  useEffect(() => {
    const element = containerRef.current;
    const api = typeof window !== "undefined" ? window.ymaps : undefined;
    if (!isLoaded || !element || !api) return;

    const instance = new api.Map(
      element,
      {
        ...initialState.current,
        // No default controls. v2.1 otherwise ships a zoom slider, a search
        // box, a traffic toggle and a fullscreen button, all styled as Yandex
        // rather than as this app, and the search box in particular offers a
        // second, competing way to look for places.
        controls: [],
        // Spelled out rather than left to the default so it is obvious that
        // drag and scroll-zoom are on and rotate/tilt are not. A tilted map of
        // a five-a-side pitch helps nobody and makes marker anchoring lie.
        behaviors: ["drag", "scrollZoom", "dblClickZoom", "multiTouch"],
      },
      {
        suppressMapOpenBlock: true,
        // The map's own points of interest are Yandex's, not ours; clicking
        // one opened a Yandex balloon over our venue markers.
        yandexMapDisablePoiInteractivity: true,
      },
    );

    const handleClick = (event: YMapsEventLike) => {
      const coords = event.get("coords") as YMapsLatLngTuple | undefined;
      if (coords) onClickRef.current?.(fromYmapsPoint(coords));
    };
    instance.events.add("click", handleClick);

    setMap(instance);
    return () => {
      instance.events.remove("click", handleClick);
      instance.destroy();
      setMap(null);
    };
    // Mount-once, by construction: the only reactive value the body reads is
    // `isLoaded`. `center`/`zoom` come from a ref and the click handler from
    // another, so a moving viewport or a fresh callback cannot rebuild the
    // map — which would drop every marker and reset the user's pan.
  }, [isLoaded]);

  // Keep the viewport in sync with props. Serialised keys rather than object
  // identity, so a caller rebuilding `{lat, lng}` every render does not
  // re-issue an animation on every render.
  const boundsKey = bounds ? JSON.stringify(bounds) : "";
  useEffect(() => {
    if (!map) return;
    const duration = prefersReduced ? 0 : PAN_DURATION;
    const move = bounds
      ? map.setBounds(toYmapsBounds(bounds), { duration, checkZoomRange: true })
      : map.setCenter(toYmapsPoint(center), zoom, { duration });

    // Both reject if the map is destroyed mid-animation, which is routine on
    // unmount and not worth surfacing — but an unhandled rejection would still
    // reach the console and any error reporter.
    //
    // Wrapped in a native promise rather than calling `.catch` directly: v2.1
    // returns a `vow` promise, whose contract this code should not assume
    // includes `catch`. `Promise.resolve` adopts any thenable, so this works
    // whatever they return — including the plain value a fake might hand back.
    void Promise.resolve(move).catch(() => {});
    // `bounds` is covered by boundsKey; `center` by its two numbers.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, center.lat, center.lng, zoom, boundsKey, prefersReduced]);

  if (loadError) return <MapUnavailable reason={loadError} className={className} />;

  return (
    <div
      ref={containerRef}
      className={cn("relative", className)}
      style={style}
      role="application"
      aria-label={ariaLabel ?? "Map"}
    >
      {map && (
        <MapInstanceContext.Provider value={map}>{children}</MapInstanceContext.Provider>
      )}
    </div>
  );
};

export interface YandexMarkerProps {
  position: LatLng;
  /**
   * Where the content sits relative to the point. `bottom` for pins whose tip
   * marks the spot, `center` for dots.
   */
  anchor?: "center" | "bottom";
  zIndex?: number;
  draggable?: boolean;
  onDragEnd?: (point: LatLng) => void;
  /**
   * Stop the map's own click/behaviour handlers firing underneath. Wanted for
   * popups and interactive content; not for a plain pin.
   */
  blockEvents?: boolean;
  children: React.ReactNode;
}

const ANCHOR_TRANSFORM: Record<NonNullable<YandexMarkerProps["anchor"]>, string> = {
  center: "translate(-50%, -50%)",
  bottom: "translate(-50%, -100%)",
};

/**
 * The DOM events that reach the map when they happen inside a marker.
 *
 * v2.1 attaches its behaviours to the map container, so a click inside a popup
 * also pans the map and a wheel over it zooms. v3 had a `blockEvents` prop;
 * here it is this list plus `stopPropagation`.
 */
const BLOCKED_EVENTS = [
  "click",
  "dblclick",
  "mousedown",
  "mouseup",
  "wheel",
  "touchstart",
  "touchmove",
] as const;

export const YandexMarker: React.FC<YandexMarkerProps> = ({
  position,
  anchor = "bottom",
  zIndex,
  draggable = false,
  onDragEnd,
  blockEvents = false,
  children,
}) => {
  const map = useContext(MapInstanceContext);

  // One element for the lifetime of the marker; React portals into it and the
  // layout below adopts it. Created lazily so this is safe under
  // SSR/prerender, and absolutely positioned so the wrapper's transform is
  // measured from the marker's point rather than from the layout box.
  const [element] = useState<HTMLDivElement | null>(() => {
    if (typeof document === "undefined") return null;
    const node = document.createElement("div");
    node.style.position = "absolute";
    node.style.left = "0";
    node.style.top = "0";
    return node;
  });

  const onDragEndRef = useRef(onDragEnd);
  useEffect(() => {
    onDragEndRef.current = onDragEnd;
  }, [onDragEnd]);

  const placemarkRef = useRef<YMapsGeoObject | null>(null);

  useEffect(() => {
    const api = typeof window !== "undefined" ? window.ymaps : undefined;
    if (!map || !element || !api) return;

    // A layout class per marker, because each one adopts its own element.
    // `superclass.build` must run first or the template never renders and
    // `getParentElement()` has nothing to return.
    const layout: YMapsLayoutClass = api.templateLayoutFactory.createClass(
      '<div class="sb-marker-layout"></div>',
      {
        build(this: YMapsLayoutInstance) {
          layout.superclass.build.call(this);
          this.getParentElement().appendChild(element);
        },
        clear(this: YMapsLayoutInstance) {
          element.remove();
          layout.superclass.clear.call(this);
        },
      },
    );

    const placemark = new api.Placemark(
      toYmapsPoint(position),
      {},
      {
        iconLayout: layout,
        draggable,
        zIndex,
        cursor: draggable ? "grab" : "default",
        // Hit area for the API's own pointer handling, which is what dragging
        // rides on. Content clicks do not need it — they are ordinary DOM
        // events on our own element — so a non-draggable marker opts out and
        // lets clicks through to the map beneath it.
        iconShape: draggable
          ? { type: "Circle", coordinates: [0, 0], radius: 22 }
          : null,
      },
    );

    const handleDragEnd = () => {
      onDragEndRef.current?.(fromYmapsPoint(placemark.geometry.getCoordinates()));
    };
    if (draggable) placemark.events.add("dragend", handleDragEnd);

    map.geoObjects.add(placemark);
    placemarkRef.current = placemark;

    return () => {
      if (draggable) placemark.events.remove("dragend", handleDragEnd);
      map.geoObjects.remove(placemark);
      placemarkRef.current = null;
    };
    // Position changes are pushed through `setCoordinates` below rather than
    // rebuilding the placemark, which would flicker on every drag.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, element, draggable, blockEvents, zIndex]);

  useEffect(() => {
    placemarkRef.current?.geometry.setCoordinates(toYmapsPoint(position));
  }, [position.lat, position.lng]);

  // Swallow the events the map would otherwise act on. Attached to our own
  // element rather than passed as an option, because v2.1 has no equivalent.
  useEffect(() => {
    if (!element || !blockEvents) return;
    const stop = (event: Event) => event.stopPropagation();
    for (const type of BLOCKED_EVENTS) element.addEventListener(type, stop);
    return () => {
      for (const type of BLOCKED_EVENTS) element.removeEventListener(type, stop);
    };
  }, [element, blockEvents]);

  const wrapperStyle = useMemo<React.CSSProperties>(
    () => ({ transform: ANCHOR_TRANSFORM[anchor], willChange: "transform" }),
    [anchor],
  );

  if (!element) return null;
  return createPortal(<div style={wrapperStyle}>{children}</div>, element);
};

export interface YandexPopupProps {
  position: LatLng;
  onClose: () => void;
  /** Accessible name for the close button, e.g. "Close venue details". */
  closeLabel?: string;
  children: React.ReactNode;
}

/**
 * The stand-in for Google's `InfoWindow`.
 *
 * A marker, anchored above its point, carrying a card drawn with the app's
 * own tokens. That is a change in kind from what it replaces: `InfoWindow`
 * rendered onto Google's white chrome, so every popup in this app had to
 * hardcode literal light-mode hex values and could never follow the dark
 * theme. This one is ordinary DOM inside our tree, so `bg-popover` and
 * `text-foreground` mean what they mean everywhere else.
 */
export const YandexPopup: React.FC<YandexPopupProps> = ({
  position,
  onClose,
  closeLabel = "Close",
  children,
}) => (
  <YandexMarker position={position} anchor="bottom" zIndex={1000} blockEvents>
    <div className="relative mb-3 w-[260px] max-w-[80vw] rounded-xl border border-border bg-popover p-3 pr-11 text-popover-foreground shadow-lg">
      <button
        type="button"
        aria-label={closeLabel}
        onClick={onClose}
        className="absolute right-0 top-0 flex h-11 w-11 touch-manipulation items-center justify-center rounded-lg text-muted-foreground transition-colors duration-150 hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring motion-reduce:transition-none"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
      {children}
      {/* The stem. Rotated square rather than a border triangle so it can
          carry the same border and background tokens as the card. */}
      <span
        aria-hidden="true"
        className="absolute left-1/2 top-full h-3 w-3 -translate-x-1/2 -translate-y-1/2 rotate-45 border-b border-r border-border bg-popover"
      />
    </div>
  </YandexMarker>
);

export default YandexMap;
