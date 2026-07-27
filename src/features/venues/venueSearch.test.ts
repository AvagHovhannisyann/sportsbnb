import { describe, it, expect } from "vitest";
import { matchesVenueQuery } from "./venueSearch";

const arena = { name: "Smoke Arena", address: "1 Test Street", city: "Yerevan" };

describe("matchesVenueQuery", () => {
  it("matches the name", () => {
    expect(matchesVenueQuery(arena, "smoke")).toBe(true);
    expect(matchesVenueQuery(arena, "Arena")).toBe(true);
  });

  it("matches the street address", () => {
    expect(matchesVenueQuery(arena, "test street")).toBe(true);
  });

  it("matches the city even when the venue also has an address", () => {
    // The regression this file exists for. `address || city` resolved to the
    // street, so a venue in Yerevan did not match "Yerevan".
    expect(matchesVenueQuery(arena, "yerevan")).toBe(true);
    expect(matchesVenueQuery(arena, "Yerevan")).toBe(true);
  });

  it("still matches the city when there is no address", () => {
    expect(matchesVenueQuery({ name: "Pitch", city: "Gyumri" }, "gyumri")).toBe(true);
    expect(matchesVenueQuery({ name: "Pitch", address: "", city: "Gyumri" }, "gyumri")).toBe(true);
    expect(matchesVenueQuery({ name: "Pitch", address: null, city: "Gyumri" }, "gyumri")).toBe(true);
  });

  it("rejects what is in none of the three fields", () => {
    expect(matchesVenueQuery(arena, "gyumri")).toBe(false);
    expect(matchesVenueQuery(arena, "swimming")).toBe(false);
  });

  it("matches everything on an empty or blank query", () => {
    expect(matchesVenueQuery(arena, "")).toBe(true);
    expect(matchesVenueQuery(arena, "   ")).toBe(true);
  });

  it("ignores the whitespace a pasted or typed query picks up", () => {
    expect(matchesVenueQuery(arena, "  yerevan  ")).toBe(true);
  });

  it("survives a venue with neither address nor city", () => {
    const bare = { name: "Nameless", address: null, city: null };
    expect(matchesVenueQuery(bare, "nameless")).toBe(true);
    expect(matchesVenueQuery(bare, "yerevan")).toBe(false);
  });
});
