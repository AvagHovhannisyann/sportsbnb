/**
 * Human labels and tone for `bookings.status`.
 *
 * The status set is the one the Phase 2 CHECK constraint allows. Before this,
 * every surface printed the raw column: an owner's overview showed a booking
 * as `pending_payment`, and the bookings page's colour map only knew the four
 * legacy values, so the six added with in-app payment fell through to grey and
 * their database identifier. `cancelled_by_player` is not a sentence.
 *
 * Tone is deliberately not a Tailwind class — callers map it to whatever they
 * already use, so this file has no opinion about a Badge API.
 */
export type BookingStatus =
  | "pending"
  | "confirmed"
  | "completed"
  | "cancelled"
  | "pending_payment"
  | "cancelled_by_player"
  | "cancelled_by_owner"
  | "refunded"
  | "expired"
  | "no_show";

export type BookingStatusTone = "positive" | "warning" | "danger" | "neutral";

const DESCRIPTORS: Record<BookingStatus, { label: string; tone: BookingStatusTone }> = {
  confirmed: { label: "Confirmed", tone: "positive" },
  completed: { label: "Completed", tone: "neutral" },
  pending: { label: "Pending", tone: "warning" },
  pending_payment: { label: "Awaiting payment", tone: "warning" },
  cancelled: { label: "Cancelled", tone: "danger" },
  // Who cancelled matters to an owner deciding whether to follow up.
  cancelled_by_player: { label: "Cancelled by player", tone: "danger" },
  cancelled_by_owner: { label: "Cancelled by you", tone: "danger" },
  refunded: { label: "Refunded", tone: "neutral" },
  expired: { label: "Expired unpaid", tone: "neutral" },
  no_show: { label: "No-show", tone: "danger" },
};

export const bookingStatusDescriptor = (
  status: string | null | undefined,
): { label: string; tone: BookingStatusTone } => {
  if (!status) return { label: "Unknown", tone: "neutral" };
  const known = DESCRIPTORS[status as BookingStatus];
  if (known) return known;
  // An unrecognised status is still shown, tidied rather than hidden — a row
  // whose state we cannot name is exactly the row an owner needs to see.
  return {
    label: status.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase()),
    tone: "neutral",
  };
};
