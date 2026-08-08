import { describe, expect, it } from "vitest";

import tailwindConfig from "../../tailwind.config";
import { cn } from "./utils";

/**
 * These exist because a font-size token that tailwind-merge does not recognise
 * is not a compile error, not a lint error, and not a visual change anywhere
 * the class happens to be written without a colour beside it. It surfaces only
 * as a contrast failure on whichever page pairs the two — which is how
 * `text-ui` shipped, evicted `text-primary-foreground` from every default
 * Button, and put 2.04:1 text on /demo.
 *
 * The first test is derived from the config rather than hardcoded, so adding a
 * size to tailwind.config.ts without registering it in utils.ts fails here
 * instead of on a rendered page.
 */

const customFontSizes = Object.keys(tailwindConfig.theme?.extend?.fontSize ?? {});

describe("cn", () => {
  it("has a custom font size to check", () => {
    // Guards the loop below against silently passing on an empty list if the
    // config's shape ever changes.
    expect(customFontSizes.length).toBeGreaterThan(0);
  });

  it.each(customFontSizes)("keeps a text colour beside text-%s", (size) => {
    expect(cn("text-primary-foreground", `text-${size}`)).toBe(
      `text-primary-foreground text-${size}`,
    );
  });

  it.each(customFontSizes)("still lets a later size replace text-%s", (size) => {
    // The point of registering them is that they behave like sizes in both
    // directions: they must not evict colours, and they must evict each other.
    expect(cn(`text-${size}`, "text-sm")).toBe("text-sm");
  });

  it("still lets a later colour replace an earlier one", () => {
    expect(cn("text-primary-foreground", "text-muted-foreground")).toBe(
      "text-muted-foreground",
    );
  });
});
