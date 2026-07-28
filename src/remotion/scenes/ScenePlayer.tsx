import { useEffect, useRef, type CSSProperties, type ComponentType } from "react";
import { Player, type PlayerRef } from "@remotion/player";

import type { CompositionMetadata } from "../metadata";

/**
 * The one `<Player>` mount in the app. Everything that makes a Remotion
 * composition safe to leave running behind a page lives here, so no call site
 * has to remember it.
 *
 * This module is only ever reached through `React.lazy()` (see
 * `../RemotionScene.tsx`). Importing it statically would put `@remotion/player`
 * and whichever composition pulled it in on the critical path, which is the
 * whole thing the lazy boundary exists to prevent.
 */

export type ScenePlayerProps = {
  /** Host element class — sizing and positioning belong to the call site. */
  readonly className?: string;
  readonly style?: CSSProperties;
  /**
   * How the composition fills the host box, in the `object-fit` sense.
   *
   * `<Player>` is *contain* and has no option to be anything else: given a
   * 720×900 box it renders a 16:9 composition at 720×405 and centres it,
   * which on the login panel meant a letterboxed strip with dead space above
   * and below it. Every ambient backdrop wants `cover`; anything with a frame
   * of its own wants the default.
   */
  readonly fit?: "contain" | "cover";
};

type Props = ScenePlayerProps & {
  readonly component: ComponentType<Record<string, never>>;
  readonly metadata: CompositionMetadata;
};

/** Stable identity: a new object literal per render remounts the composition. */
const FILL: CSSProperties = { width: "100%", height: "100%" };

/**
 * `object-fit: cover`, for an element that has no `object-fit`.
 *
 * The composition is a fixed aspect ratio and the host is whatever shape the
 * layout makes it, so the player is sized to the *larger* of the two fits and
 * centred, with the host clipping the overflow. Because the inner box then
 * matches the composition's own ratio exactly, Player's contain behaviour and
 * cover produce the same pixels — the sizing is done before Player ever sees
 * the box, rather than fighting it afterwards.
 *
 * Container units (`cqw`/`cqh`), not `vw`/`vh`: the host is a hero section or
 * a half-width panel, never the viewport, and viewport units would mis-scale
 * at every breakpoint where those differ. `containerType: "size"` on the host
 * is what makes `cqh` resolve at all.
 */
const coverBox = (metadata: CompositionMetadata): CSSProperties => ({
  position: "absolute",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  width: `max(100cqw, calc(100cqh * ${metadata.width} / ${metadata.height}))`,
  height: `max(100cqh, calc(100cqw * ${metadata.height} / ${metadata.width}))`,
});

const COVER_HOST: CSSProperties = { overflow: "hidden", containerType: "size" };

export const ScenePlayer = ({
  component,
  metadata,
  className,
  style,
  fit = "contain",
}: Props) => {
  const hostRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<PlayerRef>(null);

  /**
   * Pause when there is nothing to see.
   *
   * Two independent reasons a loop can be invisible while still burning a
   * frame budget: the tab is in the background, and the element has scrolled
   * out of view. Browsers throttle rAF in a hidden tab but do not stop it, and
   * they do nothing at all about the second case — the landing hero would keep
   * compositing 30fps of SVG filters and blurs for the whole length of the
   * page. Both are cheap to observe and neither is handled by `<Player>`.
   *
   * The two signals are ANDed rather than each calling play/pause, so a tab
   * regaining focus while the hero is scrolled off screen does not restart it.
   */
  useEffect(() => {
    const host = hostRef.current;
    if (!host || typeof IntersectionObserver === "undefined") {
      return;
    }

    let onScreen = true;
    let tabVisible = document.visibilityState !== "hidden";

    const sync = () => {
      const player = playerRef.current;
      if (!player) {
        return;
      }
      const shouldPlay = onScreen && tabVisible;
      if (shouldPlay && !player.isPlaying()) {
        player.play();
      } else if (!shouldPlay && player.isPlaying()) {
        player.pause();
      }
    };

    const observer = new IntersectionObserver(
      (entries) => {
        onScreen = entries.some((entry) => entry.isIntersecting);
        sync();
      },
      // Any sliver counts as visible. A threshold above 0 would pause a hero
      // that is still showing its bottom edge.
      { threshold: 0 },
    );
    observer.observe(host);

    const onVisibilityChange = () => {
      tabVisible = document.visibilityState !== "hidden";
      sync();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  const cover = fit === "cover";

  const player = (
    <Player
      ref={playerRef}
      component={component}
      durationInFrames={metadata.durationInFrames}
      fps={metadata.fps}
      compositionWidth={metadata.width}
      compositionHeight={metadata.height}
      style={FILL}
      loop
      autoPlay
      // Decoration, not media. No chrome, no keyboard handling, no fullscreen,
      // and nothing that could take a click or a focus ring from the content
      // it sits behind.
      controls={false}
      showVolumeControls={false}
      allowFullscreen={false}
      clickToPlay={false}
      doubleClickToFullscreen={false}
      spaceKeyToPlayOrPause={false}
      // Neither composition contains an <Audio> or <Video>, so there is no
      // sound to emit; muted is belt-and-braces against that changing upstream
      // and turning an ambient loop into an autoplaying noise.
      initiallyMuted
      // …and no audio plumbing either. <Player> pre-creates five shared
      // <audio> elements by default so that compositions with sound can start
      // without a user gesture. With no sound to play they are five dead
      // elements per player — ten on the landing page mid-navigation, when the
      // hero plate and the loading screen are both mounted — for a feature
      // neither composition uses. Zero disables the pool.
      numberOfSharedAudioTags={0}
    />
  );

  return (
    <div
      ref={hostRef}
      // Always. A composition is a tree of unlabelled <div>s and <svg>s with
      // no text alternative and no meaning to convey — Remotion has no notion
      // of accessible content, and every embed here is decoration behind
      // something else. Where a scene stands in for content that *does* carry
      // semantics (the photograph on /login), those live on the fallback and
      // survive independently of this.
      aria-hidden="true"
      className={className}
      style={cover ? { ...style, ...COVER_HOST } : style}
    >
      {cover ? <div style={coverBox(metadata)}>{player}</div> : player}
    </div>
  );
};
