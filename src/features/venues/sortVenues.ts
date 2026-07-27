/**
 * Ordering for the venues grid.
 *
 * `/venues` could filter by sport, city and price, and could not order the
 * results at all — on a booking marketplace, where "cheapest first" and "best
 * rated" are the two things people reach for immediately after searching. The
 * results header was even `flex justify-between` with a single child, so the
 * row this belongs in was already half empty.
 *
 * The comparators live here rather than inside the page because they carry the
 * decisions worth testing: what happens to a venue nobody has reviewed, and
 * what happens to one with no coordinates when the list is ordered by distance.
 */

export type VenueSort = "recommended" | "price-asc" | "price-desc" | "rating";

export const VENUE_SORTS: { value: VenueSort; label: string }[] = [
  { value: "recommended", label: "Recommended" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
  { value: "rating", label: "Top rated" },
];

export const DEFAULT_VENUE_SORT: VenueSort = "recommended";

export const isVenueSort = (value: string | null): value is VenueSort =>
  VENUE_SORTS.some((s) => s.value === value);

/** Only the fields the ordering actually reads. */
export interface SortableVenue {
  id: string;
  price_per_hour: number;
  rating: number | null;
  review_count: number | null;
  /** Set by the page when a location is known; null when the venue has no coordinates. */
  distance?: number | null;
}

/**
 * A venue with no coordinates has no distance, and a venue nobody has reviewed
 * has no rating. Both are *absent*, not zero — sorting them as zero puts the
 * unreviewed venues at the top of "Top rated" and the unmappable ones at the
 * top of a distance list, which is the opposite of what either word means.
 */
const missingLast = (a: number | null | undefined, b: number | null | undefined) => {
  const aMissing = a === null || a === undefined;
  const bMissing = b === null || b === undefined;
  if (aMissing && bMissing) return 0;
  if (aMissing) return 1;
  if (bMissing) return -1;
  return null;
};

/**
 * `promotedIds` only affects "Recommended". A paid placement that reordered
 * "Price: low to high" would make the price sort lie, which is worse than not
 * having the sort.
 */
export const compareVenues =
  (sort: VenueSort, promotedIds: Set<string> = new Set()) =>
  (a: SortableVenue, b: SortableVenue): number => {
    switch (sort) {
      case "price-asc":
        return a.price_per_hour - b.price_per_hour;

      case "price-desc":
        return b.price_per_hour - a.price_per_hour;

      case "rating": {
        // An unreviewed venue has no rating to stand on, whatever the column
        // says. Rank on the rating, then on how many reviews back it up, so a
        // lone 5.0 does not outrank a 4.8 with two hundred.
        const aRated = (a.review_count ?? 0) > 0 ? a.rating : null;
        const bRated = (b.review_count ?? 0) > 0 ? b.rating : null;
        const missing = missingLast(aRated, bRated);
        if (missing !== null) return missing;
        if (bRated !== aRated) return (bRated as number) - (aRated as number);
        return (b.review_count ?? 0) - (a.review_count ?? 0);
      }

      case "recommended":
      default: {
        // Distance when the page knows where the viewer is — that was already
        // the behaviour before a sort control existed, and it is what
        // "recommended" should keep meaning. Promoted placement only breaks
        // ties when there is no location to sort by.
        const located = a.distance !== undefined || b.distance !== undefined;
        if (located) {
          const missing = missingLast(a.distance, b.distance);
          if (missing !== null) return missing;
          return (a.distance as number) - (b.distance as number);
        }
        return (promotedIds.has(b.id) ? 1 : 0) - (promotedIds.has(a.id) ? 1 : 0);
      }
    }
  };
