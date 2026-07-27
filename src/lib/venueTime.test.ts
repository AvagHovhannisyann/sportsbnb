import { describe, it, expect } from "vitest";
import { venueLocalToInstant, addHoursToInstant, venueUtcOffset, atVenue } from "./venueTime";

/**
 * The bug these exist for: `ManualBookingDialog` wrote a booking with
 * `venue_uuid`, `starts_at` and `ends_at` all NULL. `get_available_slots`
 * matches on exactly those columns, and so does the `bookings_no_overlap`
 * exclusion constraint — so an owner's walk-in booking was invisible to both.
 * A player could be sold, and could pay for, a court the owner had already
 * given away. Filling those columns in means converting the owner's local
 * wall-clock entry to an instant, and doing that in the browser's own timezone
 * would have been a different wrong answer.
 */
describe("venueLocalToInstant", () => {
  it("reads the time as Yerevan local, not as the runner's zone", () => {
    // Armenia is UTC+4, so 18:00 local is 14:00Z.
    expect(venueLocalToInstant("2026-07-27", "18:00")).toBe("2026-07-27T14:00:00.000Z");
  });

  it("agrees with the database across midnight", () => {
    // 02:00 Yerevan on the 27th is 22:00Z on the 26th — the case where using
    // the browser's zone silently moves the booking to another day.
    expect(venueLocalToInstant("2026-07-27", "02:00")).toBe("2026-07-26T22:00:00.000Z");
  });

  it("handles winter and summer alike, since Armenia has no DST", () => {
    expect(venueLocalToInstant("2026-01-15", "18:00")).toBe("2026-01-15T14:00:00.000Z");
    expect(venueLocalToInstant("2026-07-15", "18:00")).toBe("2026-07-15T14:00:00.000Z");
  });

  it("accepts a seconds-bearing time by ignoring the seconds", () => {
    expect(venueLocalToInstant("2026-07-27", "09:30:00")).toBe("2026-07-27T05:30:00.000Z");
  });

  it("returns null for input it cannot parse, rather than an Invalid Date", () => {
    // A NULL timestamptz is what this whole class of bug is made of. The
    // caller needs something it can check.
    expect(venueLocalToInstant("27/07/2026", "18:00")).toBe(null);
    expect(venueLocalToInstant("2026-07-27", "6pm")).toBe(null);
    expect(venueLocalToInstant("", "")).toBe(null);
  });
});

describe("addHoursToInstant", () => {
  it("adds whole hours", () => {
    expect(addHoursToInstant("2026-07-27T14:00:00.000Z", 2)).toBe("2026-07-27T16:00:00.000Z");
  });

  it("adds fractional hours, which the duration picker offers", () => {
    expect(addHoursToInstant("2026-07-27T14:00:00.000Z", 1.5)).toBe("2026-07-27T15:30:00.000Z");
  });

  it("crosses a day boundary", () => {
    expect(addHoursToInstant("2026-07-27T23:00:00.000Z", 2)).toBe("2026-07-28T01:00:00.000Z");
  });

  it("returns null on unusable input", () => {
    expect(addHoursToInstant("not-a-date", 1)).toBe(null);
    expect(addHoursToInstant("2026-07-27T14:00:00.000Z", Number.NaN)).toBe(null);
  });
});

describe("venueUtcOffset", () => {
  it("reports the venue zone's offset, not the runtime's", () => {
    expect(venueUtcOffset(new Date("2026-07-27T12:00:00Z"))).toBe("+04:00");
    expect(venueUtcOffset(new Date("2026-01-27T12:00:00Z"))).toBe("+04:00");
  });

  it("always returns a well-formed offset", () => {
    for (const iso of ["2026-01-01T00:00:00Z", "2026-06-30T23:59:59Z", "2030-12-25T12:00:00Z"]) {
      expect(venueUtcOffset(new Date(iso))).toMatch(/^[+-]\d{2}:\d{2}$/);
    }
  });
});

describe("atVenue", () => {
  it("reads back the venue's wall clock, not the runtime's", () => {
    const d = atVenue("2026-07-27T14:00:00.000Z"); // 18:00 in Yerevan
    expect(d.getHours()).toBe(18);
    expect(d.getMinutes()).toBe(0);
    expect(d.getDate()).toBe(27);
  });

  it("puts a late-evening slot on the right day", () => {
    // 22:00Z is 02:00 the next day in Yerevan. Formatting the raw instant in a
    // UTC runtime would print the 27th; the venue's calendar says the 28th.
    const d = atVenue("2026-07-27T22:00:00.000Z");
    expect(d.getDate()).toBe(28);
    expect(d.getHours()).toBe(2);
  });

  it("keeps midnight on its own day rather than rolling to hour 24", () => {
    const d = atVenue("2026-07-27T20:00:00.000Z"); // 00:00 on the 28th
    expect(d.getHours()).toBe(0);
    expect(d.getDate()).toBe(28);
  });

  it("round-trips with venueLocalToInstant", () => {
    // The two halves of the same idea: local -> instant -> local.
    const instant = venueLocalToInstant("2026-07-27", "18:00")!;
    const back = atVenue(instant);
    expect(back.getHours()).toBe(18);
    expect(back.getDate()).toBe(27);
  });

  it("accepts a Date as well as a string", () => {
    expect(atVenue(new Date("2026-07-27T14:00:00.000Z")).getHours()).toBe(18);
  });

  it("passes an unusable date straight through rather than inventing one", () => {
    expect(Number.isNaN(atVenue("not-a-date").valueOf())).toBe(true);
  });
});
