import { Resend } from "https://esm.sh/resend@2.0.0";
import { handlePreflight } from "../_shared/cors.ts";
import { json, errorResponse, makeLogger } from "../_shared/http.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const log = makeLogger("send-contact-email");

interface ContactEmailRequest {
  name: string;
  email: string;
  subject: string;
  message: string;
}

const escapeHtml = (str: string): string => {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
};

// In-memory per-IP rate limiter (per instance; resets on cold start)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 3600000;
const RATE_LIMIT_MAX = 5;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    return false;
  }

  entry.count++;
  return true;
}

Deno.serve(async (req) => {
  const preflight = handlePreflight(req);
  if (preflight) return preflight;

  try {
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    if (!checkRateLimit(clientIp)) {
      return errorResponse(req, "Too many requests. Please try again later.", 429);
    }

    const { name, email, subject, message }: ContactEmailRequest = await req.json();

    if (!name || !email || !subject || !message) {
      return errorResponse(req, "All fields are required", 400);
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return errorResponse(req, "Invalid email format", 400);
    }

    if (name.length > 200 || email.length > 320 || subject.length > 500 || message.length > 5000) {
      return errorResponse(req, "Input exceeds maximum length", 400);
    }

    const safeName = escapeHtml(name);
    const safeEmail = escapeHtml(email);
    const safeSubject = escapeHtml(subject);
    const safeMessage = escapeHtml(message);

    const supportEmailResponse = await resend.emails.send({
      from: "SportsBnB Support <support@sportsbnb.org>",
      to: ["support@sportsbnb.org"],
      subject: `Contact Form: ${safeSubject}`,
      html: `
        <h2>New Contact Form Submission</h2>
        <p><strong>From:</strong> ${safeName} (${safeEmail})</p>
        <p><strong>Subject:</strong> ${safeSubject}</p>
        <hr />
        <p><strong>Message:</strong></p>
        <p>${safeMessage.replace(/\n/g, "<br>")}</p>
      `,
      reply_to: email,
    });

    if (supportEmailResponse.error) {
      log("support email failed", { error: supportEmailResponse.error });
      return errorResponse(req, "Failed to send message. Please try again later.", 500);
    }

    const confirmationEmailResponse = await resend.emails.send({
      from: "SportsBnB Support <support@sportsbnb.org>",
      to: [email],
      subject: "We received your message!",
      html: `
        <h1>Thank you for contacting us, ${safeName}!</h1>
        <p>We have received your message and will get back to you as soon as possible.</p>
        <p><strong>Your message:</strong></p>
        <blockquote style="border-left: 3px solid #ccc; padding-left: 10px; margin: 10px 0;">
          ${safeMessage.replace(/\n/g, "<br>")}
        </blockquote>
        <p>Best regards,<br>The SportsBnB Team</p>
      `,
    });

    if (confirmationEmailResponse.error) {
      log("confirmation email failed", { error: confirmationEmailResponse.error });
      return errorResponse(req, "Failed to send confirmation email. Please try again later.", 500);
    }

    return json(req, { success: true, message: "Emails sent successfully" });
  } catch (error) {
    log("unexpected error", { message: error instanceof Error ? error.message : String(error) });
    return errorResponse(req, "An unexpected error occurred. Please try again later.", 500);
  }
});
