import { cn } from "@/lib/utils";
import { formatPrice, formatPriceParts } from "@/lib/pricing";

/**
 * A price, with the currency mark and the number set in the fonts each needs.
 *
 * See `formatPriceParts` for the measurements. The short version: the digits
 * want JetBrains Mono's tabular figures so a column of prices aligns, and the
 * dram sign does not exist in JetBrains Mono, so inside a `.stat-numeral` run
 * it falls through to a proportional face and collides with the first digit.
 *
 * The symbol is a hair smaller than the number and slightly muted, which is how
 * currency marks are normally set next to a figure — the number is the thing
 * being read. That is a deliberate choice here rather than a workaround: it
 * happens to also keep the two faces from looking like a mismatch.
 *
 * The joined string is carried by a visually-hidden text node rather than an
 * `aria-label`, because `aria-label` on a bare `<span>` has no role to attach
 * to and is ignored by most screen readers. The visible pieces are hidden from
 * assistive tech so the price is announced once, whole.
 */
interface PriceProps {
  amount: number;
  /**
   * The listing's currency ("AMD" | "USD"). Always pass it when rendering a
   * venue's price — the symbol belongs to the listing, not the viewer, so a
   * Glendale court reads "$50" in Yerevan just as it does in Los Angeles.
   */
  currency?: string | null;
  /** Trailing unit, e.g. "/ hour". Set in the body font, never in the numeral. */
  suffix?: string;
  /** Applied to the numeral, for size and weight. */
  className?: string;
  /** Applied to the suffix. */
  suffixClassName?: string;
}

export function Price({ amount, currency, suffix, className, suffixClassName }: PriceProps) {
  const { symbol, amount: figure } = formatPriceParts(amount, currency);

  return (
    <span className="inline-flex items-baseline gap-0.5 whitespace-nowrap">
      <span className="sr-only">
        {formatPrice(amount, currency)}
        {suffix ? ` ${suffix}` : ""}
      </span>
      {/* Same size as the figure, muted rather than shrunk.
          Two attempts at shrinking it both missed, and the measurements are
          worth keeping: `cn("text-[0.85em]", className)` lost outright, because
          tailwind-merge resolves a font-size conflict in favour of the last
          class and `className` carries `text-xl` — measured 20px where 0.85em
          was meant. Reversing the order applied it and produced 13.6px, since
          `em` resolves against the *inherited* 16px, not the 20px sibling. A
          mark two-thirds the height of the digits looked broken in a different
          way. Setting a currency mark at the figure's own size is ordinary
          typography, and the colour alone gives the hierarchy. */}
      <span aria-hidden="true" className={cn(className, "leading-none text-foreground-soft")}>
        {symbol}
      </span>
      <span aria-hidden="true" className={cn("stat-numeral leading-none", className)}>
        {figure}
      </span>
      {suffix && (
        <span aria-hidden="true" className={cn("text-xs leading-none text-muted-foreground", suffixClassName)}>
          {suffix}
        </span>
      )}
    </span>
  );
}

export default Price;
