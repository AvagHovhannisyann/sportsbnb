import { afterEach, describe, expect, it, vi } from "vitest";

import { detectLanguage } from "./useLanguage";
import { en } from "@/i18n/en";
import { hy } from "@/i18n/hy";

/**
 * Detection is the part a visitor never reports. Someone who lands on an
 * English page in Yerevan does not file a bug — they just read the English, or
 * leave. So the cascade is pinned here rather than trusted.
 */

function stubNavigator(languages: string[]) {
  vi.stubGlobal("navigator", { languages, language: languages[0] });
}

function stubTimeZone(timeZone: string) {
  vi.spyOn(Intl, "DateTimeFormat").mockReturnValue({
    resolvedOptions: () => ({ timeZone }),
  } as unknown as Intl.DateTimeFormat);
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("detectLanguage", () => {
  it("prefers an Armenian browser language over any location", () => {
    // The diaspora case: an Armenian speaker abroad should still get Armenian.
    stubNavigator(["hy-AM", "en-US"]);
    stubTimeZone("America/Los_Angeles");
    expect(detectLanguage()).toBe("hy");
  });

  it.each(["hy", "hy-AM", "hy-Armn-AM", "HY-am"])("recognises the %s tag", (tag) => {
    stubNavigator([tag]);
    stubTimeZone("UTC");
    expect(detectLanguage()).toBe("hy");
  });

  it("falls back to the time zone when the browser language says nothing", () => {
    // The common case in Armenia: a laptop shipped with an English locale.
    stubNavigator(["en-US"]);
    stubTimeZone("Asia/Yerevan");
    expect(detectLanguage()).toBe("hy");
  });

  it("returns English for a non-Armenian language in a non-Armenian zone", () => {
    stubNavigator(["ru-RU"]);
    stubTimeZone("Europe/Moscow");
    expect(detectLanguage()).toBe("en");
  });

  it("does not mistake Amharic for Armenian", () => {
    // "am" is Amharic. Confusing the two is the reason this codebase uses "hy"
    // everywhere rather than the "am" that appears in some older payment code.
    stubNavigator(["am-ET"]);
    stubTimeZone("Africa/Addis_Ababa");
    expect(detectLanguage()).toBe("en");
  });

  it("survives an environment with neither navigator nor Intl", () => {
    vi.stubGlobal("navigator", undefined);
    vi.spyOn(Intl, "DateTimeFormat").mockImplementation(() => {
      throw new Error("no Intl");
    });
    expect(detectLanguage()).toBe("en");
  });
});

describe("dictionaries", () => {
  const paths = (obj: unknown, prefix = ""): string[] =>
    Object.entries(obj as Record<string, unknown>).flatMap(([key, value]) =>
      typeof value === "string"
        ? [`${prefix}${key}`]
        : paths(value, `${prefix}${key}.`),
    );

  it("has the same key set in both languages", () => {
    // The compiler already enforces this via Dictionary<TranslationShape>. This
    // asserts it at runtime too, because a future `as any` or a JSON-loaded
    // dictionary would slip past the type and land on a real visitor.
    expect(paths(hy).sort()).toEqual(paths(en).sort());
  });

  it("has no Armenian string left in English", () => {
    // Catches the copy-paste that leaves an English string in hy.ts.
    const untranslated = paths(en).filter((path) => {
      const read = (d: unknown) =>
        path.split(".").reduce<unknown>((n, k) => (n as Record<string, unknown>)?.[k], d);
      return read(en) === read(hy);
    });
    expect(untranslated).toEqual([]);
  });

  it("uses the Armenian full stop, not the Latin one", () => {
    // ։ (U+0589) and . are different characters and a reader notices.
    const latinTerminated = paths(hy).filter((path) => {
      const value = path
        .split(".")
        .reduce<unknown>((n, k) => (n as Record<string, unknown>)?.[k], hy);
      return typeof value === "string" && /[a-zA-Zա-ֆԱ-Ֆ]\.$/.test(value);
    });
    expect(latinTerminated).toEqual([]);
  });
});
