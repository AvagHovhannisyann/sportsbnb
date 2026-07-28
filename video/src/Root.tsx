import "./index.css";
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
import {
  SkeletonLoop,
  SKELETON_LOOP_DURATION,
  SKELETON_LOOP_FPS,
  SKELETON_LOOP_HEIGHT,
  SKELETON_LOOP_WIDTH,
} from "./SkeletonLoop";
import { StatCounter } from "./StatCounter";
import { VenuePromo, venuePromoDefaultProps } from "./VenuePromo";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {/* Template placeholder composition. Kept so the default studio entry
          point stays valid. */}
      <MyComposition />

      {/* Square 600x600 logo animation for splash / loading states. */}
      <Composition
        id="BrandLoader"
        component={BrandLoader}
        durationInFrames={60}
        fps={30}
        width={600}
        height={600}
      />

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

      {/* 6s ambient landscape loop used behind the marketing hero. */}
      <Composition
        id="HeroBackdrop"
        component={HeroBackdrop}
        durationInFrames={180}
        fps={30}
        width={1920}
        height={1080}
      />
    </>
  );
};
