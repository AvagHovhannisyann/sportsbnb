import { describe, it, expect } from "vitest";
import { CURRENCIES } from "@/lib/currencies";

/**
 * Two pages let someone set their currency, and both write the same column:
 * the profile page's "Display Currency" and the owner settings page's
 * "Currency". They used to offer different lists — fifteen against a hardcoded
 * five — so an owner who chose Georgian Lari on one found the field *blank* on
 * the other, because a controlled Radix `Select` whose value matches no item
 * renders neither the value nor its placeholder.
 *
 * Measured before the fix: /profile read "₾ Georgian Lari (GEL)" and
 * /owner/settings read "". They could not see what their currency was, and
 * touching the control would have forced them down to one of five.
 *
 * Both now derive from `CURRENCIES`. These tests are about the properties that
 * make that safe, so the next person to add a currency does not have to know
 * the story above.
 */
describe("CURRENCIES", () => {
  it("is not empty, so a picker built from it is never blank by construction", () => {
    expect(Object.keys(CURRENCIES).length).toBeGreaterThan(0);
  });

  it("gives every currency a symbol, a name and a locale", () => {
    for (const [code, info] of Object.entries(CURRENCIES)) {
      expect(info.symbol, `${code} symbol`).toBeTruthy();
      expect(info.name, `${code} name`).toBeTruthy();
      expect(info.locale, `${code} locale`).toBeTruthy();
    }
  });

  it("keys are ISO 4217 codes, which is what the profiles column stores", () => {
    for (const code of Object.keys(CURRENCIES)) {
      expect(code, code).toMatch(/^[A-Z]{3}$/);
    }
  });

  it("includes the currency this marketplace actually settles in", () => {
    // Ameria vPOS and Idram both settle in dram. A list without it would let
    // someone set a preference that the money rails cannot honour.
    expect(CURRENCIES.AMD).toBeDefined();
    expect(CURRENCIES.AMD.symbol).toBe("֏");
  });

  it("includes the fallback the provider starts on", () => {
    // CurrencyProvider initialises to USD before the profile loads. If that
    // were not in the list, every picker would render blank on first paint.
    expect(CURRENCIES.USD).toBeDefined();
  });

  it("has no duplicate codes", () => {
    const codes = Object.keys(CURRENCIES);
    expect(new Set(codes).size).toBe(codes.length);
  });
});
