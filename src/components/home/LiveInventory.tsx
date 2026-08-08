import { Link } from "react-router-dom";
import { ArrowRight, Star } from "lucide-react";

import { Price } from "@/components/ui/price";
import { Skeleton } from "@/components/ui/skeleton";
import { useVenues } from "@/hooks/useVenues";

/**
 * The hero's right column: the actual catalogue, not a photograph of one.
 *
 * The page this replaces put a stock shot of a floodlit pitch here and made
 * its case in adjectives — "Every venue verified", "Confirmed in seconds".
 * Both are claims, and a claim is the weakest thing a marketplace can lead
 * with, because every marketplace makes the same one. What this product
 * actually has that a template does not is inventory: real venues, in real
 * Armenian cities, at real prices in dram. Showing three of them, with the
 * count of the rest, is a stronger argument than any sentence about them —
 * and it is checkable, which the sentence is not.
 *
 * It is also the shortest path to a booking. The old hero's two buttons both
 * led to a list; these rows lead to a specific venue someone already decided
 * they liked.
 *
 * Three states, all deliberate:
 *
 *  - loading: skeleton rows at the real row height. The panel is above the
 *    fold on every visit, so reserving the space is what stops the headline
 *    jumping when the query lands.
 *  - empty or failed: renders nothing, and HomePage falls back to the photo.
 *    An empty panel in the hero would say "this marketplace has nothing in
 *    it", which is worse than the stock image it replaced.
 *  - loaded: up to three venues, cheapest first, so the number a first-time
 *    visitor sees is the friendliest one that is still true.
 */

/** How many rows the panel shows. Three fills the hero without scrolling. */
const ROWS = 3;

export function LiveInventory() {
  const { data: venues, isLoading } = useVenues();

  if (isLoading) {
    return (
      <div
        className="overflow-hidden rounded-2xl border border-border bg-card"
        role="status"
        aria-label="Loading venues"
      >
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <Skeleton className="h-3.5 w-28" />
          <Skeleton className="h-3.5 w-16" />
        </div>
        {/* Same box as a loaded row — min-h-[4.5rem], px-4, py-3.5 — so the
            swap from skeleton to content moves nothing. Matching only the
            approximate height still shifts the page by a few pixels, which is
            the thing reserving space was meant to prevent. */}
        {Array.from({ length: ROWS }).map((_, i) => (
          <div
            key={i}
            className="flex min-h-[4.5rem] items-center gap-4 border-t border-border px-4 py-3.5"
          >
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="h-5 w-20" />
          </div>
        ))}
      </div>
    );
  }

  if (!venues?.length) return null;

  const cities = new Set(venues.map((v) => v.city).filter(Boolean));
  const shown = [...venues].sort((a, b) => a.price_per_hour - b.price_per_hour).slice(0, ROWS);

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-foreground-soft">
          <span className="live-dot" aria-hidden="true" />
          Booking now
        </p>
        <p className="text-xs text-muted-foreground">
          {/* The two numbers that answer "is there anything here for me". */}
          <span className="stat-numeral">{venues.length}</span>
          {venues.length === 1 ? " venue" : " venues"}
          {cities.size > 0 && (
            <>
              {" · "}
              <span className="stat-numeral">{cities.size}</span>
              {cities.size === 1 ? " city" : " cities"}
            </>
          )}
        </p>
      </div>

      <ul className="border-t border-border">
        {shown.map((venue) => (
          <li key={venue.id} className="border-b border-border last:border-b-0">
            <Link
              to={`/venue/${venue.id}`}
              className="group flex min-h-[4.5rem] items-center gap-4 px-4 py-3.5 transition-colors duration-150 hover:bg-surface-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring motion-reduce:transition-none"
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate font-display text-ui font-semibold leading-6 text-foreground">
                  {venue.name}
                </span>
                <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-meta leading-5 text-muted-foreground">
                  <span className="truncate">{venue.city}</span>
                  {venue.sports?.[0] && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="truncate">{venue.sports[0]}</span>
                    </>
                  )}
                  {venue.review_count > 0 && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="inline-flex items-center gap-1">
                        <Star
                          className="h-3 w-3 fill-current text-brand-tuff"
                          aria-hidden="true"
                        />
                        <span className="stat-numeral">{venue.rating.toFixed(1)}</span>
                      </span>
                    </>
                  )}
                </span>
              </span>

              <span className="shrink-0 text-right">
                <Price
                  amount={venue.price_per_hour}
                  className="text-ui font-semibold leading-6 text-foreground"
                />
                {/* 12px, not 11. Uppercase with letterspacing reads smaller
                    than its nominal size, and 11px was already under the floor
                    this codebase holds for any visible text. */}
                <span className="mt-0.5 block text-xs uppercase tracking-[0.08em] text-muted-foreground">
                  per hour
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <Link
        to="/venues"
        className="group flex min-h-[3rem] items-center justify-between gap-3 border-t border-border px-4 py-3 text-sm font-semibold text-primary transition-colors duration-150 hover:bg-primary-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring motion-reduce:transition-none"
      >
        See every venue
        <ArrowRight
          className="h-4 w-4 transition-transform duration-150 group-hover:translate-x-0.5 motion-reduce:transition-none"
          aria-hidden="true"
        />
      </Link>
    </div>
  );
}

export default LiveInventory;
