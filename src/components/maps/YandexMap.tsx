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
import { fromLngLat, toLngLat, type LatLng, type LngLatBounds } from "@/lib/yandexGeo";
import { MapUnavailable, useYandexMaps } from "./YandexMapsProvider";

/**
 * A thin React binding for the Yandex JS API v3.
 *
 * v3 is imperative — you construct entities and attach them to a tree — so
 * this file does the same job `@react-google-maps/api` did: hold the instance
 * for its lifetime, keep its props in sync, and let children declare markers
 * without touching the instance themselves.
 *
 * Two differences from the Google components it replaces are worth knowing:
 *
 *  - Markers have no built-in icon. `YMapMarker` takes an HTMLElement and
 *    positions it; what is drawn is entirely ours. Marker content here is
 *    real React, portalled into that element, so the app's own components can
 *    be used and are keyboard-reachable — the Google `Marker` icons were
 *    hand-encoded SVG data URIs that no screen reader ever saw.
 *
 *  - There is no `InfoWindow`. `<YandexPopup>` is a marker whose content is a
 *    card, anchored above its point.
 */

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
  const initialLocation = useRef<YMapsLocationRequest>({
    center: toLngLat(center),
    zoom,
  });

  useEffect(() => {
    const element = containerRef.current;
    const api = typeof window !== "undefined" ? window.ymaps3 : undefined;
    if (!isLoaded || !element || !api) return;

    const instance = new api.YMap(element, {
      location: initialLocation.current,
      // 'dblClick' is deliberately absent from nothing — this is the v3
      // default set, spelled out so it is obvious that drag and scroll-zoom
      // are on and rotate/tilt are not. A tilted map of a five-a-side pitch
      // helps nobody and makes marker anchoring lie.
      behaviors: ["drag", "scrollZoom", "pinchZoom", "dblClick", "magnifier"],
    });
    instance.addChild(new api.YMapDefaultSchemeLayer({}));
    instance.addChild(new api.YMapDefaultFeaturesLayer({}));
    instance.addChild(
      new api.YMapListener({
        layer: "any",
        onClick: (_object, event) => {
          onClickRef.current?.(fromLngLat(event.coordinates));
        },
      }),
    );

    setMap(instance);
    return () => {
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
    if (bounds) map.setLocation({ bounds, duration });
    else map.setLocation({ center: toLngLat(center), zoom, duration });
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

  // One element for the lifetime of the marker; React portals into it and
  // ymaps3 positions it. Created lazily so this is safe under SSR/prerender.
  const [element] = useState<HTMLDivElement | null>(() =>
    typeof document === "undefined" ? null : document.createElement("div"),
  );

  const onDragEndRef = useRef(onDragEnd);
  useEffect(() => {
    onDragEndRef.current = onDragEnd;
  }, [onDragEnd]);

  const markerRef = useRef<YMapsEntity<YMapsMarkerProps> | null>(null);

  useEffect(() => {
    const api = typeof window !== "undefined" ? window.ymaps3 : undefined;
    if (!map || !element || !api) return;

    const marker = new api.YMapMarker(
      {
        coordinates: toLngLat(position),
        zIndex,
        draggable,
        blockEvents,
        onDragEnd: (coordinates) => onDragEndRef.current?.(fromLngLat(coordinates)),
      },
      element,
    );
    map.addChild(marker);
    markerRef.current = marker;
    return () => {
      map.removeChild(marker);
      markerRef.current = null;
    };
    // Position changes are pushed through `update()` below rather than
    // rebuilding the marker, which would flicker on every drag.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, element, draggable, blockEvents, zIndex]);

  useEffect(() => {
    markerRef.current?.update({ coordinates: toLngLat(position) });
  }, [position.lat, position.lng]);

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
 * The v3 stand-in for Google's `InfoWindow`.
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
    <div className="relative mb-3 w-[260px] max-w-[80vw] rounded-xl border border-border bg-popover p-3 text-popover-foreground shadow-lg">
      <button
        type="button"
        aria-label={closeLabel}
        onClick={onClose}
        className="absolute right-1.5 top-1.5 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
      >
        <X className="h-3.5 w-3.5" />
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
