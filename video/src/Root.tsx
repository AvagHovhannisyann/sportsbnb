import "./index.css";
import type { ComponentType, ReactElement } from "react";
import { Composition } from "remotion";

import { MyComposition } from "./Composition";
import { BookingFlow } from "./BookingFlow";
import { FeatureReel } from "./FeatureReel";
import { OwnerPitch } from "./OwnerPitch";
/*
 * BrandLoader and HeroBackdrop live in the *app* — `src/remotion/` — not here.
 *
 * They are the two compositions the React app mounts live through
 * `@remotion/player` (the loading screen and the landing hero plate), so they
 * have to sit inside the app's `tsconfig`/Vite `src` root to be bundled at
 * all. One copy, two consumers: the studio and `remotion render` read them
 * from across the directory boundary, the app imports them as `@/remotion/*`.
 *
 * Reaching out of `video/` means webpack resolves bare specifiers from the
 * app's `node_modules` for those two files and from `video/node_modules` for
 * everything else — two Reacts and two `remotion`s in one bundle, which is an
 * "invalid hook call" at render time rather than a build error. The aliases in
 * `remotion.config.ts` pin all three to this project's copies; do not remove
 * them.
 */
import { BrandLoader } from "../../src/remotion/BrandLoader";
import { HeroBackdrop } from "../../src/remotion/HeroBackdrop";
import { BRAND_LOADER, HERO_BACKDROP } from "../../src/remotion/metadata";
import {
  SkeletonLoop,
  SKELETON_LOOP_DURATION,
  SKELETON_LOOP_FPS,
  SKELETON_LOOP_HEIGHT,
  SKELETON_LOOP_WIDTH,
} from "./SkeletonLoop";
import { StatCounter } from "./StatCounter";
import { VenuePromo, venuePromoDefaultProps } from "./VenuePromo";
import { authCompositions } from "./library/auth";
import { brandCompositions } from "./library/brand";
import { dashboardCompositions } from "./library/dashboard";
import { landingCompositions } from "./library/landing";
import { loadingCompositions } from "./library/loading";
import { microCompositions } from "./library/micro";
import { socialCompositions } from "./library/social";
import { venueCompositions } from "./library/venue";

/*
 * ─────────────────────────── the library ────────────────────────────────
 *
 * Eight families live under `src/library/*`, each exporting a manifest array
 * describing every composition it owns. They were authored at different times
 * and their entry types are NOT identical:
 *
 *   auth / dashboard / micro / social / venue
 *       { id, component: FC<never>, durationInFrames, fps, width, height,
 *         defaultProps, seamless }
 *   brand
 *       readonly { id, component: FC<Record<string, unknown>>, …, defaultProps }
 *       — no `seamless` flag at all
 *   landing
 *       readonly { id, component: ComponentType<Record<string, unknown>>, …,
 *         defaultProps, group, seamlessLoop }
 *   loading
 *       { id, component: ComponentType<any>, …, defaultProps } — no flag
 *
 * What every one of them *does* share is the seven fields `<Composition>`
 * actually needs. `LibraryEntry` below is exactly that intersection, and
 * `registerFamily` maps a family onto it. The families are deliberately left
 * alone — the adapter lives here, on the consumer side, so a family can keep
 * carrying whatever extra metadata (`seamless`, `group`, …) its own callers
 * want without Root having to know about it.
 */

type LibraryEntry = {
  readonly id: string;
  /**
   * Prop types are already erased inside each family (every one of them casts
   * exactly once, after type-checking `defaultProps` against the component).
   * The four erased forms — `FC<never>`, `FC<Record<string, unknown>>`,
   * `ComponentType<Record<string, unknown>>`, `ComponentType<any>` — have no
   * common supertype that `<Composition>` will accept, so the adapter
   * re-erases to the one shape it wants. Nothing is weakened by this: the
   * component/`defaultProps` pairing was already proven in the family.
   */
  readonly component: ComponentType<Record<string, unknown>>;
  readonly durationInFrames: number;
  readonly fps: number;
  readonly width: number;
  readonly height: number;
  readonly defaultProps: Record<string, unknown>;
};

/** The widest shape all eight manifests structurally satisfy. */
type ManifestEntry = Omit<LibraryEntry, "component"> & {
  readonly component: unknown;
};

const registerFamily = (
  family: readonly ManifestEntry[],
): ReactElement[] =>
  family.map((entry) => (
    <Composition
      key={entry.id}
      id={entry.id}
      component={entry.component as ComponentType<Record<string, unknown>>}
      durationInFrames={entry.durationInFrames}
      fps={entry.fps}
      width={entry.width}
      height={entry.height}
      defaultProps={entry.defaultProps}
    />
  ));

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {/* Template placeholder composition. Kept so the default studio entry
          point stays valid. */}
      <MyComposition />

      {/* Square 600x600 logo animation for splash / loading states.
          Metadata is spread from `src/remotion/metadata.ts` because the app
          mounts this same composition in a <Player>, which needs the identical
          four numbers — and a Player given the wrong duration does not error,
          it silently plays part of the loop. */}
      <Composition id="BrandLoader" component={BrandLoader} {...BRAND_LOADER} />

      {/* 24s landscape product tour. */}
      <Composition
        id="FeatureReel"
        component={FeatureReel}
        durationInFrames={720}
        fps={30}
        width={1920}
        height={1080}
      />

      {/* 15s square venue advert, driven by props so one composition can be
          re-rendered per venue. */}
      <Composition
        id="VenuePromo"
        component={VenuePromo}
        durationInFrames={450}
        fps={30}
        width={1080}
        height={1080}
        defaultProps={venuePromoDefaultProps}
      />

      {/* Seamless loading-skeleton loop for embedding in the app shell. */}
      <Composition
        id="SkeletonLoop"
        component={SkeletonLoop}
        durationInFrames={SKELETON_LOOP_DURATION}
        fps={SKELETON_LOOP_FPS}
        width={SKELETON_LOOP_WIDTH}
        height={SKELETON_LOOP_HEIGHT}
      />

      {/* 8s square stats card at 60fps for smooth number roll-ups. */}
      <Composition
        id="StatCounter"
        component={StatCounter}
        durationInFrames={480}
        fps={60}
        width={1080}
        height={1080}
      />

      {/* 20s landscape pitch aimed at venue owners. */}
      <Composition
        id="OwnerPitch"
        component={OwnerPitch}
        durationInFrames={600}
        fps={30}
        width={1920}
        height={1080}
      />

      {/* 12s vertical walkthrough of the booking flow, sized for stories. */}
      <Composition
        id="BookingFlow"
        component={BookingFlow}
        durationInFrames={360}
        fps={30}
        width={1080}
        height={1920}
      />

      {/* 6s ambient landscape loop used behind the marketing hero — mounted
          live in the app, so its metadata is shared. See BrandLoader above. */}
      <Composition id="HeroBackdrop" component={HeroBackdrop} {...HERO_BACKDROP} />

      {/* ── the library ──────────────────────────────────────────────────
          202 compositions across eight families. Ids are namespaced by the
          families themselves ("Auth…", "Brand-…", "Dashboard…", "Landing…",
          "Loading…", "Micro…", "Social…", "Venue…"), which is what keeps them
          from colliding with each other or with the nine registrations above —
          verified by counting `remotion compositions`, since a duplicate id is
          a startup failure rather than a compile error. */}
      {registerFamily(brandCompositions)}
      {registerFamily(loadingCompositions)}
      {registerFamily(landingCompositions)}
      {registerFamily(authCompositions)}
      {registerFamily(venueCompositions)}
      {registerFamily(dashboardCompositions)}
      {registerFamily(socialCompositions)}
      {registerFamily(microCompositions)}
    </>
  );
};
