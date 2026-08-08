import { cn } from "@/lib/utils";
import { formatMoney } from "@/hooks/useOperatorMetrics";
import type { Currency } from "@/lib/market";

/**
 * An operator figure in an explicit currency, with the mark outside the
 * monospaced run.
 *
 * `.stat-numeral` sets JetBrains Mono for tabular figures, and the dram sign
 * does not exist in it — inside a numeral run the glyph falls through to the
 * next face in the stack and sets beside digits it was never fitted to.
 * `numeral-glyphs.mjs` fails the build for exactly this, and the fix it names
 * is `<Price>`.
 *
 * `<Price>` cannot be used here. It reads the viewer's region to choose between
 * ֏ and $, and these panels deliberately show both at once: the GMV table has
 * a Yerevan column in AMD beside a Los Angeles column in USD, and the
 * neighbourhood rows each carry their own market's currency. A component that
 * picks the symbol from the reader's region would relabel one of those columns
 * with the wrong currency — a worse defect than the typography one, and a
 * silent one.
 *
 * So this splits the same way `<Price>` does, but takes the currency as an
 * argument. The whole string stays available to assistive tech as one node, so
 * the amount is still announced once rather than as a symbol and a number.
 */
export function Money({
  amount,
  currency,
  className,
}: {
  amount: number;
  currency: Currency;
  className?: string;
}) {
  const formatted = formatMoney(amount, currency);
  // formatMoney puts the mark first for both currencies; the rest is the
  // figure. Split on the first digit rather than by length, so a future
  // multi-character mark does not silently take a digit with it.
  const firstDigit = formatted.search(/\d/);
  const symbol = firstDigit > 0 ? formatted.slice(0, firstDigit) : "";
  const figure = firstDigit > 0 ? formatted.slice(firstDigit) : formatted;

  return (
    <span className={cn("inline-flex items-baseline gap-0.5 whitespace-nowrap", className)}>
      <span className="sr-only">{formatted}</span>
      <span aria-hidden="true" className="text-muted-foreground">
        {symbol}
      </span>
      <span aria-hidden="true" className="stat-numeral">
        {figure}
      </span>
    </span>
  );
}

export default Money;
