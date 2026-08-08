/**
 * The two languages the product ships in.
 *
 * "hy" is the ISO 639-1 code for Armenian. It is what belongs in <html lang>,
 * what Intl expects for hy-AM formatting, and what a screen reader reads to
 * pick a voice — so it is the code used throughout rather than "am", which is
 * Amharic and would hand an Armenian page to the wrong synthesiser.
 */
export type Language = "en" | "hy";

export const LANGUAGES: readonly Language[] = ["en", "hy"] as const;

/** What each language calls itself. Never translated — a language picker that
 *  says "Armenian" to someone who cannot read English is useless. */
export const LANGUAGE_NAMES: Record<Language, string> = {
  en: "English",
  hy: "Հայերեն",
};

/**
 * A dictionary is a nested object of strings, keyed however the caller likes.
 *
 * `hy.ts` is declared as `Dictionary<typeof en>` rather than as a free-standing
 * object, which is the whole reason this is hand-rolled instead of i18next:
 * adding a key to `en.ts` without adding it to `hy.ts` is a type error at build
 * time, not a fallback string discovered by an Armenian user in production.
 */
export type Dictionary<T> = {
  [K in keyof T]: T[K] extends string ? string : Dictionary<T[K]>;
};
