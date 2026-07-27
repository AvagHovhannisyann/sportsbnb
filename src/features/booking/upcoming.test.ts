import { describe, it, expect } from "vitest";
import { isUpcoming } from "./upcoming";

const NOW = new Date("2026-07-27T12:00:00Z");

describe("isUpcoming", () => {
  it("counts a future booking as upcoming", () => {
    expect(isUpcoming({ status: "confirmed", starts_at: "2026-07-28T18:00:00Z", booking_date: "2026-07-28" }, NOW)).toBe(true);
  });

  it("counts a past booking as not upcoming", () => {
    expect(isUpcoming({ status: "confirmed", starts_at: "2026-07-26T18:00:00Z", booking_date: "2026-07-26" }, NOW)).toBe(false);
  });

  it("keeps a booking later today in upcoming", () => {
    expect(isUpcoming({ status: "confirmed", starts_at: "2026-07-27T20:00:00Z", booking_date: "2026-07-27" }, NOW)).toBe(true);
  });

  it("keeps a legacy date-only booking for the whole of its day", () => {
    // The trap: `new Date("2026-07-27")` is that day's midnight, so a booking
    // at 8pm today would drop out of "upcoming" at one minute past midnight —
    // the user's evening game vanishing from the list on the morning of it.
    expect(isUpcoming({ status: "confirmed", starts_at: null, booking_date: "2026-07-27" }, NOW)).toBe(true);
    expect(isUpcoming({ status: "confirmed", starts_at: null, booking_date: "2026-07-26" }, NOW)).toBe(false);
  });

  it("prefers starts_at over the legacy date when both are present", () => {
    expect(isUpcoming({ status: "confirmed", starts_at: "2026-07-26T18:00:00Z", booking_date: "2026-07-28" }, NOW)).toBe(false);
  });

  it("treats every settled status as past, whatever its date says", () => {
    const future = { starts_at: "2026-07-28T18:00:00Z", booking_date: "2026-07-28" };
    for (const status of [
      "completed",
      "cancelled",
      "cancelled_by_player",
      "cancelled_by_owner",
      "refunded",
      "expired",
      "no_show",
    ]) {
      expect(isUpcoming({ status, ...future }, NOW)).toBe(false);
    }
  });

  it("keeps a live booking upcoming whatever stage it is at", () => {
    const future = { starts_at: "2026-07-28T18:00:00Z", booking_date: "2026-07-28" };
    for (const status of ["pending", "pending_payment", "confirmed"]) {
      expect(isUpcoming({ status, ...future }, NOW)).toBe(true);
    }
  });

  it("does not hide a booking whose dates are unusable", () => {
    // A row we cannot place in time is one the user still needs to see. Better
    // in the wrong list than in none: this page is the only place their
    // bookings appear at all.
    expect(isUpcoming({ status: "confirmed", starts_at: null, booking_date: "" }, NOW)).toBe(true);
    expect(isUpcoming({ status: "confirmed", starts_at: null, booking_date: "not-a-date" }, NOW)).toBe(true);
  });
});
