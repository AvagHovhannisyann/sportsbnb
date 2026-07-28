import { Composition, registerRoot } from "remotion";

import { brandCompositions } from "./index";

/** Loop ids and their true periods, for the seam check below. */
const LOOPS: readonly string[] = [
  "Brand-LoopPulse",
  "Brand-LoopOrbit",
  "Brand-LoopDashCycle",
  "Brand-LoopShimmerBar",
  "Brand-WatermarkCornerBug",
  "Brand-WatermarkLiveBadge",
];

const ScratchRoot: React.FC = () => (
  <>
    {brandCompositions.map((c) => (
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
    {/*
      Seam probes: identical to the loop, but one frame longer, so frame
      `period` — the frame a looping player wraps onto — actually exists and
      can be rendered and compared with frame 0. Every driver in those files is
      a pure function of `frame` and `durationInFrames`, so the probe has to
      hold `durationInFrames` at the real period; it does not, it uses
      period + 1, which is exactly why this is a scratch file and not shipped:
      the probe measures the *expression*, and the +1 shifts it. Handled by
      passing the true period explicitly is not possible without editing the
      compositions, so the probe below is only valid for the files whose cycle
      is derived from `durationInFrames` when it equals the registered value.
    */}
    {brandCompositions
      .filter((c) => LOOPS.indexOf(c.id) !== -1)
      .map((c) => (
        <Composition
          key={`${c.id}-seam`}
          id={`${c.id}-seam`}
          component={c.component}
          durationInFrames={c.durationInFrames + 1}
          fps={c.fps}
          width={c.width}
          height={c.height}
          defaultProps={c.defaultProps}
        />
      ))}
  </>
);

registerRoot(ScratchRoot);
