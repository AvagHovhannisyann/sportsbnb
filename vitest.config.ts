import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  plugins: [react()],
  // Tests do not read .env.
  //
  // Vite loads it in every mode, so `npm test` locally ran with real
  // VITE_SUPABASE_* values while CI — which sets none for the `ci` job — ran
  // without them. A test that transitively imported the Supabase client
  // therefore passed here and failed there with "supabaseUrl is required",
  // which is exactly what happened. Pointing envDir at a directory with no
  // env files in it makes the local run match CI, so that class of failure
  // shows up before the push rather than after it.
  envDir: path.resolve(__dirname, "./src/test/no-env"),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom"],
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    // `scripts/` is included because the audits in it contain real logic —
    // and the piece of it that has now broken twice is a regex over markup,
    // which is exactly the kind of thing that needs pinned specimens rather
    // than a live browser. The scripts themselves still run against a real
    // page; only their pure helpers are unit-tested here.
    include: ["src/**/*.test.{ts,tsx}", "scripts/**/*.test.{ts,mjs}"],
    coverage: {
      provider: "v8",
      include: ["src/lib/**", "src/hooks/**", "src/features/**"],
    },
  },
});
