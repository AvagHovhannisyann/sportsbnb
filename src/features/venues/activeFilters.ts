import { formatPrice } from "@/lib/pricing";

/**
 * The filters currently narrowing the venues grid, named so they can be shown
 * and removed one at a time.
 *
 * Discover applies five of them — a text query, a sport, a city, a price
 * ceiling and a location — and, until now, showed none of them. Desktop had a
 * single "Clear" that dropped all five at once; mobile had a badge on the
 * Filters button reading `!`, which says *that* something is filtering without
 * saying what. So a grid narrowed to two results looked the same as an empty
 * catalogue, and the only way to see why was to reopen the sheet.
 *
 * That matters more on this page than tidiness would suggest. The price
 * ceiling is seeded from the catalogue and the city is auto-filled from the
 * viewer's profile, so a first-time visitor can arrive at a filtered grid they
 * never asked for — and this app has already shipped one bug of exactly that
 * shape, where an untouched ceiling silently excluded the dearest venues.
 *
 * Kept as a pure descriptor rather than JSX so the wording and the conditions
 * can be tested without rendering anything. `key` is what the page dispatches
 * on to clear a single filter.
 */
export type FilterKey = "query" | "sport" | "city" | "price" | "location";

export interface ActiveFilter {
  key: FilterKey;
  /** Shown in the chip. Carries the value, not just the field name. */
  label: string;
}

export interface FilterState {
  searchQuery: string;
  selectedSport: string;
  selectedCity: string;
  /** The chosen ceiling, and the highest price in the catalogue. */
  priceCeiling: number;
  maxPrice: number;
  /** True once the viewer moved the slider, or arrived with one set. */
  priceTouched: boolean;
  /** A place the results are being filtered around, if any. */
  locationLabel: string | null;
}

export const describeActiveFilters = ({
  searchQuery,
  selectedSport,
  selectedCity,
  priceCeiling,
  maxPrice,
  priceTouched,
  locationLabel,
}: FilterState): ActiveFilter[] => {
  const out: ActiveFilter[] = [];

  if (searchQuery.trim()) out.push({ key: "query", label: `“${searchQuery.trim()}”` });
  if (selectedSport) out.push({ key: "sport", label: selectedSport });
  if (selectedCity) out.push({ key: "city", label: selectedCity });

  // Only when the viewer set it *and* it actually excludes something. An
  // untouched ceiling tracks the catalogue's own maximum, so showing it would
  // put a chip on every visit that removes nothing when clicked.
  if (priceTouched && priceCeiling < maxPrice) {
    out.push({ key: "price", label: `Under ${formatPrice(priceCeiling)}` });
  }

  if (locationLabel) out.push({ key: "location", label: locationLabel });

  return out;
};
