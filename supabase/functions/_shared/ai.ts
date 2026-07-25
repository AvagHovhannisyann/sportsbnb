/**
 * AI provider: OpenRouter (https://openrouter.ai) — an OpenAI-compatible
 * chat-completions API that routes to many underlying models. This replaces
 * Lovable's AI gateway (ai.gateway.lovable.dev); the request/response shape
 * (messages, tools/tool_choice, response_format, streaming) is unchanged.
 *
 * Env: OPENROUTER_API_KEY
 *
 * Model slugs below are known-stable OpenRouter picks. If a model stops
 * resolving, check https://openrouter.ai/models for the current slug.
 */

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

export const AI_MODELS = {
  /** General chat + tool-calling. */
  chat: "google/gemini-2.5-flash",
  /** Cheaper/faster — classification, short extraction tasks. */
  chatLite: "google/gemini-2.5-flash-lite",
  /** Image generation (returns choices[0].message.images[]). */
  image: "google/gemini-2.5-flash-image-preview",
} as const;

export function requireOpenRouterKey(): string {
  const key = Deno.env.get("OPENROUTER_API_KEY");
  if (!key) throw new Error("OPENROUTER_API_KEY is not configured");
  return key;
}

/** POSTs to OpenRouter's chat/completions endpoint. `body` is passed through as-is. */
export async function chatCompletion(body: Record<string, unknown>, apiKey?: string): Promise<Response> {
  return fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey ?? requireOpenRouterKey()}`,
      "Content-Type": "application/json",
      // Optional but recommended by OpenRouter for attribution/rate-limit tiers.
      "HTTP-Referer": Deno.env.get("APP_BASE_URL") ?? "https://sportsbnb.org",
      "X-Title": "SportsBnB",
    },
    body: JSON.stringify(body),
  });
}
