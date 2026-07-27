/**
 * Splitting a player's bookings into what is ahead of them and what is behind.
 *
 * Pure and in its own file so it can be tested without the Supabase client,
 * which `useMyBookings` imports and which needs a browser to construct.
 */
export interface BookingWhen {
  status: string;
  starts_at: string | null;
  booking_date: string;
}

/** Statuses whose booking is over, one way or another. */
const SETTLED = new Set([
  "completed",
  "cancelled",
  "cancelled_by_player",
  "cancelled_by_owner",
  "refunded",
  "expired",
  "no_show",
]);

/** Is this booking still ahead of the person who made it? */
export function isUpcoming(booking: BookingWhen, now: Date): boolean {
  if (SETTLED.has(booking.status)) return false;
  // `starts_at` is the Phase 2 column and the one to trust. `booking_date` is
  // the legacy TEXT date kept for rows written before it existed; treating a
  // date-only value as the end of that day rather than its midnight stops a
  // booking disappearing from "upcoming" on the morning of the day it happens.
  if (booking.starts_at) return new Date(booking.starts_at) >= now;
  if (!booking.booking_date) return true;
  const endOfDay = new Date(`${booking.booking_date}T23:59:59`);
  return Number.isNaN(endOfDay.valueOf()) ? true : endOfDay >= now;
}
