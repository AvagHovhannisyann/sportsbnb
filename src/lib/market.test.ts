import { describe, expect, it } from "vitest";
import { classifyMarket, currencyFor } from "./market";

describe("classifyMarket", () => {
  it("does not read Armenian towns as Los Angeles", () => {
    // The actual bug. `"la"` matched as a substring, so every one of these
    // landed in the LA column of the operator dashboard — and, through
    // currencyFor, was counted in USD.
    expect(classifyMarket("Alaverdi")).toBe("Other");
    expect(classifyMarket("Gladzor")).toBe("Other");
    expect(classifyMarket("Lachin")).toBe("Other");
  });

  it("does not read -land cities as Los Angeles either", () => {
    expect(classifyMarket("Portland")).toBe("Other");
    expect(classifyMarket("Oakland")).toBe("Other");
    expect(classifyMarket("Cleveland")).toBe("Other");
  });

  it("still matches Los Angeles and its neighbourhoods", () => {
    expect(classifyMarket("Los Angeles")).toBe("Los Angeles");
    expect(classifyMarket("LA")).toBe("Los Angeles");
    expect(classifyMarket("west LA")).toBe("Los Angeles");
    expect(classifyMarket("Santa Monica, CA")).toBe("Los Angeles");
    expect(classifyMarket("Pasadena")).toBe("Los Angeles");
  });

  it("matches Yerevan in both scripts and by district", () => {
    expect(classifyMarket("Yerevan")).toBe("Yerevan");
    expect(classifyMarket("yerevan")).toBe("Yerevan");
    expect(classifyMarket("Երևան")).toBe("Yerevan");
    expect(classifyMarket("Kentron, Yerevan")).toBe("Yerevan");
    expect(classifyMarket("Arabkir")).toBe("Yerevan");
  });

  it("prefers Yerevan for districts that also contain 'la'", () => {
    // Malatia is a Yerevan district. Order matters, and this pins it.
    expect(classifyMarket("Malatia-Sebastia")).toBe("Yerevan");
  });

  it("handles punctuation, extra spaces and mixed case", () => {
    expect(classifyMarket("  YEREVAN,  Armenia ")).toBe("Yerevan");
    expect(classifyMarket("Los  Angeles")).toBe("Los Angeles");
  });

  it("returns Other for empty input rather than guessing", () => {
    expect(classifyMarket(null)).toBe("Other");
    expect(classifyMarket(undefined)).toBe("Other");
    expect(classifyMarket("")).toBe("Other");
    expect(classifyMarket("   ")).toBe("Other");
  });

  it("does not match a keyword glued to another word", () => {
    expect(classifyMarket("Lakeside")).toBe("Other");
    expect(classifyMarket("Venicebeachville")).toBe("Other");
  });
});

describe("currencyFor", () => {
  it("prices Yerevan in dram and everything else in dollars", () => {
    expect(currencyFor("Yerevan")).toBe("AMD");
    expect(currencyFor("Los Angeles")).toBe("USD");
    expect(currencyFor("Other")).toBe("USD");
  });
});
