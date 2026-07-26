import { describe, expect, it } from "vitest";
import { PAYOUT_STATUSES, payoutStatusDescriptor } from "./payout";

describe("payoutStatusDescriptor", () => {
  it.each(PAYOUT_STATUSES)("names %s without leaking the column value", (status) => {
    const d = payoutStatusDescriptor(status);
    expect(d.label).not.toBe(status);
    expect(d.label[0]).toBe(d.label[0].toUpperCase());
    expect(d.hint).not.toBe("");
  });

  it("does not put a failed payout in the same tone as a scheduled one", () => {
    // The page styled every non-`paid` status identically, so a transfer that
    // bounced looked like one that simply had not been sent.
    expect(payoutStatusDescriptor("failed").tone).toBe("danger");
    expect(payoutStatusDescriptor("pending").tone).toBe("neutral");
    expect(payoutStatusDescriptor("processing").tone).toBe("warning");
    expect(payoutStatusDescriptor("paid").tone).toBe("positive");
  });

  it("gives every allowed status a distinct label", () => {
    const labels = PAYOUT_STATUSES.map((s) => payoutStatusDescriptor(s).label);
    expect(new Set(labels).size).toBe(PAYOUT_STATUSES.length);
  });

  it("tidies a value the constraint gains later rather than hiding it", () => {
    // If a migration adds a status, this map goes stale. It must still render
    // something an owner can read — and the previous assertion is what fails
    // loudly enough to prompt updating it.
    expect(payoutStatusDescriptor("awaiting_review").label).toBe("Awaiting review");
    expect(payoutStatusDescriptor("awaiting_review").tone).toBe("neutral");
  });

  it("handles a missing status", () => {
    expect(payoutStatusDescriptor(null).label).toBe("Unknown");
    expect(payoutStatusDescriptor(undefined).label).toBe("Unknown");
  });
});
