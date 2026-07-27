/**
 * Turning a venue's local wall-clock time into the instant the database stores.
 *
 * Everything time-shaped in the booking schema is `timestamptz`, and both RPCs
 * that write or read it pin the same zone. `create_booking_hold` derives the
 * displayed date and time with `p_starts_at AT TIME ZONE 'Asia/Yerevan'`;
 * `get_available_slots` builds its hour grid as
 * `(p_date::timestamp + open_time) AT TIME ZONE 'Asia/Yerevan'`. So "18:00 on
 * Saturday" means 18:00 in Yerevan, not 18:00 wherever the person entering it
 * happens to be sitting.
 *
 * That distinction is the whole reason this exists. `new Date("2026-07-27T18:00")`
 * resolves in the *browser's* zone, so an owner adding a walk-in booking from
 * abroad — or with a laptop still set to the last place they travelled — would
 * write an instant hours away from the slot they meant, and it would collide
 * with, or fail to collide with, entirely the wrong hour.
 *
 * The offset is looked up rather than hardcoded. Armenia has had no daylight
 * saving since 2012, so `+04:00` is correct today and writing it as a literal
 * would be shorter — but a zone rule that changes is exactly the kind of thing
 * that gets noticed a year late, and `Intl` already knows.
 */
export const VENUE_TIME_ZONE = "Asia/Yerevan";

/**
 * The venue zone's UTC offset at a given instant, as `+04:00`.
 *
 * Uses `longOffset`, which yields "GMT+04:00". Falls back to computing the
 * offset from a formatted round-trip if the runtime does not support it, so a
 * missing `Intl` feature degrades to a correct answer rather than a wrong one.
 */
export function venueUtcOffset(at: Date): string {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: VENUE_TIME_ZONE,
      timeZoneName: "longOffset",
    }).formatToParts(at);
    const name = parts.find((p) => p.type === "timeZoneName")?.value ?? "";
    const match = name.match(/GMT([+-]\d{2}:\d{2})/);
    if (match) return match[1];
    // "GMT" with no offset means UTC.
    if (name === "GMT") return "+00:00";
  } catch {
    // fall through
  }
  return offsetFromRoundTrip(at);
}

/** Offset via `en-CA` parts, for runtimes without `longOffset`. */
function offsetFromRoundTrip(at: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: VENUE_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(at);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? "0");
  const asUtc = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour") % 24,
    get("minute"),
    get("second"),
  );
  const minutes = Math.round((asUtc - Math.floor(at.getTime() / 1000) * 1000) / 60000);
  const sign = minutes < 0 ? "-" : "+";
  const abs = Math.abs(minutes);
  return `${sign}${String(Math.floor(abs / 60)).padStart(2, "0")}:${String(abs % 60).padStart(2, "0")}`;
}

/**
 * `2026-07-27` + `18:00` in the venue's zone → an ISO instant.
 *
 * Returns null rather than an Invalid Date for input it cannot parse, so a
 * caller has something to check instead of writing `null` into a timestamptz
 * column and discovering it later.
 */
export function venueLocalToInstant(date: string, time: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const hhmm = time.match(/^(\d{2}):(\d{2})/);
  if (!hhmm) return null;

  // Anchor the offset lookup on the date in question — midday, so a zone change
  // at midnight cannot pick the neighbouring day's rule.
  const anchor = new Date(`${date}T12:00:00Z`);
  if (Number.isNaN(anchor.valueOf())) return null;

  const iso = `${date}T${hhmm[1]}:${hhmm[2]}:00${venueUtcOffset(anchor)}`;
  const parsed = new Date(iso);
  return Number.isNaN(parsed.valueOf()) ? null : parsed.toISOString();
}

/** The same, plus a whole or fractional number of hours. */
export function addHoursToInstant(instant: string, hours: number): string | null {
  const start = new Date(instant);
  if (Number.isNaN(start.valueOf()) || !Number.isFinite(hours)) return null;
  return new Date(start.getTime() + hours * 3600_000).toISOString();
}
