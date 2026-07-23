import { test, expect } from "@playwright/test";

/**
 * Smoke pack — verifies the app shell, key public pages, and route guards
 * without needing seeded accounts. Authenticated flows (book → mock-pay →
 * confirm) require E2E_TEST_EMAIL/E2E_TEST_PASSWORD and a backend with
 * PAYMENTS_MOCK_ENABLED; they are skipped when credentials are absent.
 */

test("home page renders the in-app booking value prop", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(/find a court/i);
  await expect(page.getByText(/instant booking/i).first()).toBeVisible();
  // The WhatsApp-handoff era is over
  await expect(page.locator("body")).not.toContainText(/whatsapp/i);
});

test("venues page renders", async ({ page }) => {
  await page.goto("/venues");
  await expect(page.getByText(/venue/i).first()).toBeVisible();
});

test("games page renders", async ({ page }) => {
  await page.goto("/games");
  await expect(page).toHaveURL(/games/);
});

test("owner routes are guarded — anonymous users land on login", async ({ page }) => {
  await page.goto("/owner/earnings");
  await page.waitForURL(/\/(login|dashboard)/, { timeout: 15_000 });
});

test("unknown routes show the 404 page", async ({ page }) => {
  await page.goto("/definitely-not-a-real-page");
  await expect(page.getByText(/404|not found/i).first()).toBeVisible();
});

test.describe("authenticated booking flow", () => {
  test.skip(
    !process.env.E2E_TEST_EMAIL || !process.env.E2E_TEST_PASSWORD,
    "Requires E2E_TEST_EMAIL / E2E_TEST_PASSWORD and PAYMENTS_MOCK_ENABLED backend",
  );

  test("login → reserve → mock pay → confirmed", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel(/email/i).fill(process.env.E2E_TEST_EMAIL!);
    await page.getByLabel(/password/i).fill(process.env.E2E_TEST_PASSWORD!);
    await page.getByRole("button", { name: /log in|sign in/i }).click();
    await page.waitForURL(/dashboard|onboarding/, { timeout: 20_000 });

    await page.goto("/venues");
    await page.locator("a[href^='/venue/']").first().click();
    await page.getByRole("button", { name: /^reserve$/i }).click({ timeout: 20_000 });

    await page.waitForURL(/\/book\//, { timeout: 20_000 });
    await page.getByText(/test payment/i).click();
    await page.getByRole("button", { name: /^pay/i }).click();

    await page.waitForURL(/\/pay\/mock\//, { timeout: 20_000 });
    await page.getByRole("button", { name: /simulate successful payment/i }).click();

    await page.waitForURL(/\/booking\/.+\/status/, { timeout: 20_000 });
    await expect(page.getByText(/booking confirmed/i)).toBeVisible({ timeout: 30_000 });
  });
});
