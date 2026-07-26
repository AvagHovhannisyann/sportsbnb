/**
 * Time-of-day formatting for values that come straight out of Postgres.
 *
 * `games.game_time`, `bookings.booking_time` and `venue_hours.open_time` are
 * all `time` columns, and PostgREST serialises those as `HH:MM:SS`. Nine
 * places in the app printed that string directly, so players saw
 * "19:00:00" on their dashboard, in game details, in the games list and in
 * both admin tables.
 *
 * The tenth place had a local helper that rendered "7:00 PM" instead — which
 * fixed the seconds but disagreed with everything else on screen. The venue
 * page's opening hours, the booking panel's slot buttons and the checkout
 * summary are all 24-hour, which is also the convention in the app's primary
 * market. So this is the 24-hour one, and it is shared.
 */
export const formatTimeOfDay = (value: string | null | undefined): string => {
  if (!value) return "";
  const [h, m] = value.split(":");
  if (h === undefined || m === undefined) return value;
  const hour = Number(h);
  const minute = Number(m);
  // Anything that isn't a time is handed back untouched rather than rendered
  // as "NaN:NaN" — this formats display strings, it does not validate input.
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return value;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
};

/** `19:00:00` + 1.5 → `19:00 – 20:30`. Empty when the start is unusable. */
export const formatTimeRange = (
  start: string | null | undefined,
  durationHours: number | null | undefined,
): string => {
  const from = formatTimeOfDay(start);
  if (!from || !durationHours) return from;
  const [h, m] = from.split(":").map(Number);
  const end = h * 60 + m + Math.round(durationHours * 60);
  const eh = Math.floor(end / 60) % 24;
  const em = end % 60;
  return `${from} – ${String(eh).padStart(2, "0")}:${String(em).padStart(2, "0")}`;
};
