/** The fields Discover's free-text search looks at. Structural on purpose. */
export interface SearchableVenue {
  name: string;
  address?: string | null;
  city?: string | null;
}

/**
 * Does a venue match what the user typed?
 *
 * The predicate this replaces read:
 *
 *     const location = venue.address || venue.city;
 *     name.includes(q) || location.includes(q)
 *
 * `||` there is a fallback where the intent was a union, and the two are only
 * the same for venues with no street address. Every venue that has one — which
 * is every venue anyone bothered to fill in properly — became unsearchable by
 * the city it is in. "Yerevan" matched nothing in a catalogue of Yerevan
 * venues, because each one's `location` had already resolved to its street.
 *
 * It stayed hidden because the only way to reach this filter was Discover's
 * own search box, next to a City dropdown that does the job properly. Now that
 * the home page's Location field feeds it, typing a city is the obvious thing
 * to do and the wrong answer is the first thing a new user would see.
 */
export function matchesVenueQuery(venue: SearchableVenue, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return [venue.name, venue.address, venue.city].some((field) =>
    field?.toLowerCase().includes(needle)
  );
}
