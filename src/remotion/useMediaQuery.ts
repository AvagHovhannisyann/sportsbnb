import { useEffect, useState } from "react";

/**
 * `matchMedia` as a hook, with a **synchronous** first value.
 *
 * The app already has `useIsMobile` and framer-motion's `useReducedMotion`,
 * and neither is usable for this: both start at `false`/`null` and correct
 * themselves in an effect. That is harmless when the answer only drives a
 * class name, and not harmless here — the thing gated on it is a
 * `React.lazy()` boundary, so one render at the wrong value is enough to fire
 * the dynamic `import()` and pull ~100 kB of player over the wire on exactly
 * the visitors (reduced-motion, phones) it was gated away from. The request is
 * already in flight by the time the effect corrects the value.
 *
 * Reading `matchMedia` in the `useState` initialiser costs one synchronous
 * media-query evaluation on mount and makes the first render the right one.
 * `useEffect` then only handles *changes* — resizing across the breakpoint, or
 * toggling the OS motion setting with the tab open.
 */
export const useMediaQuery = (query: string): boolean => {
  const [matches, setMatches] = useState<boolean>(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return false;
    }
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return;
    }
    const list = window.matchMedia(query);
    const onChange = () => setMatches(list.matches);
    // Sync once on (re)subscribe: the query can have changed between the
    // initialiser and this effect, and Strict Mode double-invocation makes
    // that ordering worth being explicit about.
    onChange();
    list.addEventListener("change", onChange);
    return () => list.removeEventListener("change", onChange);
  }, [query]);

  return matches;
};

/**
 * True when the visitor has asked their OS to reduce motion.
 *
 * The compositions honour this internally too (they freeze on a
 * well-populated frame rather than hiding), but that only helps once they are
 * mounted. This is the gate that stops them being mounted at all — an
 * autoplaying loop is precisely what the setting exists to prevent, and the
 * cheapest way to respect it is to not ship the player to that visitor.
 */
export const usePrefersReducedMotion = (): boolean =>
  useMediaQuery("(prefers-reduced-motion: reduce)");
