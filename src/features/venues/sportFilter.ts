import { sportTypes } from "@/data/constants";

/**
 * Resolve a sport from a URL parameter to the exact string venues are tagged
 * with — or to nothing.
 *
 * Venues store sports as an array of the `sportTypes` strings verbatim, and
 * Discover filters with `venue.sports.includes(selectedSport)`: an exact,
 * case-sensitive membership test. Five of the six places that offer a sport
 * picker pass those strings through untouched. The hero bar on the home page
 * lower-cased them, so its Search button sent `?sport=football`, which matched
 * no venue and reported "0 venues" for a catalogue where three matched. The
 * same screen's category tiles sent `?sport=Football` and worked, so the two
 * entry points a metre apart disagreed.
 *
 * The lower-casing is fixed at the source, but links carrying it have been
 * shipping for as long as the hero bar has, and they are in people's history
 * and in whatever they pasted to a friend. So the reader canonicalises too.
 *
 * An unrecognised sport resolves to "" — no filter — rather than to itself.
 * That is the deliberate half of this. Keeping the raw value would filter the
 * page down to nothing *and* blank the picker: a controlled Radix `Select`
 * whose value matches no item renders neither the value nor its placeholder,
 * so the control shows an empty box and the user cannot see, let alone clear,
 * the filter emptying their results. Dropping the filter instead means the
 * state is always either "" or an exact member of `sportTypes`, which is the
 * invariant that makes that blank state unreachable.
 */
export function canonicalSport(raw: string | null | undefined): string {
  if (!raw) return "";
  const needle = raw.trim().toLowerCase();
  return sportTypes.find((sport) => sport.toLowerCase() === needle) ?? "";
}
