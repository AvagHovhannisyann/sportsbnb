import type { Venue } from "@/hooks/useVenues";

/**
 * Listing-health scoring.
 *
 * Lives in its own module rather than beside the component: it is pure logic,
 * it is unit-tested directly, and exporting a non-component from a component
 * file breaks React Fast Refresh (react-refresh/only-export-components).
 */
export interface VenueScore {
  id: string;
  name: string;
  score: number;
  issues: Array<{ label: string; fixHref?: string }>;
}

export function scoreVenue(v: Venue, responseRate: number): VenueScore {
  const issues: VenueScore["issues"] = [];

  // Scored as earned-out-of-possible rather than a running total out of a
  // fixed 100. A category whose underlying data the platform does not
  // maintain is excluded from the denominator instead of silently costing the
  // owner points they have no way to win — see the reputation block below.
  let earned = 0;
  let possible = 0;
  const award = (points: number, ok: boolean, issue?: string, partial = 0) => {
    possible += points;
    if (ok) earned += points;
    else {
      earned += partial;
      if (issue) issues.push({ label: issue });
    }
  };

  // Photo (25)
  award(25, Boolean(v.image_url), "Add a cover photo");

  // Description (15)
  const descLen = (v.description ?? "").trim().length;
  award(
    15,
    descLen >= 80,
    descLen > 0 ? "Expand your description (80+ chars)" : "Add a description",
    descLen > 0 ? 7 : 0,
  );

  // Location confirmed (10)
  award(10, Boolean(v.location_confirmed), "Confirm exact location on map");

  // Visible to players (10). This replaces a rule that awarded points for
  // enabling WhatsApp or phone contact and, when unset, told the owner to
  // "Enable WhatsApp or phone contact". Players book and pay in the app now;
  // the WhatsApp handoff was removed in Phase 2 and booking_intents is
  // read-only history. Coaching owners back toward it worked against the
  // product. Whether the listing is actually live is the equivalent
  // make-or-break for getting booked.
  award(10, v.is_active !== false, "Listing is hidden — make it active to take bookings");

  // Sports (5)
  award(5, (v.sports?.length ?? 0) > 0, "List supported sports");

  // Amenities (5)
  const amenities = v.amenities?.length ?? 0;
  award(5, amenities >= 3, "Add at least 3 amenities", amenities > 0 ? 2 : 0);

  // Reputation (15) — only when there is reputation data to judge.
  // venues.review_count has no writer anywhere in the codebase; it is
  // DEFAULT 0 and stays 0 however many reviews a venue actually collects. As
  // a scored category it docked every owner 15 points permanently and told
  // them "No reviews yet" regardless of the truth. Excluded from the
  // denominator until something maintains the column.
  if (v.review_count > 0) {
    award(15, v.review_count >= 5, "Get more reviews (5+ unlocks full credit)", 8);
  }

  // Response rate (15) — owner-wide signal, always meaningful.
  const rr = Math.max(0, Math.min(100, responseRate));
  possible += 15;
  earned += Math.round(rr * 0.15);
  if (rr < 70) issues.push({ label: `Reply faster — ${rr}% response rate` });

  const score = possible === 0 ? 0 : Math.round((earned / possible) * 100);
  return { id: v.id, name: v.name, score: Math.min(100, score), issues };
}
