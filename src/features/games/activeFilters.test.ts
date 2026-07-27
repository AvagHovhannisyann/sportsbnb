import { describe, it, expect } from "vitest";
import { describeActiveGameFilters, type GameFilterState } from "./activeFilters";

const base: GameFilterState = {
  searchQuery: "",
  selectedSport: "",
  selectedLevel: "",
  hasLocation: false,
};

const chips = (over: Partial<GameFilterState>) =>
  describeActiveGameFilters({ ...base, ...over });

describe("active game filters", () => {
  it("reports nothing on an unfiltered list", () => {
    expect(describeActiveGameFilters(base)).toEqual([]);
  });

  it("ignores a query that is only whitespace", () => {
    expect(chips({ searchQuery: "  " })).toEqual([]);
    expect(chips({ searchQuery: " five-a-side " }).map((c) => c.label)).toEqual([
      "“five-a-side”",
    ]);
  });

  /**
   * The one worth pinning. "All levels" sits last in the Select, where a reset
   * usually does, and neither Select offers another way to clear itself — so
   * it looks like an unfilter. It is not: `skillLevelLabel` renders the stored
   * value "all" as "All levels", so a game created open-to-anyone shows
   * exactly that on its own card, and the option matches those games.
   *
   * Treating it as unset would have removed the only way to find open games.
   * This test exists so that reading cannot be lost again.
   */
  it("treats 'all' as a real level, not as no filter", () => {
    expect(chips({ selectedLevel: "all" })).toEqual([{ key: "level", label: "All levels" }]);
  });

  it("labels a level the way the game cards label it", () => {
    expect(chips({ selectedLevel: "beginner" }).map((c) => c.label)).toEqual(["beginner"]);
    expect(chips({ selectedLevel: "all" }).map((c) => c.label)).toEqual(["All levels"]);
  });

  it("keeps a stable order so chips do not reshuffle", () => {
    expect(
      chips({
        searchQuery: "pitch",
        selectedSport: "Football",
        selectedLevel: "advanced",
        hasLocation: true,
      }).map((c) => c.key),
    ).toEqual(["query", "sport", "level", "location"]);
  });
});
