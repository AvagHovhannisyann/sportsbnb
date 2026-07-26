import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * The dram sign, U+058F, is not in Space Grotesk, DM Sans or JetBrains Mono.
 * Every price in the app is written with it, so each font stack carries
 * 'Noto Sans Armenian' to supply that one glyph — CSS fallback is per-glyph,
 * so Latin still sets in the primary face.
 *
 * That fix was applied to the `--font-*` variables in index.css and *not* to
 * the duplicate stacks in tailwind.config.ts. The result was that
 * `.stat-numeral`, which reads var(--font-mono), rendered ֏ correctly while
 * every `className="font-mono"` price fell back to whatever the OS supplied —
 * the hero's confirmation card, checkout, booking status, owner earnings.
 *
 * These tests exist because the bug was not that someone chose the wrong font.
 * It was that one thing had two definitions and only one of them was fixed.
 */
const read = (p: string) => readFileSync(resolve(__dirname, "../..", p), "utf8");

const DRAM = "֏";

describe("font stacks", () => {
  const css = read("src/index.css");

  it("declares --font-display, --font-sans and --font-mono", () => {
    for (const name of ["display", "sans", "mono"]) {
      expect(css).toMatch(new RegExp(`--font-${name}:`));
    }
  });

  it.each(["display", "sans", "mono"])(
    "--font-%s falls back to a face that has the dram sign",
    (name) => {
      const stack = css.match(new RegExp(`--font-${name}:([^;]+);`))?.[1];
      expect(stack, `--font-${name} not found`).toBeDefined();
      expect(stack).toContain("Noto Sans Armenian");
    },
  );

  it("subsets the Armenian import to the dram sign alone", () => {
    // `&text=%D6%8F` keeps this a ~1KB request rather than a whole family.
    expect(css).toContain("Noto+Sans+Armenian");
    expect(css).toContain(encodeURIComponent(DRAM).toUpperCase());
  });
});

describe("tailwind font utilities", () => {
  const config = read("tailwind.config.ts");
  // Comments stripped first. The literal-family assertion below failed on its
  // own first run against the comment explaining why those families must not
  // appear — the third checker in this codebase to flag its own documentation,
  // after the palette audit and the clickable-element scanner.
  const block = (config.match(/fontFamily:\s*\{([\s\S]*?)\n\s{6}\}/)?.[1] ?? "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

  it("finds the fontFamily block", () => {
    expect(block).not.toBe("");
  });

  it.each(["display", "sans", "mono"])(
    "font-%s defers to the CSS variable instead of restating the stack",
    (name) => {
      // A literal family list here is a second source of truth, and the second
      // one is the one that does not get fixed.
      expect(block).toMatch(new RegExp(`${name}:\\s*\\["var\\(--font-${name}\\)"\\]`));
    },
  );

  it("names no font family literally", () => {
    for (const family of ["Space Grotesk", "DM Sans", "JetBrains Mono"]) {
      expect(block).not.toContain(family);
    }
  });
});
