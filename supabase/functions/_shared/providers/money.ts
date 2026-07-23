/**
 * Money helpers. All amounts are stored as integer minor units with exponent 2
 * (AMD ×100 — luma are unused in practice but this matches provider decimal
 * amounts exactly). Conversion to provider decimals happens only here.
 */

export function minorToDecimal(amountMinor: number): number {
  return Math.round(amountMinor) / 100;
}

export function decimalToMinor(amount: number): number {
  return Math.round(amount * 100);
}

/** ISO 4217 numeric codes used by Ameria vPOS. */
export const CURRENCY_NUMERIC: Record<string, string> = {
  AMD: "051",
  USD: "840",
  EUR: "978",
  RUB: "643",
};
