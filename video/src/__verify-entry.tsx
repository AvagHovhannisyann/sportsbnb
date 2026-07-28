import { Composition, registerRoot } from "remotion";
import { landingCompositions } from "./library/landing";

const Root: React.FC = () => (
  <>
    {landingCompositions.map((c) => (
      <Composition
        key={c.id}
        id={c.id}
        component={c.component}
        durationInFrames={c.durationInFrames}
        fps={c.fps}
        width={c.width}
        height={c.height}
        defaultProps={c.defaultProps}
      />
    ))}
  </>
);

registerRoot(Root);
