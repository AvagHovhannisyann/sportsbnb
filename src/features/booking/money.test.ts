import { describe, it, expect } from "vitest";
import {
  minorToDecimal,
  decimalToMinor,
  CURRENCY_NUMERIC,
} from "../../../supabase/functions/_shared/providers/money";

/**
 * These guard the amount that actually reaches the bank. A rounding slip here
 * means charging the wrong price, so the round-trips are exhaustive.
 */
describe("money conversion", () => {
  it("converts minor units to provider decimals", () => {
    expect(minorToDecimal(0)).toBe(0);
    expect(minorToDecimal(100)).toBe(1);
    expect(minorToDecimal(840_000)).toBe(8400);
    expect(minorToDecimal(1)).toBe(0.01);
  });

  it("converts provider decimals to minor units", () => {
    expect(decimalToMinor(0)).toBe(0);
    expect(decimalToMinor(1)).toBe(100);
    expect(decimalToMinor(8400)).toBe(840_000);
    expect(decimalToMinor(0.01)).toBe(1);
  });

  it("round-trips every plausible AMD booking amount without drift", () => {
    for (let amd = 0; amd <= 200_000; amd += 250) {
      const minor = amd * 100;
      expect(decimalToMinor(minorToDecimal(minor))).toBe(minor);
    }
  });

  it("guards against float error on decimal inputs (0.29 * 100 = 28.999…)", () => {
    expect(decimalToMinor(0.29)).toBe(29);
    expect(decimalToMinor(1.15)).toBe(115);
    expect(decimalToMinor(19.99)).toBe(1999);
  });

  it("maps currencies to ISO 4217 numeric codes for Ameria", () => {
    expect(CURRENCY_NUMERIC.AMD).toBe("051");
    expect(CURRENCY_NUMERIC.USD).toBe("840");
    expect(CURRENCY_NUMERIC.EUR).toBe("978");
  });
});

/**
 * Mirrors the commission split done in create_booking_hold(): owner earns the
 * listed price, the platform adds commission_bps on top, and the player pays
 * the sum. Encodes the money invariants so a change to the split is deliberate.
 *
 * The live rate is now 0 — `platform_settings.commission_bps = '0'` — so the
 * cases that matter in production are the zero-bps ones. `split` stays
 * parameterised on the rate rather than hardcoding "no fee", because the rate
 * is a setting and the arithmetic has to stay correct if one is reintroduced.
 */
describe("commission split (create_booking_hold parity)", () => {
  const split = (pricePerHour: number, hours: number, commissionBps: number) => {
    const ownerMinor = Math.round(pricePerHour * hours * 100);
    const feeMinor = Math.round((ownerMinor * commissionBps) / 10000);
    return { ownerMinor, feeMinor, totalMinor: ownerMinor + feeMinor };
  };

  // ── Zero commission: the shipped behaviour ──

  it("takes no fee at 0 bps — the player pays exactly the listed price", () => {
    const { ownerMinor, feeMinor, totalMinor } = split(12000, 1, 0);
    expect(ownerMinor).toBe(1_200_000);
    expect(feeMinor).toBe(0);
    expect(totalMinor).toBe(1_200_000);
  });

  it("gives the owner 100% at 0 bps, at every price and duration", () => {
    for (const price of [1000, 3333, 8000, 12000, 47000]) {
      for (const hours of [1, 2, 3]) {
        const s = split(price, hours, 0);
        expect(s.feeMinor).toBe(0);
        expect(s.ownerMinor).toBe(s.totalMinor);
        expect(s.totalMinor).toBe(Math.round(price * hours * 100));
      }
    }
  });

  it("never produces NaN or a negative fee at 0 bps", () => {
    const { feeMinor } = split(0, 1, 0);
    expect(feeMinor).toBe(0);
    expect(Number.isNaN(feeMinor)).toBe(false);
  });

  // ── Non-zero rates: kept so a future commission stays correct ──

  it("adds the configured rate on top of the owner's price", () => {
    const { ownerMinor, feeMinor, totalMinor } = split(8000, 1, 500);
    expect(ownerMinor).toBe(800_000);
    expect(feeMinor).toBe(40_000);
    expect(totalMinor).toBe(840_000);
  });

  it("scales the owner amount with duration", () => {
    expect(split(5000, 2, 500).ownerMinor).toBe(1_000_000);
    expect(split(5000, 2, 500).totalMinor).toBe(1_050_000);
  });

  it("total is always owner + fee (no money created or lost)", () => {
    for (const bps of [0, 250, 500]) {
      for (const price of [1000, 3333, 12500, 47000]) {
        const s = split(price, 1, bps);
        expect(s.totalMinor).toBe(s.ownerMinor + s.feeMinor);
      }
    }
  });
});
