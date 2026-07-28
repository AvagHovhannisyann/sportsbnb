import { useState, useEffect } from "react";

import { RemotionScene } from "@/remotion/RemotionScene";

/**
 * The static splash, kept intact as the substitute state.
 *
 * This is what a reduced-motion visitor sees, and what is on screen for the
 * few hundred milliseconds the `BrandLoader` chunk is in flight on a cold
 * cache. Deliberately the *same* markup the splash has always used rather
 * than a new "loading the loader" state — if the animation never arrives the
 * page is exactly the page it was before, not a degraded version of it.
 */
const StaticSplash = () => (
  <>
    <div className="flex flex-col items-center gap-2 animate-in fade-in zoom-in-95 duration-500">
      <img
        src="/favicon.png"
        alt="Sportsbnb"
        className="w-16 h-16 object-contain animate-pulse motion-reduce:animate-none"
        draggable={false}
        // The splash is the first paint. Anything here that waits on the
        // normal image queue is late by definition.
        fetchPriority="high"
        decoding="async"
      />
    </div>

    <div className="mt-10">
      <div className="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin motion-reduce:animate-none" />
    </div>
  </>
);

/**
 * The app's cold-start screen — and the reason the Remotion embed was
 * invisible in review.
 *
 * `PageLoader` in `App.tsx` mounts `BrandLoader` correctly, but it is the
 * *Suspense* fallback: it only appears on a route transition into a lazy
 * chunk. This component is `fixed inset-0 z-[9999]` over the whole app for
 * the first ~2.3s of every visit, so on the one screen anybody actually
 * watches — the first one — the branded loop was covered by a favicon and a
 * CSS spinner. Both loading states now show the same composition.
 *
 * Mounting `RemotionScene` here starts the chunk's `import()` immediately
 * rather than on idle, which is the point: the splash exists to cover load
 * time, and a loader that arrives after the thing it was loading has no
 * reason to exist. It is still a *separate* chunk — nothing about this puts
 * `@remotion/player` in the entry bundle — so the cost is one parallel,
 * non-render-blocking request against a screen that is showing a complete
 * static state the whole time it is in flight.
 */
const SplashScreen = ({ onFinished }: { onFinished: () => void }) => {
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setFadeOut(true);
      setTimeout(onFinished, 500); // wait for fade-out
    }, 1800);
    return () => clearTimeout(timer);
  }, [onFinished]);

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background transition-opacity duration-500 ${
        fadeOut ? "opacity-0" : "opacity-100"
      }`}
    >
      <RemotionScene
        name="BrandLoader"
        fallback={<StaticSplash />}
        // Matches `PageLoader`. The composition is authored on a 600×600
        // canvas carrying a wordmark and a caption; below roughly 180px the
        // caption stops being readable, so the square is capped rather than
        // fluid.
        className="h-[min(72vw,260px)] w-[min(72vw,260px)]"
      />
    </div>
  );
};

export default SplashScreen;
