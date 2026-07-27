/**
 * Human labels and tone for `payouts.status`.
 *
 * The CHECK constraint allows four values:
 *
 *   pending, processing, paid, failed
 *
 * The earnings page rendered the column directly — `<Badge>{payout.status}</Badge>` —
 * so an owner's payout history read "pending", lowercase, in the same table as
 * the money it refers to. It also styled every non-`paid` status identically,
 * which put `failed` and `pending` in the same grey: a payout that did not
 * arrive looked exactly like one that has not been sent yet.
 *
 * Third table on this branch to need this, after `bookings.status`
 * (`status.ts`) and `ledger_entries.entry_type` (`ledger.ts`). Same shape as
 * both, including the test that fails when a migration widens the constraint.
 */
export type PayoutStatus = "pending" | "processing" | "paid" | "failed";

export type PayoutTone = "positive" | "warning" | "danger" | "neutral";

export interface PayoutDescriptor {
  label: string;
  tone: PayoutTone;
  /** What the owner should understand is happening to their money. */
  hint: string;
}

const DESCRIPTORS: Record<PayoutStatus, PayoutDescriptor> = {
  pending: {
    label: "Scheduled",
    tone: "neutral",
    hint: "Queued for the next payout run.",
  },
  processing: {
    label: "On its way",
    tone: "warning",
    hint: "Sent to the bank; usually arrives within a few working days.",
  },
  paid: {
    label: "Paid",
    tone: "positive",
    hint: "Transferred to your account.",
  },
  failed: {
    label: "Failed",
    tone: "danger",
    hint: "The transfer did not go through. Check your payout details.",
  },
};

export const payoutStatusDescriptor = (status: string | null | undefined): PayoutDescriptor => {
  if (!status) return { label: "Unknown", tone: "neutral", hint: "" };
  const known = DESCRIPTORS[status as PayoutStatus];
  if (known) return known;
  // Shown, tidied, and marked neutral rather than hidden. A payout whose state
  // we cannot name is the one an owner most needs to see.
  return {
    label: status.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase()),
    tone: "neutral",
    hint: "",
  };
};

/** The values the CHECK constraint allows, for the test that pins this map. */
export const PAYOUT_STATUSES: PayoutStatus[] = ["pending", "processing", "paid", "failed"];
