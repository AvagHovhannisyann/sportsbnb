/**
 * Refund entitlement engine. Works off the cancellation_policy snapshot taken
 * at booking time (never the venue's current policy).
 *
 * Snapshot shape: { cancellation_policy: 'flexible'|'moderate'|'strict',
 *                   cancellation_hours: number, refund_type: 'full'|'partial'|'none' }
 */

export interface PolicySnapshot {
  cancellation_policy?: string;
  cancellation_hours?: number;
  refund_type?: string;
}

/**
 * Returns the refundable fraction (0..1) of the customer total for a
 * player-initiated cancellation at `cancelAt` for a booking starting `startsAt`.
 * Owner-initiated cancellations always refund 100%.
 */
export function refundFraction(
  policy: PolicySnapshot | null | undefined,
  startsAt: Date,
  cancelAt: Date,
  cancelledBy: "player" | "owner",
): number {
  if (cancelledBy === "owner") return 1;

  const hoursUntilStart = (startsAt.getTime() - cancelAt.getTime()) / 3_600_000;
  if (hoursUntilStart <= 0) return 0;

  const cutoff = policy?.cancellation_hours ?? 24;
  const refundType = policy?.refund_type ?? "full";

  if (refundType === "none") return 0;

  if (hoursUntilStart >= cutoff) {
    return 1;
  }
  // Inside the cutoff window
  if (refundType === "partial") return 0.5;
  // 'full' policies refund nothing once inside the cutoff
  return 0;
}

export function refundAmountMinor(
  amountMinor: number,
  policy: PolicySnapshot | null | undefined,
  startsAt: Date,
  cancelAt: Date,
  cancelledBy: "player" | "owner",
): number {
  return Math.round(amountMinor * refundFraction(policy, startsAt, cancelAt, cancelledBy));
}
