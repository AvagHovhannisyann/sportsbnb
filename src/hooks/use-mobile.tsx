import * as React from "react";

const MOBILE_BREAKPOINT = 768;

export function useIsMobile() {
  // This is a client-rendered Vite application, so resolve the first layout
  // synchronously. Starting at `undefined` briefly mounted desktop overlays on
  // phones before swapping them for sheets; that swap could also interrupt
  // focus restoration while a dialog was opening.
  const [isMobile, setIsMobile] = React.useState(() =>
    typeof window === "undefined" ? false : window.innerWidth < MOBILE_BREAKPOINT,
  );

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };
    mql.addEventListener("change", onChange);
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return isMobile;
}
