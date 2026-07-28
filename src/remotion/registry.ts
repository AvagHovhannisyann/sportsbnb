/**
 * The scene registry — every Remotion composition the app can mount, and the
 * dynamic `import()` that fetches it.
 *
 * Its own module for two reasons. The literal specifier inside each loader is
 * what the bundler statically analyses into a chunk, so the *same* function
 * has to back both `React.lazy()` and the imperative preload — declaring them
 * twice would be two chunks holding two copies of `@remotion/player`. And
 * keeping it out of the component file means `RemotionScene.tsx` exports
 * components and nothing else, which is what fast refresh needs to reload it
 * without dropping state.
 */
export const sceneLoaders = {
  BrandLoader: () => import("./scenes/BrandLoaderScene"),
  HeroBackdrop: () => import("./scenes/HeroBackdropScene"),
} as const;

export type SceneName = keyof typeof sceneLoaders;
