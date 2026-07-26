/**
 * The app's status-chip vocabulary, in one place.
 *
 * Every one of these was a `Record<string, string>` written out again in each
 * file that needed it, in raw Tailwind palette, usually as a light/dark pair —
 * `bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200`. The
 * light half never renders, because the app ships dark-only (`<html
 * class="dark">`, no toggle), and the dark half was not measured.
 *
 * `scripts/palette-contrast.mjs` now measures palette text colours against
 * every container surface and fails ones that cannot reach AA on any of them.
 * It found sixteen, the worst at 2.31:1. These tokens replace them, and the
 * same script keeps the replacements honest.
 *
 * The shape is `border-X/20 bg-X/10 text-X` throughout — the tinted chip the
 * app already used elsewhere — measured on the card surface at:
 *
 *   success 6.05:1 · warning 7.13:1 · destructive 4.61:1 · primary 7.44:1
 *   chart-4 5.34:1
 */

/** A neutral chip, for states that carry no judgement. */
export const NEUTRAL_CHIP = "border-border bg-muted text-muted-foreground";

export type ChipTone = "positive" | "warning" | "danger" | "info" | "neutral";

export const TONE_CHIP: Record<ChipTone, string> = {
  positive: "border-success/20 bg-success/10 text-success",
  warning: "border-warning/20 bg-warning/10 text-warning",
  danger: "border-destructive/20 bg-destructive/10 text-destructive",
  info: "border-primary/20 bg-primary/10 text-primary",
  neutral: NEUTRAL_CHIP,
};

/**
 * Skill level.
 *
 * Advanced deliberately does not use `danger`. Red means one thing everywhere
 * else in this app — destructive buttons, error panels, failed payments — so
 * an advanced game styled red reads as a broken one. `--chart-4` is the
 * categorical purple, lightened in the dark theme until it cleared AA at chip
 * size (it measured 3.35:1 before, which is fine for a chart fill and not for
 * text).
 */
export const SKILL_LEVEL_CHIP: Record<string, string> = {
  beginner: TONE_CHIP.positive,
  intermediate: TONE_CHIP.warning,
  advanced: "border-chart-4/20 bg-chart-4/10 text-chart-4",
  all: TONE_CHIP.info,
};

export const skillLevelChip = (level: string | null | undefined) =>
  SKILL_LEVEL_CHIP[level ?? ""] ?? SKILL_LEVEL_CHIP.all;

/** "All levels" reads better than the raw value on a chip. */
export const skillLevelLabel = (level: string | null | undefined) =>
  level === "all" ? "All levels" : (level ?? "All levels");
