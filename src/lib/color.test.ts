import { describe, it, expect } from 'vitest';
import {
  parseHexColor,
  hslTriplet,
  relativeLuminance,
  contrastRatio,
  readableForeground,
} from './color';

describe('parseHexColor', () => {
  it('reads the six-digit form the widget builder emits', () => {
    // `<input type="color">` can only produce this shape.
    expect(parseHexColor('#10b981')).toEqual({ h: 160.1, s: 84.1, l: 39.4 });
  });

  it('expands the three-digit form', () => {
    expect(parseHexColor('#fff')).toEqual(parseHexColor('#ffffff'));
    expect(parseHexColor('#0f0')).toEqual({ h: 120, s: 100, l: 50 });
  });

  it('is case- and whitespace-insensitive', () => {
    expect(parseHexColor('  #10B981 ')).toEqual(parseHexColor('#10b981'));
  });

  it('returns null for anything else, so the caller falls back', () => {
    // The query string is arbitrary input. A near-miss must not half-apply.
    for (const bad of ['red', 'rgb(1,2,3)', '10b981', '#12345', '', null, undefined]) {
      expect(parseHexColor(bad)).toBeNull();
    }
  });

  it('gives greys zero saturation rather than a NaN hue', () => {
    // max === min divides by zero if the early return is removed.
    expect(parseHexColor('#808080')).toEqual({ h: 0, s: 0, l: 50.2 });
  });
});

describe('hslTriplet', () => {
  it('produces the bare-channel form index.css stores tokens in', () => {
    // The bug this whole module exists for: `hsl(#10b981)` is invalid, so a
    // hex in this slot deletes the token instead of overriding it.
    expect(hslTriplet(parseHexColor('#10b981')!)).toBe('160.1 84.1% 39.4%');
  });
});

describe('relativeLuminance', () => {
  it('anchors at the two ends of the WCAG scale', () => {
    expect(relativeLuminance({ h: 0, s: 0, l: 100 })).toBeCloseTo(1, 6);
    expect(relativeLuminance({ h: 0, s: 0, l: 0 })).toBeCloseTo(0, 6);
  });

  it('separates two colours that share a lightness', () => {
    // The reason this goes through RGB instead of reading `l`: both are at 50%
    // lightness and they are nowhere near each other perceptually.
    const yellow = relativeLuminance({ h: 60, s: 100, l: 50 });
    const blue = relativeLuminance({ h: 240, s: 100, l: 50 });
    expect(yellow / blue).toBeGreaterThan(10);
  });
});

describe('contrastRatio', () => {
  it('gives 21:1 for black on white, in either order', () => {
    const w = { h: 0, s: 0, l: 100 };
    const k = { h: 0, s: 0, l: 0 };
    expect(contrastRatio(w, k)).toBeCloseTo(21, 5);
    expect(contrastRatio(k, w)).toBeCloseTo(21, 5);
  });

  it('gives 1:1 for a colour against itself', () => {
    expect(contrastRatio({ h: 160, s: 84, l: 39 }, { h: 160, s: 84, l: 39 })).toBeCloseTo(1, 6);
  });
});

describe('readableForeground', () => {
  it('picks ink over white on the widget default, which white fails', () => {
    // Measured in the browser before the fix: white on #10b981 is 2.54:1 on
    // the embed's selected-date button, for 12px and 18px text.
    const brand = parseHexColor('#10b981')!;
    expect(contrastRatio(brand, readableForeground(brand))).toBeGreaterThan(4.5);
    expect(contrastRatio(brand, { h: 0, s: 0, l: 100 })).toBeLessThan(3);
  });

  it('picks white on a dark brand colour', () => {
    expect(readableForeground(parseHexColor('#1e3a8a')!).l).toBe(100);
  });

  it('clears AA for every hue at every lightness', () => {
    // The guarantee, swept rather than argued. An earlier version picked the
    // better of white and ink only, which the same sweep put at 4.34:1 — the
    // green cast in ink costs exactly the mid-greys. Falling back to plain
    // black there lands the floor on the white/black crossover, 4.58:1.
    let worst = Infinity;
    for (let h = 0; h < 360; h += 5) {
      for (let s = 0; s <= 100; s += 10) {
        for (let l = 0; l <= 100; l += 2) {
          const bg = { h, s, l };
          worst = Math.min(worst, contrastRatio(bg, readableForeground(bg)));
        }
      }
    }
    expect(worst).toBeGreaterThanOrEqual(4.5);
    // 4.50, not the 4.58 white/black crossover: ink is accepted only when it
    // already clears AA, so the gate is what sets the floor. Every colour ink
    // cannot serve falls through to white-or-black, which is never worse.
    expect(worst).toBeCloseTo(4.5, 2);
  });

  it('still uses the house ink wherever it can afford to', () => {
    // The fallback must not quietly turn every widget into pure black.
    const inkWins = ['#10b981', '#facc15', '#38bdf8', '#f472b6'].filter(
      (hex) => readableForeground(parseHexColor(hex)!).s > 0,
    );
    expect(inkWins).toHaveLength(4);
  });
});
