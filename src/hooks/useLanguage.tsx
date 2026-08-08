import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { en } from "@/i18n/en";
import { hy } from "@/i18n/hy";
import { LANGUAGES, type Language } from "@/i18n/types";

const STORAGE_KEY = "sportsbnb_language";

const DICTIONARIES = { en, hy } as const;

interface LanguageContextValue {
  language: Language;
  setLanguage: (next: Language) => void;
  /** Dot-path lookup: t("booking.serviceFee"). */
  t: (path: string) => string;
  /** True when the language was chosen by the visitor rather than detected. */
  isExplicit: boolean;
}

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

function isLanguage(value: unknown): value is Language {
  return typeof value === "string" && (LANGUAGES as readonly string[]).includes(value);
}

/**
 * Which language to open in, when the visitor has never said.
 *
 * Three signals, in descending order of how much they actually tell us:
 *
 *  1. `navigator.language` — the strongest, because it is a stated preference.
 *     Someone whose browser is set to Armenian wants Armenian wherever they are,
 *     including a diaspora reader in Los Angeles.
 *
 *  2. Time zone — the location signal, and the reason no IP lookup is needed.
 *     Asia/Yerevan is a good proxy for "in Armenia", costs no network request,
 *     leaks nothing, and works offline. It is already how useRegion decides
 *     which map centre to use, so the app has one notion of where you are
 *     rather than two that can disagree.
 *
 *  3. English, as the fallback that is readable to the most people.
 *
 * Deliberately NOT used: an IP geolocation service. It would add a request on
 * first paint, a third party in the critical path, and a privacy question — to
 * improve on a time zone that is already right for essentially everyone
 * physically in the country.
 */
export function detectLanguage(): Language {
  try {
    const navigatorLanguages = [
      ...(navigator.languages ?? []),
      navigator.language,
    ].filter(Boolean);
    for (const tag of navigatorLanguages) {
      // "hy", "hy-AM", "hy-Armn-AM" all mean Armenian.
      if (tag.toLowerCase().startsWith("hy")) return "hy";
    }
  } catch {
    // Non-browser environment (tests, prerender) — fall through.
  }

  try {
    if (Intl.DateTimeFormat().resolvedOptions().timeZone === "Asia/Yerevan") return "hy";
  } catch {
    // Intl unavailable — fall through.
  }

  return "en";
}

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [stored, setStored] = useState<Language | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return isLanguage(saved) ? saved : null;
    } catch {
      return null;
    }
  });

  // Detection runs once and is not persisted. Writing it to storage would turn
  // a guess into a decision: a visitor detected as English on a work laptop in
  // Yerevan would be stuck there even after their browser settings changed,
  // and we could no longer tell "they chose English" from "we guessed English".
  const [detected] = useState<Language>(() => detectLanguage());

  const language = stored ?? detected;

  const setLanguage = useCallback((next: Language) => {
    setStored(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Private mode with storage denied — the choice still applies for this
      // session, it just will not survive a reload.
    }
  }, []);

  // `lang` drives hyphenation, the voice a screen reader picks, and whether the
  // browser offers to translate the page. Leaving it at the index.html default
  // of "en" would have a screen reader read Armenian with an English
  // synthesiser, which is unintelligible rather than merely wrong.
  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const t = useCallback(
    (path: string): string => {
      const lookup = (dict: unknown): string | undefined => {
        const value = path
          .split(".")
          .reduce<unknown>((node, key) => (node as Record<string, unknown>)?.[key], dict);
        return typeof value === "string" ? value : undefined;
      };

      // English is the fallback rather than the key itself: a missing Armenian
      // string should degrade to readable English, not to "booking.serviceFee"
      // on the page. The compiler makes this unreachable for keys that exist in
      // en.ts — it covers a bad path passed at runtime.
      return lookup(DICTIONARIES[language]) ?? lookup(en) ?? path;
    },
    [language],
  );

  const value = useMemo(
    () => ({ language, setLanguage, t, isExplicit: stored !== null }),
    [language, setLanguage, t, stored],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export function useLanguage(): LanguageContextValue {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("useLanguage must be used within a LanguageProvider");
  return context;
}

/** Shorthand for the common case of only needing `t`. */
export function useTranslation(): (path: string) => string {
  return useLanguage().t;
}
