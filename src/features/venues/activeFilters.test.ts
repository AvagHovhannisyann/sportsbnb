import { describe, it, expect, beforeEach } from "vitest";
import { describeActiveFilters, type FilterState } from "./activeFilters";

const base: FilterState = {
  searchQuery: "",
  selectedSport: "",
  selectedCity: "",
  priceCeiling: 200000,
  maxPrice: 200000,
  priceTouched: false,
  locationLabel: null,
};

const keys = (over: Partial<FilterState>) =>
  describeActiveFilters({ ...base, ...over }).map((f) => f.key);

describe("active venue filters", () => {
  beforeEach(() => localStorage.removeItem("sportsbnb_region"));

  it("reports nothing on a page nobody has filtered", () => {
    expect(describeActiveFilters(base)).toEqual([]);
  });

  it("names each filter with its value, not just its field", () => {
    const filters = describeActiveFilters({
      ...base,
      selectedSport: "Basketball",
      selectedCity: "Yerevan",
    });
    expect(filters.map((f) => f.label)).toEqual(["Basketball", "Yerevan"]);
  });

  it("ignores a query that is only whitespace", () => {
    expect(keys({ searchQuery: "   " })).toEqual([]);
    expect(keys({ searchQuery: " arena " })).toEqual(["query"]);
  });

  // The ceiling follows the catalogue until the viewer moves it. Showing it
  // unconditionally would put a chip on every single visit whose × removes
  // nothing — and worse, would imply a filter the viewer never set.
  it("does not call an untouched price ceiling a filter", () => {
    expect(keys({ priceCeiling: 200000, maxPrice: 200000, priceTouched: false })).toEqual([]);
    // Even mid-track: if it was not touched, it is not the viewer's doing.
    expect(keys({ priceCeiling: 50000, maxPrice: 200000, priceTouched: false })).toEqual([]);
  });

  it("reports a price ceiling the viewer set and that excludes something", () => {
    expect(keys({ priceCeiling: 50000, maxPrice: 200000, priceTouched: true })).toEqual(["price"]);
  });

  // Touched, but dragged back to the top: it now excludes nothing, so it is
  // not narrowing anything and should not claim to be.
  it("drops a touched ceiling once it stops excluding anything", () => {
    expect(keys({ priceCeiling: 200000, maxPrice: 200000, priceTouched: true })).toEqual([]);
  });

  it("keeps a stable order so chips do not reshuffle as filters change", () => {
    expect(
      keys({
        searchQuery: "arena",
        selectedSport: "Tennis",
        selectedCity: "Gyumri",
        priceCeiling: 9000,
        maxPrice: 200000,
        priceTouched: true,
        locationLabel: "Near me",
      }),
    ).toEqual(["query", "sport", "city", "price", "location"]);
  });
});
