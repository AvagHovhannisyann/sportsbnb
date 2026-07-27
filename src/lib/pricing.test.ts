import { describe, it, expect } from "vitest";
import {
  getCustomerPrice,
  getPlatformFee,
  getOwnerPrice,
  formatPrice,
  formatPriceParts,
} from "./pricing";

describe("pricing", () => {
  it("adds the platform fee on top of the owner price, rounding up", () => {
    expect(getCustomerPrice(40)).toBe(42);
    expect(getCustomerPrice(100)).toBe(105);
    expect(getCustomerPrice(0)).toBe(0);
    // 33 * 1.05 = 34.65 → ceil → 35
    expect(getCustomerPrice(33)).toBe(35);
  });

  it("platform fee is the difference between customer and owner price", () => {
    expect(getPlatformFee(40)).toBe(2);
    expect(getPlatformFee(33)).toBe(2);
    expect(getPlatformFee(0)).toBe(0);
  });

  it("getOwnerPrice inverts getCustomerPrice within rounding tolerance", () => {
    for (const ownerPrice of [10, 40, 99, 1000, 15000]) {
      const roundTrip = getOwnerPrice(getCustomerPrice(ownerPrice));
      expect(Math.abs(roundTrip - ownerPrice)).toBeLessThanOrEqual(1);
    }
  });

  it("formats USD only for the US region, AMD otherwise", () => {
    localStorage.setItem("sportsbnb_region", "US");
    expect(formatPrice(42)).toBe("$42");

    localStorage.setItem("sportsbnb_region", "AM");
    expect(formatPrice(15000)).toBe(`֏${(15000).toLocaleString()}`);
  });

  // The previous default was USD, so every visitor whose timezone useRegion
  // could not map — the "OTHER" bucket, and anyone arriving before detection
  // has run — saw Armenian venues priced in dollars. Dram is the default the
  // inventory and the payment rails are actually denominated in.
  it("falls back to AMD when the region is unknown or unset", () => {
    localStorage.removeItem("sportsbnb_region");
    expect(formatPrice(13000)).toBe(`֏${(13000).toLocaleString()}`);

    localStorage.setItem("sportsbnb_region", "OTHER");
    expect(formatPrice(13000)).toBe(`֏${(13000).toLocaleString()}`);
  });
  // The split exists so the currency mark can be set in a face that has it.
  // Whatever else changes, the two halves must still join back into exactly
  // what formatPrice returns — otherwise the visible price and the one read
  // out to a screen reader drift apart.
  it("splits into a symbol and a figure that rejoin as formatPrice", () => {
    for (const region of ["US", "AM", "OTHER"]) {
      localStorage.setItem("sportsbnb_region", region);
      const { symbol, amount } = formatPriceParts(9500);
      expect(`${symbol}${amount}`).toBe(formatPrice(9500));
      expect(amount).toBe((9500).toLocaleString());
    }
  });

  // The whole point: the figure must stay inside JetBrains Mono's repertoire,
  // because `.stat-numeral` sets it in that font and the dram sign is not in
  // it. Measured, U+058F advanced 14.7px against the mono 12px and collided
  // with the digit beside it.
  it("keeps the figure free of non-ASCII, whatever the currency", () => {
    for (const region of ["US", "AM", "OTHER"]) {
      localStorage.setItem("sportsbnb_region", region);
      expect(formatPriceParts(1234567).amount).toMatch(/^[\x20-\x7E]+$/);
    }
  });
});
