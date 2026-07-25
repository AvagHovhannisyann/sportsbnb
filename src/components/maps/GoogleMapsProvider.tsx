import React, { createContext, useContext } from "react";
import { useJsApiLoader } from "@react-google-maps/api";

// Client-exposed browser key (restrict by HTTP referrer in Google Cloud).
const GOOGLE_MAPS_API_KEY =
  import.meta.env.VITE_GOOGLE_MAPS_BROWSER_KEY ?? "";

const libraries: ("places" | "geocoding")[] = ["places", "geocoding"];

interface GoogleMapsContextValue {
  isLoaded: boolean;
  loadError?: Error;
}

const GoogleMapsContext = createContext<GoogleMapsContextValue>({ isLoaded: false });

export const useGoogleMaps = () => useContext(GoogleMapsContext);

interface GoogleMapsProviderProps {
  children: React.ReactNode;
}

/**
 * Loads the Maps JS API without blocking the app: children render immediately
 * and map surfaces gate themselves with <MapsReady> / useGoogleMaps().
 * (The previous LoadScript wrapper held the ENTIRE app on "Loading..." until
 * Google's script arrived.)
 */
export const GoogleMapsProvider: React.FC<GoogleMapsProviderProps> = ({ children }) => {
  const { isLoaded, loadError } = useJsApiLoader({
    id: "sportsbnb-gmaps",
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries,
    language: "en",
  });

  return (
    <GoogleMapsContext.Provider value={{ isLoaded, loadError }}>
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
