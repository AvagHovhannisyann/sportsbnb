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

/**
 * Two statuses name a person, and the table is written from the owner's side.
 * That was fine while the owner's screens were the only ones using it; it is
 * not fine on a player's bookings page, where "Cancelled by you" would blame
 * them for the venue calling their booking off, nor in the admin console,
 * where it has been telling an operator they cancelled something they have
 * never touched.
 */
describe("bookingStatusDescriptor, by viewer", () => {
  it("defaults to the owner's reading, so existing callers are unchanged", () => {
    expect(bookingStatusDescriptor("cancelled_by_owner").label).toBe("Cancelled by you");
    expect(bookingStatusDescriptor("cancelled_by_player").label).toBe("Cancelled by player");
  });

  it("flips 'you' for the player", () => {
    expect(bookingStatusDescriptor("cancelled_by_player", "player").label).toBe("Cancelled by you");
    expect(bookingStatusDescriptor("cancelled_by_owner", "player").label).toBe("Cancelled by venue");
  });

  it("names neither party 'you' for an admin, who is neither", () => {
    expect(bookingStatusDescriptor("cancelled_by_owner", "admin").label).toBe("Cancelled by owner");
    expect(bookingStatusDescriptor("cancelled_by_player", "admin").label).toBe("Cancelled by player");
  });

  it("never says 'you' to someone the status is not about", () => {
    // The invariant: exactly one party per status may be addressed as "you",
    // and only on their own surface.
    for (const viewer of ["owner", "player", "admin"] as const) {
      const owned = bookingStatusDescriptor("cancelled_by_owner", viewer).label;
      const played = bookingStatusDescriptor("cancelled_by_player", viewer).label;
      expect(/\byou\b/i.test(owned)).toBe(viewer === "owner");
      expect(/\byou\b/i.test(played)).toBe(viewer === "player");
    }
  });

  it("leaves tone alone — who cancelled does not change how bad it is", () => {
    for (const viewer of ["owner", "player", "admin"] as const) {
      expect(bookingStatusDescriptor("cancelled_by_owner", viewer).tone).toBe("danger");
      expect(bookingStatusDescriptor("cancelled_by_player", viewer).tone).toBe("danger");
    }
  });

  it("ignores the viewer for statuses that name nobody", () => {
    for (const viewer of ["owner", "player", "admin"] as const) {
      expect(bookingStatusDescriptor("confirmed", viewer).label).toBe("Confirmed");
      expect(bookingStatusDescriptor("expired", viewer).label).toBe("Expired unpaid");
      expect(bookingStatusDescriptor("held_by_bank", viewer).label).toBe("Held by bank");
    }
  });
});
