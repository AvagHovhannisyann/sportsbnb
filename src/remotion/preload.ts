import { useEffect } from "react";

import { sceneLoaders, type SceneName } from "./registry";
import { usePrefersReducedMotion } from "./useMediaQuery";

/**
 * Warm a scene's chunk without mounting it.
 *
 * The loading screen is the case that needs this. `PageLoader` is on screen
 * for the few hundred milliseconds a route chunk takes to download, and a
 * player that only starts its own download at that moment loses that race
 * every time — every navigation would fall back to the spinner, and the
 * embed would be real but invisible, which is the problem this all started
 * from.
 *
 * Idle, never eager: this is the player plus a composition, and it must not
 * compete with the route chunks, images and fonts that first paint actually
 * depends on.
 */
export const preloadScene = (name: SceneName) => {
  void sceneLoaders[name]();
};

/**
 * `preloadScene` scheduled on the idle callback and gated on reduced motion —
 * there is no point fetching a player that will never be mounted.
 *
 * `requestIdleCallback` is still missing in older Safari; the timeout fallback
 * is deliberately long enough to be well past first paint on a slow
 * connection rather than a token `0`.
 */
/**
 * True when the visitor has asked their browser to use less data.
 *
 * Only consulted for the *speculative* fetch, never for a scene the page is
 * actually mounting: Save Data is a request to skip things that might not be
 * needed, which is exactly what a preload is and exactly what a rendered
 * element is not. Non-standard and Chromium-only, hence the defensive read.
 */
const prefersLessData = (): boolean => {
  if (typeof navigator === "undefined") {
    return false;
  }
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean } })
    .connection;
  return connection?.saveData === true;
};

export const usePreloadScene = (name: SceneName, enabled = true) => {
  const prefersReducedMotion = usePrefersReducedMotion();
  const active = enabled && !prefersReducedMotion && !prefersLessData();

  useEffect(() => {
    if (!active) {
      return;
    }

    const idle = window.requestIdleCallback;
    if (typeof idle === "function") {
      const handle = idle(() => preloadScene(name), { timeout: 4000 });
      return () => window.cancelIdleCallback?.(handle);
    }

    const timer = window.setTimeout(() => preloadScene(name), 2000);
    return () => window.clearTimeout(timer);
  }, [name, active]);
};
