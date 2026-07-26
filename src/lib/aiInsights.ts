/**
 * Validation for AI-produced payloads.
 *
 * Deliberately free of any import that reaches the Supabase client. The first
 * version of this lived in `useAIInsights.ts`, whose module scope constructs
 * the client — so its test passed locally, where `.env` supplies
 * `VITE_SUPABASE_URL`, and failed in CI with "supabaseUrl is required" because
 * the `ci` job sets no env at all. Every other test in this repo targets a pure
 * module; this one now does too.
 */
export interface PlayerNextMove {
  headline: string;
  detail: string;
  cta_label: string;
  cta_link: string;
  vibe: "urgent" | "positive" | "neutral" | "discovery";
}

/**
 * A suggestion the model produced, or null.
 *
 * `player-insights` is LLM-backed, so a partial or reshaped payload is a
 * realistic outcome rather than a theoretical one — and `data as
 * PlayerNextMove` is a cast, not a check. A response missing `headline` and
 * `cta_link` still passed the card's `!data` guard, because `{}` is truthy,
 * and rendered an empty husk: a "Suggestion" badge, no text, and an arrow
 * button with no accessible name pointing at `to={undefined}`.
 */
export const asNextMove = (value: unknown): PlayerNextMove | null => {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  const str = (k: string) => (typeof v[k] === "string" && v[k] ? (v[k] as string) : null);
  const headline = str("headline");
  const ctaLabel = str("cta_label");
  const ctaLink = str("cta_link");
  // Everything the card renders has to be present. A suggestion missing its
  // own call to action is not a partial suggestion, it is not one.
  if (!headline || !ctaLabel || !ctaLink) return null;
  const vibe = str("vibe");
  return {
    headline,
    detail: str("detail") ?? "",
    cta_label: ctaLabel,
    cta_link: ctaLink,
    vibe:
      vibe === "urgent" || vibe === "positive" || vibe === "discovery"
        ? vibe
        : "neutral",
  };
};
