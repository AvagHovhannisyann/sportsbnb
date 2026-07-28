import { useState, useEffect } from "react";

/**
 * The app's cold-start screen — `fixed inset-0 z-[9999]` over everything for
 * the first ~2.3s of a visit.
 *
 * This briefly rendered the `BrandLoader` Remotion composition instead. It was
 * removed: a 260px square of animation sitting in the middle of an otherwise
 * empty full-bleed black screen read as an unfinished widget rather than a
 * brand moment, and the first screen of the product is the wrong place to look
 * unfinished. The composition itself is fine — it is still registered in
 * `video/src/Root.tsx` and still renders — it just does not belong here at
 * this size against this much empty space.
 *
 * A full-bleed treatment would be the version worth trying, not a smaller box.
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
    </div>
  );
};

export default SplashScreen;
