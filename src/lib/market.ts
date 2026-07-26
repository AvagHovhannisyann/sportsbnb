/**
 * Which market a free-text place name belongs to.
 *
 * The city comes from onboarding, where it is a free-text field, so this has
 * to cope with "Yerevan", "yerevan", "Երևան", "Kentron, Yerevan" and whatever
 * else someone types.
 *
 * The matching used to be `city.toLowerCase().includes(keyword)` over a list
 * that contained the two-letter keyword `"la"`. Substring matching on two
 * letters is indiscriminate: **Alaverdi, Gladzor and Lachin — all towns in
 * Armenia — were classified as Los Angeles**, as were Portland, Oakland and
 * Cleveland. `currencyFor` keys off the market, so those users were also
 * counted in USD on the operator dashboard.
 *
 * Keywords now have to match whole words. `\b` is no use here because it is
 * not Unicode-aware and the Armenian spellings would break, so the string is
 * reduced to space-separated tokens and the keyword is looked for with its own
 * spaces around it.
 */
export type Market = "Yerevan" | "Los Angeles" | "Other";
export type Currency = "AMD" | "USD";

const LA_KEYWORDS = [
  "los angeles",
  "la",
  "santa monica",
  "pasadena",
  "hollywood",
  "venice",
  "west la",
  "beverly",
  "culver",
];

const YEREVAN_KEYWORDS = [
  "yerevan",
  "երևան",
  "kentron",
  "arabkir",
  "ajapnyak",
  "davtashen",
  "malatia",
  "shengavit",
  "erebuni",
  "nor nork",
  "nork",
  "kanaker",
];

/** " kentron yerevan " — padded so a keyword search sees word boundaries. */
const tokenize = (value: string): string =>
  ` ${value.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim()} `;

const matches = (padded: string, keywords: string[]): boolean =>
  keywords.some((keyword) => padded.includes(` ${keyword} `));

export const classifyMarket = (city: string | null | undefined): Market => {
  if (!city) return "Other";
  const padded = tokenize(city);
  // Yerevan first: "Malatia" is a Yerevan district and also contains "la".
  if (matches(padded, YEREVAN_KEYWORDS)) return "Yerevan";
  if (matches(padded, LA_KEYWORDS)) return "Los Angeles";
  return "Other";
};

export const currencyFor = (market: Market): Currency =>
  market === "Yerevan" ? "AMD" : "USD";
