import { describe, it, expect } from "vitest";
import { getCustomerPrice, getPlatformFee, getOwnerPrice, formatPrice } from "./pricing";

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

  it("formats AMD for the AM region and USD otherwise", () => {
    localStorage.setItem("sportsbnb_region", "AM");
    expect(formatPrice(15000)).toBe(`֏${(15000).toLocaleString()}`);
    localStorage.setItem("sportsbnb_region", "US");
    expect(formatPrice(42)).toBe("$42");
    localStorage.removeItem("sportsbnb_region");
    expect(formatPrice(42)).toBe("$42");
  });
});
