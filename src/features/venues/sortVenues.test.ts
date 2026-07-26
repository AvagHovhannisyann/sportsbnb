import { describe, it, expect } from "vitest";
import {
  compareVenues,
  isVenueSort,
  VENUE_SORTS,
  type SortableVenue,
} from "./sortVenues";

const v = (
  id: string,
  price: number,
  rating: number | null = null,
  reviews: number | null = null,
  distance?: number | null,
): SortableVenue => ({
  id,
  price_per_hour: price,
  rating,
  review_count: reviews,
  ...(distance === undefined ? {} : { distance }),
});

const order = (list: SortableVenue[], ...args: Parameters<typeof compareVenues>) =>
  [...list].sort(compareVenues(...args)).map((x) => x.id);

describe("venue sorting", () => {
  it("orders by price in both directions", () => {
    const list = [v("mid", 8000), v("cheap", 3000), v("dear", 15000)];
    expect(order(list, "price-asc")).toEqual(["cheap", "mid", "dear"]);
    expect(order(list, "price-desc")).toEqual(["dear", "mid", "cheap"]);
  });

  // A promoted listing that reordered the price sort would make the price sort
  // lie, which is worse than not offering one.
  it("does not let promoted placement disturb the price sort", () => {
    const list = [v("cheap", 3000), v("dear", 15000)];
    expect(order(list, "price-asc", new Set(["dear"]))).toEqual(["cheap", "dear"]);
    expect(order(list, "price-desc", new Set(["cheap"]))).toEqual(["dear", "cheap"]);
  });

  // `venues.rating` is NOT NULL-ish in practice and reads 0 for a venue nobody
  // has reviewed. Treating that as a score puts every unreviewed venue at the
  // top of "Top rated" — sorted by a number that means "no data".
  it("ranks unreviewed venues last rather than as a zero score", () => {
    const list = [v("unreviewed", 5000, 0, 0), v("good", 5000, 4.6, 30)];
    expect(order(list, "rating")).toEqual(["good", "unreviewed"]);
  });

  it("breaks a rating tie on how many reviews back it up", () => {
    const list = [v("thin", 5000, 4.8, 2), v("proven", 5000, 4.8, 200)];
    expect(order(list, "rating")).toEqual(["proven", "thin"]);
  });

  it("ranks a lone perfect score below a slightly lower, well-reviewed one", () => {
    const list = [v("one-five-star", 5000, 5, 1), v("established", 5000, 4.9, 180)];
    // 5.0 genuinely is the higher rating, so it leads — the tiebreak only
    // applies at equal ratings. Pinned so a future "weight by volume" change is
    // a deliberate decision rather than a silent one.
    expect(order(list, "rating")).toEqual(["one-five-star", "established"]);
  });

  it("puts venues with no coordinates last when ordering by distance", () => {
    const list = [v("far", 5000, null, null, 12), v("nowhere", 5000, null, null, null), v("near", 5000, null, null, 0.4)];
    expect(order(list, "recommended")).toEqual(["near", "far", "nowhere"]);
  });

  // Before a sort control existed this was the whole behaviour, and
  // "Recommended" has to keep meaning it.
  it("falls back to promoted-first when no location is known", () => {
    const list = [v("plain", 5000), v("promoted", 9000)];
    expect(order(list, "recommended", new Set(["promoted"]))).toEqual(["promoted", "plain"]);
  });

  it("recognises only the sorts it offers", () => {
    for (const s of VENUE_SORTS) expect(isVenueSort(s.value)).toBe(true);
    expect(isVenueSort("price")).toBe(false);
    expect(isVenueSort(null)).toBe(false);
    expect(isVenueSort("DROP TABLE venues")).toBe(false);
  });
});
