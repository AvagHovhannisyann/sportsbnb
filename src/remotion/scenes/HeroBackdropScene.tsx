import { HeroBackdrop } from "../HeroBackdrop";
import { HERO_BACKDROP } from "../metadata";
import { ScenePlayer, type ScenePlayerProps } from "./ScenePlayer";

/**
 * Lazy chunk entry point — see the note in `BrandLoaderScene.tsx`.
 */
const HeroBackdropScene = (props: ScenePlayerProps) => (
  <ScenePlayer {...props} component={HeroBackdrop} metadata={HERO_BACKDROP} />
);

export default HeroBackdropScene;
