import { CalculateMetadataFunction, Composition } from "remotion";

// No props yet. `Record<string, never>` rather than `{}`, which is the
// "any non-nullish value" type and is rejected by no-empty-object-type.
type Props = Record<string, never>;

const calculateMetadata: CalculateMetadataFunction<Props> = () => {
  return {};
};

export const MyComposition = () => {
  return (
    <Composition
      id="MyComp"
      component={MyComponent}
      durationInFrames={60}
      fps={30}
      width={1280}
      height={720}
      calculateMetadata={calculateMetadata}
    />
  );
};

export const MyComponent: React.FC<Props> = () => {
  return null;
};
