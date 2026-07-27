import { describe, expect, it } from "vitest";
import { ledgerEntryLabel, LEDGER_ENTRY_TYPES } from "./ledger";

describe("ledgerEntryLabel", () => {
  it("names the three types that used to print raw", () => {
    // The map covered four of seven, so these fell through to the column value
    // and appeared as database identifiers on the owner's earnings ledger.
    expect(ledgerEntryLabel("platform_commission")).toBe("Commission");
    expect(ledgerEntryLabel("payment_received")).toBe("Payment received");
    expect(ledgerEntryLabel("refund")).toBe("Refund to customer");
  });

  it("keeps the four that already worked", () => {
    expect(ledgerEntryLabel("owner_earning")).toBe("Booking earning");
    expect(ledgerEntryLabel("owner_refund_debit")).toBe("Refund reversal");
    expect(ledgerEntryLabel("payout")).toBe("Payout");
    expect(ledgerEntryLabel("adjustment")).toBe("Adjustment");
  });

  it("covers every type the CHECK constraint allows", () => {
    // Mirrors ledger_entries_entry_type_check. If a migration widens it, this
    // fails and someone has to decide what the new entry is called rather than
    // shipping a raw identifier onto a money page.
    for (const t of LEDGER_ENTRY_TYPES) {
      const label = ledgerEntryLabel(t);
      expect(label).not.toContain("_");
      expect(label[0]).toBe(label[0].toUpperCase());
    }
  });

  it("tidies an unknown type rather than hiding the row", () => {
    expect(ledgerEntryLabel("chargeback_hold")).toBe("Chargeback hold");
  });

  it("handles null and undefined", () => {
    expect(ledgerEntryLabel(null)).toBe("Entry");
    expect(ledgerEntryLabel(undefined)).toBe("Entry");
  });
});
