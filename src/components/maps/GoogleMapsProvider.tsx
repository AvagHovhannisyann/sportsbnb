import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useJsApiLoader } from "@react-google-maps/api";

// Client-exposed browser key (restrict by HTTP referrer in Google Cloud).
const GOOGLE_MAPS_API_KEY =
  import.meta.env.VITE_GOOGLE_MAPS_BROWSER_KEY ?? "";

const libraries: ("places" | "geocoding")[] = ["places", "geocoding"];

interface GoogleMapsContextValue {
  isLoaded: boolean;
  loadError?: Error;
  /** Ask for the Maps script. Idempotent; safe to call on every render. */
  requestLoad: () => void;
}

const GoogleMapsContext = createContext<GoogleMapsContextValue>({
  isLoaded: false,
  requestLoad: () => {},
});

/**
 * Access the Maps load state, and register interest in the script.
 *
 * Merely calling this hook is what triggers the download, so a component that
 * needs Maps gets it by asking for the state — no separate opt-in call to
 * forget.
 */
export const useGoogleMaps = () => {
  const ctx = useContext(GoogleMapsContext);
  const { requestLoad } = ctx;
  useEffect(() => {
    requestLoad();
  }, [requestLoad]);
  return ctx;
};

interface GoogleMapsProviderProps {
  children: React.ReactNode;
}

/**
 * Inner component: exists only so `useJsApiLoader` — a hook, and therefore
 * uncallable conditionally — can be mounted on demand rather than always.
 */
const MapsScriptLoader: React.FC<{
  onState: (s: { isLoaded: boolean; loadError?: Error }) => void;
}> = ({ onState }) => {
  const { isLoaded, loadError } = useJsApiLoader({
    id: "sportsbnb-gmaps",
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries,
    language: "en",
  });
  useEffect(() => {
    onState({ isLoaded, loadError });
  }, [isLoaded, loadError, onState]);
  return null;
};

/**
 * Loads the Maps JS API on demand, and never blocks the app.
 *
 * Two things this deliberately does *not* do. It does not wrap the app in
 * `LoadScript`, which held the entire UI on "Loading…" until Google's script
 * arrived. And it no longer calls `useJsApiLoader` unconditionally at the
 * root: that fetched the Maps API on every route in the app — /privacy,
 * /terms, /faq, /login, /blog — when only a handful of screens show a map.
 * Each of those is a third-party request, a billable Maps JS load, and a
 * connection to Google from a page that has no reason to make one.
 *
 * Now the script is requested by the first component that actually asks for
 * Maps state, via `useGoogleMaps()` or `<MapsReady>`. Children still render
 * immediately, and map surfaces still gate themselves.
 */
export const GoogleMapsProvider: React.FC<GoogleMapsProviderProps> = ({ children }) => {
  const [wanted, setWanted] = useState(false);
  const [state, setState] = useState<{ isLoaded: boolean; loadError?: Error }>({
    isLoaded: false,
  });

  const requestLoad = useCallback(() => setWanted(true), []);
  const onState = useCallback(
    (s: { isLoaded: boolean; loadError?: Error }) => setState(s),
    [],
  );

  const value = useMemo(
    () => ({ isLoaded: state.isLoaded, loadError: state.loadError, requestLoad }),
    [state.isLoaded, state.loadError, requestLoad],
  );

  return (
    <GoogleMapsContext.Provider value={value}>
      {wanted && <MapsScriptLoader onState={onState} />}
      {children}
    </GoogleMapsContext.Provider>
  );
};

/** Renders children only once the Maps script is available. */
export const MapsReady: React.FC<{ children: React.ReactNode; fallback?: React.ReactNode }> = ({
  children,
  fallback,
}) => {
  const { isLoaded, loadError } = useGoogleMaps();
  if (loadError) {
    return (
      <div className="flex h-full min-h-[200px] items-center justify-center text-sm text-muted-foreground">
        Map unavailable
      </div>
    );
  }
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

export { GOOGLE_MAPS_API_KEY };
