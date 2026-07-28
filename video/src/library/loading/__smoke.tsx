import { Composition, registerRoot } from "remotion";
import { loadingCompositions } from "./index";
const Root: React.FC = () => (
  <>
    {loadingCompositions.map((c) => (
      <Composition key={c.id} id={c.id} component={c.component}
        durationInFrames={c.durationInFrames} fps={c.fps}
        width={c.width} height={c.height} defaultProps={c.defaultProps} />
    ))}
  </>
);
registerRoot(Root);
