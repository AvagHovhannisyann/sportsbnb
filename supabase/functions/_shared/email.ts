/**
 * Shared branded email sender. All transactional email goes through here so
 * the sender identity and template live in one place.
 *
 * Env:
 *   RESEND_API_KEY            — Resend API key
 *   EMAIL_FROM                — verified sender, e.g. "SportsBnB <no-reply@sportsbnb.org>"
 *                               (falls back to Resend's test sender in dev)
 *   EMAIL_REPLY_TO            — optional reply-to
 */

const BRAND_GREEN = "#16c172";
const BG_DARK = "#0a120d";

export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

export interface EmailContent {
  heading: string;
  /** Pre-escaped HTML body blocks (use escapeHtml for user input). */
  bodyHtml: string;
  /** Optional call-to-action button. */
  cta?: { label: string; url: string };
  /** Optional key/value details table (values are escaped here). */
  details?: Array<[string, string]>;
  footerNote?: string;
}

export function renderEmail(content: EmailContent): string {
  const detailsHtml = content.details?.length
    ? `<table style="width:100%;border-collapse:collapse;margin:20px 0;background:#f6f8f7;border-radius:12px;overflow:hidden;">
        ${content.details
          .map(
            ([k, v]) => `
          <tr>
            <td style="padding:10px 16px;color:#5b6660;font-size:13px;border-bottom:1px solid #e8ece9;">${escapeHtml(k)}</td>
            <td style="padding:10px 16px;color:#101613;font-size:13px;font-weight:600;text-align:right;border-bottom:1px solid #e8ece9;">${escapeHtml(v)}</td>
          </tr>`,
          )
          .join("")}
      </table>`
    : "";

  const ctaHtml = content.cta
    ? `<div style="text-align:center;margin:28px 0 8px;">
        <a href="${content.cta.url}" style="display:inline-block;background:${BRAND_GREEN};color:${BG_DARK};font-weight:700;font-size:15px;text-decoration:none;padding:13px 32px;border-radius:12px;">
          ${escapeHtml(content.cta.label)}
        </a>
      </div>`
    : "";

  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#eef1ef;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
    <div style="max-width:560px;margin:0 auto;padding:32px 16px;">
      <div style="text-align:center;margin-bottom:20px;">
        <span style="display:inline-block;font-size:20px;font-weight:800;letter-spacing:-0.02em;color:${BG_DARK};">
          Sports<span style="color:${BRAND_GREEN};">Bnb</span>
        </span>
      </div>
      <div style="background:#ffffff;border-radius:16px;padding:32px 28px;box-shadow:0 2px 8px rgba(10,18,13,0.06);">
        <h1 style="margin:0 0 14px;font-size:21px;line-height:1.3;color:#101613;">${escapeHtml(content.heading)}</h1>
        <div style="font-size:14.5px;line-height:1.6;color:#39423d;">${content.bodyHtml}</div>
        ${detailsHtml}
        ${ctaHtml}
      </div>
      <p style="text-align:center;margin:20px 0 0;font-size:12px;color:#8b948e;">
        ${escapeHtml(content.footerNote ?? "SportsBnB — book courts, join games, play more.")}
      </p>
    </div>
  </body>
</html>`;
}

export async function sendEmail(params: {
  to: string | string[];
  subject: string;
  content: EmailContent;
  replyTo?: string;
}): Promise<{ ok: boolean; error?: string }> {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  if (!apiKey) return { ok: false, error: "RESEND_API_KEY not configured" };

  const from = Deno.env.get("EMAIL_FROM") ?? "SportsBnB <onboarding@resend.dev>";
  const replyTo = params.replyTo ?? Deno.env.get("EMAIL_REPLY_TO");

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      from,
      to: Array.isArray(params.to) ? params.to : [params.to],
      subject: params.subject,
      html: renderEmail(params.content),
      ...(replyTo ? { reply_to: replyTo } : {}),
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error("sendEmail failed:", res.status, body);
    return { ok: false, error: `Resend ${res.status}` };
  }
  return { ok: true };
}

/**
 * Lower-level sender for callers that compose their own full HTML (cold
 * outreach, digests) rather than the branded transactional template above.
 * Returns Resend's raw response body so callers can capture the message id.
 */
export async function sendRawEmail(params: {
  to: string | string[];
  from: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  tags?: Array<{ name: string; value: string }>;
}): Promise<{ ok: boolean; id?: string; error?: string; status: number }> {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  if (!apiKey) return { ok: false, error: "RESEND_API_KEY not configured", status: 500 };

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      from: params.from,
      to: Array.isArray(params.to) ? params.to : [params.to],
      subject: params.subject,
      html: params.html,
      ...(params.text ? { text: params.text } : {}),
      ...(params.replyTo ? { reply_to: params.replyTo } : {}),
      ...(params.tags ? { tags: params.tags } : {}),
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error("sendRawEmail failed:", res.status, data);
    return { ok: false, error: `Resend ${res.status}: ${JSON.stringify(data)}`, status: res.status };
  }
  return { ok: true, id: data.id, status: res.status };
}
