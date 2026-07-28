import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  // `video` is a standalone Remotion project with its own eslint.config.mjs,
  // parser and rule set. Linting it from here applies the app's React/browser
  // rules to code that isn't the app, so it is excluded and linted on its own.
  { ignores: ["dist", "video"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      // An error, not "off".
      //
      // It was disabled, which is how a `nextMove` object built on every
      // dashboard render and never used survived, along with 130 other dead
      // bindings: two admin tabs lazy-imported with no route, an admin query
      // fetching every game in the system and discarding it, an AI function
      // fetching the caller's history "for pattern matching" and ignoring it,
      // a `blockedSlots` prop nobody passed, and an `invoke()` whose result was
      // destructured and dropped in front of first paint on the embed widget.
      // None of those are style issues. Prefix with `_` to keep something
      // deliberately unused.
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrors: "none" },
      ],
      // Burn-down in progress: any-typing is a warning, not a CI blocker.
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
  {
    // Architecture rule: pages talk to data through hooks, never the raw client.
    // Existing offenders are migrated as each page is touched (warn until then).
    files: ["src/pages/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "warn",
        {
          paths: [
            {
              name: "@/integrations/supabase/client",
              message:
                "Pages must not use the supabase client directly — move data access into a hook (src/hooks or src/features/*/hooks).",
            },
          ],
        },
      ],
    },
  },
);
