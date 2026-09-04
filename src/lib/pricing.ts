// Platform fee configuration
//
// Sportsbnb takes zero commission. The player pays exactly the hourly rate the
// owner listed, and the owner receives all of it.
// Example: owner lists ֏12,000/hour → player pays ֏12,000 → owner receives ֏12,000.
//
// The functions below are kept rather than inlined away because the fee is a
// platform *setting* (`platform_settings.commission_bps`, now 0), not a law of
// nature — if a commission is ever reintroduced, this is the one place the
// customer-facing arithmetic changes, and every call site follows.

export const PLATFORM_FEE_PERCENTAGE = 0; // no commission

/**
 * Calculate the customer-facing price.
 *
 * With zero commission this is the owner's price unchanged; it stays a
 * function so call sites keep expressing "what the player pays".
 *
 * @param ownerPrice - The price the owner lists (what they will receive)
 * @returns The price the customer will pay
 */
export const getCustomerPrice = (ownerPrice: number): number => {
  return Math.ceil(ownerPrice * (1 + PLATFORM_FEE_PERCENTAGE));
};

/**
 * Calculate the platform fee amount from the owner's price
 * @param ownerPrice - The price the owner lists
 * @returns The platform fee amount — currently always 0
 */
export const getPlatformFee = (ownerPrice: number): number => {
  return getCustomerPrice(ownerPrice) - ownerPrice;
};

/**
 * Get the owner's price from the customer-facing price
 * @param customerPrice - The price the customer pays
 * @returns The amount the owner receives — currently the full amount
 */
export const getOwnerPrice = (customerPrice: number): number => {
  return Math.floor(customerPrice / (1 + PLATFORM_FEE_PERCENTAGE));
};

const CURRENCY_SYMBOLS: Record<string, string> = {
  AMD: "֏",
  USD: "$",
  EUR: "€",
};

/**
 * Format price for display with the appropriate currency symbol.
 *
 * Currency is a property of the listing, not of whoever is looking at it: a
 * Yerevan pitch costs 13,000 dram to everyone, and a Glendale cage costs $50
 * to everyone. Callers rendering a venue's price must pass the venue's
 * `currency` column so the symbol follows the listing across regions.
 *
 * The viewer-region fallback exists only for callers with no listing in scope
 * (the filter chip's "Under X" label, static homepage sample) and defaults to
 * dram outside the US, because Armenia is the primary market and the payment
 * rail settles in AMD. An earlier version of this function did the opposite —
 * dollars for every unmapped timezone — which relabelled a 13,000-dram pitch
 * as "$13,000", a ~400x overstatement on the number the booking decision
 * turns on. There is no FX layer here; never convert, only label.
 *
 * @param price - The price to format
 * @param currency - ISO 4217 code of the listing ("AMD" | "USD"), if known
 * @returns Formatted price string
 */
export const formatPrice = (price: number, currency?: string | null): string => {
  const { symbol, amount } = formatPriceParts(price, currency);
  return `${symbol}${amount}`;
};

/**
 * The same price, split into the currency mark and the number.
 *
 * These want different typefaces, and gluing them together forces one choice
 * for both. Prices are set in `.stat-numeral`, which is JetBrains Mono with
 * tabular figures — the right call for the digits, since it is what lets a
 * column of prices line up. But JetBrains Mono has no U+058F, so the dram sign
 * falls through to Noto Sans Armenian, a proportional face, and lands in the
 * middle of a monospaced run wearing none of its metrics.
 *
 * Measured at 20px: every digit and the `$` advance 12px, as a monospaced font
 * guarantees; the dram sign advances 14.7px and stands 30px tall inside a 28px
 * line box. Rendered at 6x the two glyphs plainly collide — `֏` and `8` touch,
 * so the most important number on a venue card reads as one mangled shape.
 *
 * Splitting them lets the mark set in the sans stack it was drawn for while
 * the digits keep their tabular alignment. `formatPrice` still returns the
 * joined string, which is what aria-labels, titles and tests want.
 */
export const formatPriceParts = (
  price: number,
  currency?: string | null,
): { symbol: string; amount: string } => {
  let symbol: string;
  if (currency && CURRENCY_SYMBOLS[currency]) {
    symbol = CURRENCY_SYMBOLS[currency];
  } else {
    // No listing currency in scope — fall back to the viewer's region.
    const region = typeof window !== "undefined" ? localStorage.getItem("sportsbnb_region") : null;
    symbol = region === "US" ? "$" : "֏";
  }
  return {
    symbol,
    amount: price.toLocaleString(),
  };
};
