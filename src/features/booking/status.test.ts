import { describe, expect, it } from "vitest";
import { bookingStatusDescriptor } from "./status";

describe("bookingStatusDescriptor", () => {
  it("names the statuses in-app payment added, which used to render raw", () => {
    expect(bookingStatusDescriptor("pending_payment").label).toBe("Awaiting payment");
    expect(bookingStatusDescriptor("expired").label).toBe("Expired unpaid");
    expect(bookingStatusDescriptor("refunded").label).toBe("Refunded");
  });

  it("says who cancelled, because an owner acts differently on each", () => {
    expect(bookingStatusDescriptor("cancelled_by_player").label).toBe("Cancelled by player");
    expect(bookingStatusDescriptor("cancelled_by_owner").label).toBe("Cancelled by you");
  });

  it("keeps the legacy four working", () => {
    expect(bookingStatusDescriptor("confirmed")).toEqual({ label: "Confirmed", tone: "positive" });
    expect(bookingStatusDescriptor("pending").tone).toBe("warning");
    expect(bookingStatusDescriptor("cancelled").tone).toBe("danger");
    expect(bookingStatusDescriptor("completed").tone).toBe("neutral");
  });

  it("covers every status the CHECK constraint allows", () => {
    // Mirrors bookings_status_check. If a migration widens the constraint,
    // this fails and someone has to decide what the new state is called.
    const allowed = [
      "pending", "confirmed", "completed", "cancelled",
      "pending_payment", "cancelled_by_player", "cancelled_by_owner",
      "refunded", "expired", "no_show",
    ];
    for (const status of allowed) {
      const { label } = bookingStatusDescriptor(status);
      expect(label).not.toContain("_");
      expect(label[0]).toBe(label[0].toUpperCase());
    }
  });

  it("tidies an unknown status rather than hiding the row", () => {
    // A booking whose state we cannot name is the one an owner most needs to
    // see, so it is shown — just not as a database identifier.
    expect(bookingStatusDescriptor("held_by_bank").label).toBe("Held by bank");
    expect(bookingStatusDescriptor("held_by_bank").tone).toBe("neutral");
  });

  it("handles null and undefined", () => {
    expect(bookingStatusDescriptor(null).label).toBe("Unknown");
    expect(bookingStatusDescriptor(undefined).label).toBe("Unknown");
  });
});
