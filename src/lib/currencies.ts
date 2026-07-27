/**
 * The currencies this app offers, and the country each maps to.
 *
 * Pure data in its own file so it can be tested, and so the two pages that
 * offer a currency picker can both read it without pulling in the Supabase
 * client. They used to disagree — see `currencies.test.ts` for what that cost.
 */
// Currency configurations with symbols and locale info
export const CURRENCIES: Record<string, { symbol: string; name: string; locale: string }> = {
  USD: { symbol: "$", name: "US Dollar", locale: "en-US" },
  EUR: { symbol: "€", name: "Euro", locale: "de-DE" },
  GBP: { symbol: "£", name: "British Pound", locale: "en-GB" },
  AMD: { symbol: "֏", name: "Armenian Dram", locale: "hy-AM" },
  RUB: { symbol: "₽", name: "Russian Ruble", locale: "ru-RU" },
  GEL: { symbol: "₾", name: "Georgian Lari", locale: "ka-GE" },
  TRY: { symbol: "₺", name: "Turkish Lira", locale: "tr-TR" },
  AED: { symbol: "د.إ", name: "UAE Dirham", locale: "ar-AE" },
  INR: { symbol: "₹", name: "Indian Rupee", locale: "hi-IN" },
  JPY: { symbol: "¥", name: "Japanese Yen", locale: "ja-JP" },
  CNY: { symbol: "¥", name: "Chinese Yuan", locale: "zh-CN" },
  KRW: { symbol: "₩", name: "South Korean Won", locale: "ko-KR" },
  BRL: { symbol: "R$", name: "Brazilian Real", locale: "pt-BR" },
  CAD: { symbol: "CA$", name: "Canadian Dollar", locale: "en-CA" },
  AUD: { symbol: "A$", name: "Australian Dollar", locale: "en-AU" },
};

// Country to currency mapping for auto-detection
export const COUNTRY_CURRENCY_MAP: Record<string, string> = {
  US: "USD",
  GB: "GBP",
  DE: "EUR",
  FR: "EUR",
  IT: "EUR",
  ES: "EUR",
  NL: "EUR",
  BE: "EUR",
  AT: "EUR",
  PT: "EUR",
  IE: "EUR",
  FI: "EUR",
  GR: "EUR",
  AM: "AMD",
  RU: "RUB",
  GE: "GEL",
  TR: "TRY",
  AE: "AED",
  IN: "INR",
  JP: "JPY",
  CN: "CNY",
  KR: "KRW",
  BR: "BRL",
  CA: "CAD",
  AU: "AUD",
};
