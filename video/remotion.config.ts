/**
 * Note: When using the Node.JS APIs, the config file
 * doesn't apply. Instead, pass options directly to the APIs.
 *
 * All configuration options: https://remotion.dev/docs/config
 */

import path from "path";
import { createRequire } from "module";
import { Config } from "@remotion/cli/config";
import { enableTailwind } from '@remotion/tailwind-v4';

Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);

/**
 * Two compositions — BrandLoader and HeroBackdrop — live in `../src/remotion/`
 * because the React app mounts them live through `@remotion/player`, and Vite
 * can only bundle what sits under the app's `src` root. `Root.tsx` imports
 * them across that boundary so there is one copy, not two.
 *
 * Webpack resolves bare specifiers relative to the *importing file*, so
 * `import { AbsoluteFill } from "remotion"` inside `../src/remotion/*.tsx`
 * walks up from the app directory and finds `<repo>/node_modules/remotion`
 * (alongside React 18, installed for the player), while everything under
 * `video/src` finds `video/node_modules/remotion` (React 19). Both copies
 * would land in the same bundle with their own module-level state — and
 * Remotion's frame context *is* module-level state, so `useCurrentFrame()`
 * inside those two files would read a provider nothing ever populated. That
 * surfaces at render time as a null dispatcher / "useCurrentFrame outside a
 * composition", not as a build error, which is why it is worth naming here.
 *
 * Pinning the three shared packages to this project's copies collapses that
 * back to one instance each. The aliases are non-exact, so subpath imports
 * (`remotion/no-react`, `react-dom/client`) still resolve underneath them.
 *
 * Resolution is anchored at `process.cwd()` and not at `__dirname`: the CLI
 * bundles this config before evaluating it, so `__dirname` at runtime is
 * `video/node_modules/@remotion/cli/dist`, and the aliases silently pointed at
 * `…/cli/dist/node_modules/react`, which does not exist. `createRequire` also
 * means a missing package throws here, by name, instead of producing an alias
 * to a path that is only reported 200 lines into a webpack resolve trace.
 */
const requireFromProject = createRequire(
  path.join(process.cwd(), "package.json"),
);

/** Absolute path to a package's own directory, resolved from this project. */
const pkgDir = (name: string) =>
  path.dirname(requireFromProject.resolve(`${name}/package.json`));

Config.overrideWebpackConfig((currentConfiguration) => {
  const withTailwind = enableTailwind(currentConfiguration);

  return {
    ...withTailwind,
    resolve: {
      ...withTailwind.resolve,
      alias: {
        ...withTailwind.resolve?.alias,
        react: pkgDir("react"),
        "react-dom": pkgDir("react-dom"),
        remotion: pkgDir("remotion"),
      },
    },
  };
});
