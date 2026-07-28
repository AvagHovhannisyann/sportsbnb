import { BrandLoader } from "../BrandLoader";
import { BRAND_LOADER } from "../metadata";
import { ScenePlayer, type ScenePlayerProps } from "./ScenePlayer";

/**
 * Lazy chunk entry point. Default export, because that is what
 * `React.lazy()` resolves; the composition and `@remotion/player` are reached
 * only from here, so both land in this chunk rather than in the entry bundle.
 */
const BrandLoaderScene = (props: ScenePlayerProps) => (
  <ScenePlayer {...props} component={BrandLoader} metadata={BRAND_LOADER} />
);

export default BrandLoaderScene;
