import { describe, expect, it } from "vitest";
import { formatTimeOfDay, formatTimeRange } from "./time";

describe("formatTimeOfDay", () => {
  it("drops the seconds Postgres sends", () => {
    // The actual bug: `time` columns arrive as HH:MM:SS and were printed raw.
    expect(formatTimeOfDay("19:00:00")).toBe("19:00");
    expect(formatTimeOfDay("08:30:00")).toBe("08:30");
  });

  it("leaves an already-trimmed time alone", () => {
    expect(formatTimeOfDay("19:00")).toBe("19:00");
  });

  it("pads a single-digit hour", () => {
    expect(formatTimeOfDay("9:05:00")).toBe("09:05");
  });

  it("returns empty for null and undefined rather than 'null'", () => {
    expect(formatTimeOfDay(null)).toBe("");
    expect(formatTimeOfDay(undefined)).toBe("");
    expect(formatTimeOfDay("")).toBe("");
  });

  it("hands back anything it cannot parse instead of rendering NaN", () => {
    expect(formatTimeOfDay("not a time")).toBe("not a time");
    expect(formatTimeOfDay("aa:bb")).toBe("aa:bb");
  });
});

describe("formatTimeRange", () => {
  it("adds the duration", () => {
    expect(formatTimeRange("19:00:00", 1)).toBe("19:00 – 20:00");
    expect(formatTimeRange("19:00:00", 1.5)).toBe("19:00 – 20:30");
  });

  it("wraps past midnight", () => {
    expect(formatTimeRange("23:30:00", 1)).toBe("23:30 – 00:30");
  });

  it("falls back to the start alone when there is no duration", () => {
    expect(formatTimeRange("19:00:00", null)).toBe("19:00");
    expect(formatTimeRange("19:00:00", 0)).toBe("19:00");
  });

  it("is empty when the start is missing", () => {
    expect(formatTimeRange(null, 2)).toBe("");
  });
});
