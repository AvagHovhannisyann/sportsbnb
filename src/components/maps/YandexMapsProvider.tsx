import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { MapPinOff } from "lucide-react";

/**
 * Client-exposed browser key. It ships in the bundle by necessity — the JS
 * API is loaded by the browser — so restrict it by HTTP referrer in the
 * Yandex Developer Dashboard. Absent, the app still renders; see
 * `MapUnavailable` below.
 */
const YANDEX_MAPS_API_KEY = import.meta.env.VITE_YANDEX_MAPS_API_KEY ?? "";

/**
 * Which JS API version, and why.
 *
 * v3, loaded from `https://api-maps.yandex.ru/v3/`. v2.1 and v3 are separate
 * products with incompatible object models — v2.1 is `ymaps.Map` +
 * `Placemark` + `geoObjects`, v3 is `ymaps3.YMap` + entity tree — so this is
 * a one-way decision, not a version bump.
 *
 * v3 wins on three counts that matter here. It is the version Yandex is
 * developing (v2.1 is maintained: critical fixes only, no new features), it
 * is vector-tiled rather than raster, and its markers are plain DOM elements
 * you supply, which lets the app's own React components — the same badges and
 * cards used elsewhere — be the marker content instead of the SVG data-URI
 * icons the Google implementation had to encode by hand.
 *
 * The cost is that v3 has no built-in balloon; popups here are markers whose
 * content happens to be a card. See YandexMap.tsx.
 */
const SCRIPT_ID = "sportsbnb-ymaps3";
const LOADER_SRC = `https://api-maps.yandex.ru/v3/?apikey=${encodeURIComponent(
  YANDEX_MAPS_API_KEY,
)}&lang=en_US`;

/** True when a key is configured. False is a normal state, not an error. */
export const isYandexMapsConfigured = () => YANDEX_MAPS_API_KEY !== "";

/**
 * Thrown when no key is set, so callers can tell "not configured" apart from
 * "Yandex is down". Both end at the same fallback, but only one is a bug.
 */
export class MissingYandexMapsKeyError extends Error {
  constructor() {
    super("VITE_YANDEX_MAPS_API_KEY is not set");
    this.name = "MissingYandexMapsKeyError";
  }
}

/**
 * Module-level so the script is fetched once per page, however many providers
 * or map surfaces mount. Kept outside React state deliberately: a component
 * remount must not re-inject the tag.
 */
let loadPromise: Promise<void> | null = null;

function loadYandexMaps(): Promise<void> {
  if (loadPromise) return loadPromise;

  loadPromise = new Promise<void>((resolve, reject) => {
    if (typeof window === "undefined" || typeof document === "undefined") {
      reject(new Error("Yandex Maps needs a browser"));
      return;
    }
    if (!YANDEX_MAPS_API_KEY) {
      reject(new MissingYandexMapsKeyError());
      return;
    }
    // Already there — either a previous load, or a server-rendered tag.
    if (window.ymaps3) {
      window.ymaps3.ready.then(() => resolve(), reject);
      return;
    }

    const settle = () => {
      const api = window.ymaps3;
      if (!api) {
        reject(new Error("Yandex Maps script loaded but ymaps3 is missing"));
        return;
      }
      // `ready` is the only reliable signal: the script tag's load event
      // fires before the API's own modules and DOM are in place.
      api.ready.then(() => resolve(), reject);
    };

    const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
    const script = existing ?? document.createElement("script");
    script.addEventListener("load", settle);
    script.addEventListener("error", () =>
      reject(new Error("Could not reach the Yandex Maps service")),
    );
    if (!existing) {
      script.id = SCRIPT_ID;
      script.src = LOADER_SRC;
      script.async = true;
      document.head.appendChild(script);
    }
  });

  // A failed load must not poison the page forever, but nor should every
  // consumer retry in a loop. The promise is kept; callers see the rejection.
  return loadPromise;
}

interface YandexMapsContextValue {
  isLoaded: boolean;
  loadError?: Error;
  /** Ask for the Maps script. Idempotent; safe to call on every render. */
  requestLoad: () => void;
}

const YandexMapsContext = createContext<YandexMapsContextValue>({
  isLoaded: false,
  requestLoad: () => {},
});

/**
 * Access the Maps load state, and register interest in the script.
 *
 * Merely calling this hook is what triggers the download, so a component that
 * needs Maps gets it by asking for the state — no separate opt-in call to
 * forget. Same contract the Google provider had, so consumers did not change.
 */
export const useYandexMaps = () => {
  const ctx = useContext(YandexMapsContext);
  const { requestLoad } = ctx;
  useEffect(() => {
    requestLoad();
  }, [requestLoad]);
  return ctx;
};

/**
 * Loads the Maps JS API on demand, and never blocks the app.
 *
 * Children render immediately. The script is requested by the first component
 * that actually asks for Maps state, via `useYandexMaps()` or `<MapsReady>`,
 * so /privacy, /terms, /faq, /login and /blog make no third-party request at
 * all — none of them shows a map.
 */
export const YandexMapsProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [wanted, setWanted] = useState(false);
  const [state, setState] = useState<{ isLoaded: boolean; loadError?: Error }>({
    isLoaded: false,
  });

  const requestLoad = useCallback(() => setWanted(true), []);

  useEffect(() => {
    if (!wanted) return;
    let cancelled = false;
    loadYandexMaps().then(
      () => {
        if (!cancelled) setState({ isLoaded: true, loadError: undefined });
      },
      (error: unknown) => {
        if (cancelled) return;
        setState({
          isLoaded: false,
          loadError:
            error instanceof Error ? error : new Error("Yandex Maps failed to load"),
        });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [wanted]);

  const value = useMemo(
    () => ({ isLoaded: state.isLoaded, loadError: state.loadError, requestLoad }),
    [state.isLoaded, state.loadError, requestLoad],
  );

  return (
    <YandexMapsContext.Provider value={value}>{children}</YandexMapsContext.Provider>
  );
};

/**
 * What a map surface shows when there is no map to show.
 *
 * Not a blank box and not a crash: the surrounding page — filters, counts,
 * the list view — stays usable, and the reason is stated rather than left to
 * a console error nobody has open. This is the path that runs in CI and in
 * any deployment without a Yandex key, so it is the one most likely to be
 * seen by someone who cannot fix it.
 */
export const MapUnavailable: React.FC<{ reason?: Error; className?: string }> = ({
  reason,
  className,
}) => {
  const unconfigured = reason instanceof MissingYandexMapsKeyError;
  return (
    <div
      className={
        className ??
        "flex h-full min-h-[200px] flex-col items-center justify-center gap-2 bg-muted/30 p-6 text-center"
      }
    >
      <MapPinOff className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
      <p className="text-sm font-medium text-foreground">Map unavailable</p>
      <p className="max-w-xs text-xs text-muted-foreground">
        {unconfigured
          ? "Maps are not configured for this environment. Everything else on this page still works."
          : "The map could not be loaded. Try again, or use the list view."}
      </p>
    </div>
  );
};

/** Renders children only once the Maps script is available. */
export const MapsReady: React.FC<{
  children: React.ReactNode;
  fallback?: React.ReactNode;
}> = ({ children, fallback }) => {
  const { isLoaded, loadError } = useYandexMaps();
  if (loadError) return <MapUnavailable reason={loadError} />;
  if (!isLoaded) {
    return (
      <>
        {fallback ?? (
          <div className="flex h-full min-h-[200px] items-center justify-center text-sm text-muted-foreground">
            Loading map…
          </div>
        )}
      </>
    );
  }
  return <>{children}</>;
};

export { YANDEX_MAPS_API_KEY };
