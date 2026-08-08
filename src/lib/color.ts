/**
 * Turning an owner's brand colour into something the token layer can use.
 *
 * The embeddable booking widget takes `?color=#10b981` and applied it by
 * setting `style={{ "--primary": primaryColor }}`. That looks right and is
 * not: every token in this app is stored as a bare HSL *channel triplet*
 * (`--primary: 151 90% 47%`) because Tailwind consumes it as
 * `hsl(var(--primary))` so that `bg-primary/10` can work. Substituting a hex
 * makes that `hsl(#10b981)`, which is invalid, so the declaration is dropped.
 *
 * Measured in the widget: `bg-primary` computed to `rgba(0, 0, 0, 0)`. The
 * owner's brand colour was not being applied — it was silently deleting the
 * primary token for the whole embed, and only the two places that also set an
 * inline `backgroundColor` showed any colour at all.
 *
 * The second half of the same bug is the foreground. Those inline fills were
 * paired with a hardcoded `text-white`, which is 2.54:1 on the default emerald
 * — below the 4.5:1 that WCAG 1.4.3 asks of text that size, and worse for any
 * lighter colour an owner picks. A brand colour is arbitrary input, so the
 * text on top of it has to be derived rather than assumed.
 */

export type Hsl = { h: number; s: number; l: number };

/** Open Court's default widget accent. Owners can still replace it freely. */
export const DEFAULT_WIDGET_PRIMARY_COLOR = "#195d44";

/**
 * `#rgb` or `#rrggbb` to HSL, or null.
 *
 * Deliberately narrow. The widget builder uses `<input type="color">`, which
 * can only ever produce `#rrggbb`, so anything else arriving on the query
 * string is either a mistake or someone poking at it; either way the caller
 * wants the default rather than a best guess.
 */
export function parseHexColor(input: string | null | undefined): Hsl | null {
  if (!input) return null;
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(input.trim());
  if (!m) return null;
  const hex = m[1].length === 3 ? [...m[1]].map((c) => c + c).join('') : m[1];
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return { h: 0, s: 0, l: round(l * 100) };

  const s = d / (1 - Math.abs(2 * l - 1));
  const h =
    max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;

  return { h: round(((h * 60) % 360 + 360) % 360), s: round(s * 100), l: round(l * 100) };
}

/** The form every token in `index.css` is written in. */
export const hslTriplet = ({ h, s, l }: Hsl) => `${h} ${s}% ${l}%`;

/**
 * Relative luminance, WCAG 2.1 definition, from HSL.
 *
 * Goes back through RGB rather than approximating from `l`: HSL lightness is
 * not perceptual, and 50% lightness yellow and 50% lightness blue differ by
 * more than 10:1 in contrast against white. Picking a foreground off `l` alone
 * would get exactly the vivid mid-tone brand colours wrong.
 */
export function relativeLuminance({ h, s, l }: Hsl): number {
  const sN = s / 100;
  const lN = l / 100;
  const a = sN * Math.min(lN, 1 - lN);
  const channel = (n: number) => {
    const k = (n + h / 30) % 12;
    return lN - a * Math.max(-1, Math.min(k - 3, Math.min(9 - k, 1)));
  };
  const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * lin(channel(0)) + 0.7152 * lin(channel(8)) + 0.0722 * lin(channel(4));
}

export const contrastRatio = (a: Hsl, b: Hsl) => {
  const [x, y] = [relativeLuminance(a), relativeLuminance(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
};

const WHITE: Hsl = { h: 0, s: 0, l: 100 };
const BLACK: Hsl = { h: 0, s: 0, l: 0 };
/**
 * A near-black with a green cast, matching `--foreground` in the light theme,
 * so a widget dropped into an owner's page looks like the rest of the app
 * rather than like a default browser button.
 */
const INK: Hsl = { h: 155, s: 25, l: 6 };

const AA_NORMAL = 4.5;

/**
 * The most readable of white, ink and black on `bg`, preferring ink where it
 * can afford to.
 *
 * Ink is the house colour and the first version simply picked the better of
 * white and ink, on the reasoning that the worst case is a mid-grey where one
 * of the two must clear AA. The floor that argument gives is 4.68:1. Swept
 * over every hue at every lightness, the real floor was **4.34:1** — because
 * ink is not black, and the green cast that makes it look like the app also
 * lifts its luminance enough to lose the mid-greys. The docstring asserted the
 * number; the sweep measured it; the sweep was right.
 *
 * So ink is used where it both wins and clears AA, and otherwise this falls
 * back to plain white-or-black, whose own crossover is 4.58:1. The floor of
 * the whole function is therefore 4.50:1 — the gate on the ink branch, not the
 * crossover, because ink is only ever accepted once it has already cleared AA.
 * That floor is a test, not a comment — see `color.test.ts`.
 */
export const readableForeground = (bg: Hsl): Hsl => {
  const onWhite = contrastRatio(bg, WHITE);
  const onInk = contrastRatio(bg, INK);
  if (onInk >= AA_NORMAL && onInk >= onWhite) return INK;
  return onWhite >= contrastRatio(bg, BLACK) ? WHITE : BLACK;
};

function round(n: number) {
  return Math.round(n * 10) / 10;
}
