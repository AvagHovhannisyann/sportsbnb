/**
 * Human labels for `ledger_entries.entry_type`.
 *
 * The CHECK constraint allows seven values:
 *
 *   payment_received, owner_earning, platform_commission,
 *   refund, owner_refund_debit, payout, adjustment
 *
 * The owner earnings page had a map covering four of them and fell back to
 * printing the raw column, so a ledger row could read `platform_commission`
 * sitting directly beneath "Booking earning" — the database identifier and its
 * human label side by side in the same table, on the page where an owner reads
 * what they are owed.
 *
 * Kept beside `status.ts`, which exists for the same reason on `bookings`.
 */
export type LedgerEntryType =
  | "payment_received"
  | "owner_earning"
  | "platform_commission"
  | "refund"
  | "owner_refund_debit"
  | "payout"
  | "adjustment";

const LABELS: Record<LedgerEntryType, string> = {
  payment_received: "Payment received",
  owner_earning: "Booking earning",
  // "Commission", not "Platform commission" — it is the owner's statement, and
  // they know whose commission it is.
  platform_commission: "Commission",
  refund: "Refund to customer",
  owner_refund_debit: "Refund reversal",
  payout: "Payout",
  adjustment: "Adjustment",
};

export const ledgerEntryLabel = (entryType: string | null | undefined): string => {
  if (!entryType) return "Entry";
  const known = LABELS[entryType as LedgerEntryType];
  if (known) return known;
  // Still shown, tidied rather than hidden. A money row whose type we cannot
  // name is the one an owner most needs to see.
  return entryType.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());
};

/** The values the CHECK constraint allows, for the test that pins this map. */
export const LEDGER_ENTRY_TYPES: LedgerEntryType[] = [
  "payment_received",
  "owner_earning",
  "platform_commission",
  "refund",
  "owner_refund_debit",
  "payout",
  "adjustment",
];
