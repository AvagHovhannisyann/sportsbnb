import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 45_000,
  // The app shows a splash screen before first paint; give assertions headroom.
  expect: { timeout: 15_000 },
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://127.0.0.1:8080",
    trace: "retain-on-failure",
    // Use a system/preinstalled Chromium when provided (CI images that ship
    // a browser at a fixed path) instead of downloading a pinned build.
    ...(process.env.PW_CHROMIUM_PATH
      ? { launchOptions: { executablePath: process.env.PW_CHROMIUM_PATH } }
      : {}),
  },
  webServer: {
    // Explicit IPv4 host — the project default (::) fails on IPv6-less CI hosts
    command: "npm run dev -- --host 127.0.0.1",
    url: "http://127.0.0.1:8080",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
