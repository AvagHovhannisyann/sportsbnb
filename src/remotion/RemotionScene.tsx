import { Suspense, lazy, type CSSProperties, type ReactNode } from "react";

import { sceneLoaders, type SceneName } from "./registry";
import { usePrefersReducedMotion } from "./useMediaQuery";

/**
 * The app's entire public surface for Remotion.
 *
 * Nothing outside `src/remotion/` imports `@remotion/player` or a composition
 * directly — it all goes through here, which is what keeps three separate
 * guarantees in one place instead of three call sites:
 *
 *   1. **Reduced motion never mounts a player.** Not "mounts it paused", not
 *      "mounts it frozen on frame 0" — the `lazy()` boundary is never reached,
 *      so the chunk is never even fetched. The visitor gets `fallback`.
 *   2. **The player is never on the critical path.** Every scene sits behind a
 *      dynamic `import()`, so `@remotion/player` and the composition it pulls
 *      in are their own chunk rather than part of the entry bundle.
 *   3. **There is always something to look at.** `fallback` is both the
 *      reduced-motion substitute and the Suspense fallback, so the
 *      still-loading state and the opted-out state are the same pixels by
 *      construction and cannot drift apart.
 *
 * `enabled` is the escape hatch for the fourth case, which is a judgement the
 * call site owns rather than this file: a panel that exists in the DOM but is
 * hidden at the current breakpoint (`hidden lg:flex`) still mounts and still
 * runs, so CSS alone does not opt phones out of the cost.
 */

const SCENES = {
  BrandLoader: lazy(sceneLoaders.BrandLoader),
  HeroBackdrop: lazy(sceneLoaders.HeroBackdrop),
} as const satisfies Record<SceneName, unknown>;

export type RemotionSceneProps = {
  readonly name: SceneName;
  /**
   * Shown instead of the player under reduced motion, when `enabled` is
   * false, and while the chunk is in flight. Required, and deliberately not
   * defaulted to `null`: "what does this look like without the animation" is a
   * question every embed has to answer out loud.
   */
  readonly fallback: ReactNode;
  /** Call-site gate — breakpoint, data saver, feature flag. */
  readonly enabled?: boolean;
  /** `object-fit` semantics for the composition inside the host box. */
  readonly fit?: "contain" | "cover";
  readonly className?: string;
  readonly style?: CSSProperties;
};

export const RemotionScene = ({
  name,
  fallback,
  enabled = true,
  fit,
  className,
  style,
}: RemotionSceneProps) => {
  const prefersReducedMotion = usePrefersReducedMotion();

  if (prefersReducedMotion || !enabled) {
    return <>{fallback}</>;
  }

  const Scene = SCENES[name];

  return (
    <Suspense fallback={fallback}>
      <Scene fit={fit} className={className} style={style} />
    </Suspense>
  );
};
