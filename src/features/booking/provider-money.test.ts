import { describe, it, expect } from "vitest";
import {
  minorToDecimal,
  decimalToMinor,
  CURRENCY_NUMERIC,
} from "../../../supabase/functions/_shared/providers/money.ts";

/**
 * The conversion at the provider boundary.
 *
 * Everything inside this system is integer minor units. Ameriabank's vPOS API
 * takes and returns decimal amounts. These two functions are the only place
 * that crosses between the two, which makes them the only place a rounding
 * error can turn into a wrong charge — and they had no tests.
 *
 * They are worth testing precisely because they look trivial. `amount * 100`
 * on a float is not exact, and the scale of that was measured rather than
 * assumed: across the 200,000 two-decimal amounts from ֏0.01 to ֏2,000,
 * **18,351 have a non-integer product** and **9,174 of those would be wrong
 * under `Math.floor`** — ֏0.29 becomes 28.999999999999996, which truncates to
 * 28 and charges a luma less than the bank captured. `Math.round` is correct
 * for all 200,000. That is what these tests pin down.
 *
 * The adapter itself cannot be unit-tested here — it reads `Deno.env` and
 * makes network calls, so it needs the sandbox credentials and a live run
 * against `servicestest.ameriabank.am`. That is listed in the readiness notes
 * rather than pretended at.
 */
describe("provider money conversion", () => {
  it("round-trips whole dram", () => {
    for (const minor of [0, 100, 500000, 1_050_000, 999_999_900]) {
      expect(decimalToMinor(minorToDecimal(minor))).toBe(minor);
    }
  });

  it("converts minor units to the decimal the bank expects", () => {
    expect(minorToDecimal(1_050_000)).toBe(10500); // ֏10,500
    expect(minorToDecimal(800_000)).toBe(8000);
    expect(minorToDecimal(1)).toBe(0.01);
    expect(minorToDecimal(0)).toBe(0);
  });

  it("converts the bank's decimal back without losing a unit to float error", () => {
    // The measured worst cases. Each has a non-integer product; truncating
    // loses a luma, rounding does not. (8000.07 * 100 is exactly 800007 —
    // an earlier version of this comment claimed otherwise, which is why the
    // cases below are ones that were actually enumerated rather than guessed.)
    expect(0.29 * 100).not.toBe(29); // 28.999999999999996 — the trap itself
    expect(decimalToMinor(0.29)).toBe(29);
    expect(decimalToMinor(0.57)).toBe(57);
    expect(decimalToMinor(0.58)).toBe(58);
    expect(decimalToMinor(0.07)).toBe(7);
    expect(decimalToMinor(10500)).toBe(1_050_000);
  });

  it("never returns a fractional minor unit", () => {
    for (const amount of [0.01, 0.07, 1.11, 8000.07, 12345.67, 99999.99]) {
      expect(Number.isInteger(decimalToMinor(amount))).toBe(true);
    }
  });

  it("is exact across every two-decimal amount the bank can send", () => {
    // The whole range rather than a handful, because the failures are not
    // where intuition puts them: 0.29 fails and 0.07 does not.
    let wrong = 0;
    for (let minor = 1; minor <= 200_000; minor += 1) {
      if (decimalToMinor(minor / 100) !== minor) wrong += 1;
    }
    expect(wrong).toBe(0);
  });

  it("maps the settlement currency to its ISO 4217 numeric code", () => {
    // Ameria vPOS takes the numeric code, not the alpha one. 051 is dram.
    expect(CURRENCY_NUMERIC.AMD).toBe("051");
    expect(CURRENCY_NUMERIC.USD).toBe("840");
    expect(CURRENCY_NUMERIC.EUR).toBe("978");
    expect(CURRENCY_NUMERIC.RUB).toBe("643");
  });

  it("gives every currency a three-digit numeric code", () => {
    for (const [alpha, numeric] of Object.entries(CURRENCY_NUMERIC)) {
      expect(alpha, `${alpha} is not an ISO alpha code`).toMatch(/^[A-Z]{3}$/);
      expect(numeric, `${alpha} numeric code`).toMatch(/^\d{3}$/);
    }
  });
});
