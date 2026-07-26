import { skillLevelLabel } from "@/lib/chips";

/**
 * The filters currently narrowing the games list.
 *
 * Same problem Discover had, one page over: Games filters on a text query, a
 * sport, a skill level and a location, and showed only a count — "3" on the
 * Filters button. A count says how many things are hidden without saying what
 * any of them is, and offers no way to drop one.
 *
 * Separate from the venues descriptor on purpose. The two pages filter on
 * different things, and the conditions are where the judgement lives; sharing
 * a descriptor would mean one page carrying the other's special cases. Only
 * the chips themselves are shared.
 */
export type GameFilterKey = "query" | "sport" | "level" | "location";

export interface GameFilter {
  key: GameFilterKey;
  label: string;
}

export interface GameFilterState {
  searchQuery: string;
  selectedSport: string;
  /** "" means unset. Every other value, including "all", is a real level. */
  selectedLevel: string;
  /** True when results are being ordered around the viewer's position. */
  hasLocation: boolean;
}

/**
 * `"all"` **is** a level, and this nearly went the other way.
 *
 * The skill Select offers Beginner / Intermediate / Advanced / All levels, and
 * "All levels" sits last, where a reset normally does. Neither Select offers
 * any other way to clear itself, `hasActiveFilters` counts `"all"` as set, and
 * `useGames` passes it straight into `.eq("skill_level", …)` — so choosing it
 * appears to filter rather than unfilter. That reads like a bug, and I was
 * about to treat it as one.
 *
 * It is not. `skillLevelLabel` renders the stored value `"all"` as
 * "All levels", so a game created as open-to-anyone displays exactly that on
 * its own card. The option matches those games, which is coherent: it is a
 * level like the other three, not a reset. Treating it as unset would have
 * quietly removed the only way to find open games.
 *
 * The real gap is the one the chips close — that there was no way to clear a
 * single filter, only all of them at once.
 */
export const describeActiveGameFilters = ({
  searchQuery,
  selectedSport,
  selectedLevel,
  hasLocation,
}: GameFilterState): GameFilter[] => {
  const out: GameFilter[] = [];

  if (searchQuery.trim()) out.push({ key: "query", label: `“${searchQuery.trim()}”` });
  if (selectedSport) out.push({ key: "sport", label: selectedSport });
  if (selectedLevel) {
    // Rendered through the same helper the game cards use, so a chip and the
    // cards it filtered to never disagree about what the value is called.
    out.push({ key: "level", label: skillLevelLabel(selectedLevel) });
  }
  if (hasLocation) out.push({ key: "location", label: "Near me" });

  return out;
};
