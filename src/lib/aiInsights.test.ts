import { describe, expect, it } from "vitest";
import { asNextMove } from "./aiInsights";

/**
 * The card renders whatever this returns, so the cases that matter are the
 * malformed ones. `player-insights` is LLM-backed; a reshaped or truncated
 * payload is an ordinary Tuesday, not an edge case.
 */
describe("asNextMove", () => {
  const valid = {
    headline: "Your Thursday game needs two more players",
    detail: "Share it and fill the pitch.",
    cta_label: "Open game",
    cta_link: "/game/abc",
    vibe: "urgent",
  };

  it("accepts a complete suggestion", () => {
    expect(asNextMove(valid)).toEqual(valid);
  });

  it("rejects the empty object that used to render a husk", () => {
    // `{}` is truthy, so the card's `!data` guard passed and it drew a badge,
    // no text, and an arrow button linking to undefined.
    expect(asNextMove({})).toBeNull();
  });

  it("rejects anything missing a field the card renders", () => {
    expect(asNextMove({ ...valid, headline: undefined })).toBeNull();
    expect(asNextMove({ ...valid, cta_label: "" })).toBeNull();
    expect(asNextMove({ ...valid, cta_link: null })).toBeNull();
  });

  it("rejects non-objects", () => {
    expect(asNextMove(null)).toBeNull();
    expect(asNextMove(undefined)).toBeNull();
    expect(asNextMove("Book a court")).toBeNull();
  });

  it("tolerates a missing detail, which the card can render without", () => {
    const { detail: _detail, ...rest } = valid;
    expect(asNextMove(rest)?.detail).toBe("");
  });

  it("falls back to a known vibe rather than indexing the style map with junk", () => {
    expect(asNextMove({ ...valid, vibe: "apocalyptic" })?.vibe).toBe("neutral");
    expect(asNextMove({ ...valid, vibe: undefined })?.vibe).toBe("neutral");
  });
});
