import { describe, it, expect } from "vitest";
import { canonicalSport } from "./sportFilter";
import { sportTypes } from "@/data/constants";

describe("canonicalSport", () => {
  it("passes through the exact strings venues are tagged with", () => {
    for (const sport of sportTypes) {
      expect(canonicalSport(sport)).toBe(sport);
    }
  });

  it("repairs the casing the hero bar used to send", () => {
    // The bug this exists for: ?sport=football matched zero venues while
    // ?sport=Football matched three, from two controls on the same screen.
    expect(canonicalSport("football")).toBe("Football");
    expect(canonicalSport("FOOTBALL")).toBe("Football");
    expect(canonicalSport("fOoTbAlL")).toBe("Football");
  });

  it("handles a multi-word sport, where a naive capitalise would not", () => {
    expect(canonicalSport("table tennis")).toBe("Table Tennis");
    expect(canonicalSport("martial arts")).toBe("Martial Arts");
  });

  it("tolerates the whitespace a pasted link picks up", () => {
    expect(canonicalSport(" tennis ")).toBe("Tennis");
  });

  it("drops a sport it does not know rather than filtering to nothing", () => {
    // Returning the raw value would empty the page *and* blank the picker,
    // leaving no visible filter to clear. See the note in sportFilter.ts.
    expect(canonicalSport("footbal")).toBe("");
    expect(canonicalSport("quidditch")).toBe("");
  });

  it("treats absent, empty and blank alike", () => {
    expect(canonicalSport(null)).toBe("");
    expect(canonicalSport(undefined)).toBe("");
    expect(canonicalSport("")).toBe("");
    expect(canonicalSport("   ")).toBe("");
  });

  it("only ever returns a value the Sport picker can render", () => {
    // The invariant that makes the blank-Select state unreachable: whatever
    // arrives in the URL, the result is "" or an exact member of the list the
    // <SelectItem>s are built from.
    const inputs = ["Football", "football", "  SQUASH", "nope", "", null, "table tennis"];
    for (const input of inputs) {
      const out = canonicalSport(input);
      expect(out === "" || sportTypes.includes(out)).toBe(true);
    }
  });
});
