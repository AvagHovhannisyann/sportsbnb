// Platform fee configuration
// The platform adds a 5% fee on top of the owner's listed price
// Example: Owner lists $40/hour → Customer pays $42 → Owner receives $40

export const PLATFORM_FEE_PERCENTAGE = 0.05; // 5%

/**
 * Calculate the customer-facing price (owner's price + platform fee)
 * @param ownerPrice - The price the owner lists (what they will receive)
 * @returns The price the customer will pay
 */
export const getCustomerPrice = (ownerPrice: number): number => {
  return Math.ceil(ownerPrice * (1 + PLATFORM_FEE_PERCENTAGE));
};

/**
 * Calculate the platform fee amount from the owner's price
 * @param ownerPrice - The price the owner lists
 * @returns The platform fee amount
 */
export const getPlatformFee = (ownerPrice: number): number => {
  return getCustomerPrice(ownerPrice) - ownerPrice;
};

/**
 * Get the owner's price from the customer-facing price
 * @param customerPrice - The price the customer pays
 * @returns The amount the owner receives
 */
export const getOwnerPrice = (customerPrice: number): number => {
  return Math.floor(customerPrice / (1 + PLATFORM_FEE_PERCENTAGE));
};

/**
 * Format price for display with the appropriate currency symbol.
 *
 * Denominated in Armenian dram unless the viewer is in the US region.
 *
 * This used to be the other way round — dram only for an exact "AM" region
 * match, dollars for everything else, including the "OTHER" bucket that
 * `useRegion` assigns to every unmapped timezone. Currency is a property of
 * the listing, not of whoever is looking at it: a Yerevan pitch costs 13,000
 * dram to everyone, but it rendered as "$13,000" to any visitor outside
 * Armenia — roughly a 400x overstatement, on the number the entire booking
 * decision turns on. There is no FX layer here to justify a viewer-dependent
 * symbol, and the money rails behind it (Ameria vPOS, Idram) settle in AMD.
 *
 * US stays explicit because that inventory is genuinely dollar-priced.
 *
 * @param price - The price to format
 * @returns Formatted price string
 */
export const formatPrice = (price: number): string => {
  const { symbol, amount } = formatPriceParts(price);
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
export const formatPriceParts = (price: number): { symbol: string; amount: string } => {
  const region = typeof window !== "undefined" ? localStorage.getItem("sportsbnb_region") : null;
  return {
    symbol: region === "US" ? "$" : "֏",
    amount: price.toLocaleString(),
  };
};
