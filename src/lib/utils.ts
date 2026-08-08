import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * tailwind-merge, taught about this project's two custom font sizes.
 *
 * `text-*` is ambiguous: it is the prefix for both font size and text colour.
 * tailwind-merge disambiguates by literal lookup — it knows `text-sm` is a size
 * because `sm` is in its built-in scale — and anything it does not recognise
 * falls through to the colour group, which accepts arbitrary names so that
 * `text-brand-tuff` works without configuration.
 *
 * So the moment `meta` and `ui` were added to tailwind.config.ts, every
 * `cn("text-primary-foreground", "text-ui")` silently resolved to `text-ui`
 * alone: the size was read as a colour, and it evicted the real one. Buttons on
 * /demo rendered near-black text on the primary green — 2.04:1, caught by the
 * rendered-contrast smoke, not by typecheck or lint, because nothing about it
 * is a type error.
 *
 * Registering them here restores the literal lookup. Any future entry in the
 * `fontSize` block of tailwind.config.ts has to be added to this list too —
 * the two files are one decision expressed twice, and only one of them is
 * enforced by the compiler.
 */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [{ text: ["meta", "ui"] }],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
