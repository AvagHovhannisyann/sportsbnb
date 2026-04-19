/**
 * Phone number normalization and deep-link helpers for free booking handoff.
 * No paid APIs — only wa.me, sms:, tel: links.
 */

/**
 * Strip everything except digits and leading +.
 * Defaults to +374 (Armenia) when no country code is present and number starts with 0/9.
 */
export function normalizePhoneE164(raw: string | null | undefined, defaultCountryCode = "+374"): string | null {
  if (!raw) return null;
  let cleaned = raw.replace(/[^\d+]/g, "");
  if (!cleaned) return null;

  // If starts with +, keep it
  if (cleaned.startsWith("+")) {
    return cleaned;
  }
  // Local Armenian style: 0XXXXXXXX -> +374XXXXXXXX
  if (cleaned.startsWith("0")) {
    cleaned = cleaned.slice(1);
  }
  // If still bare digits, prepend default country code
  return `${defaultCountryCode}${cleaned}`;
}

/** Phone number for wa.me — must be digits only, no + or spaces. */
export function toWhatsAppDigits(raw: string | null | undefined): string | null {
  const e164 = normalizePhoneE164(raw);
  if (!e164) return null;
  return e164.replace(/\D/g, "");
}

/** Pretty display format — keeps + and spaces. */
export function formatPhoneDisplay(raw: string | null | undefined): string {
  const e164 = normalizePhoneE164(raw);
  if (!e164) return "";
  // +374 99 11 22 33 style
  const digits = e164.slice(1);
  if (digits.length <= 3) return `+${digits}`;
  if (digits.length <= 5) return `+${digits.slice(0, 3)} ${digits.slice(3)}`;
  if (digits.length <= 8) return `+${digits.slice(0, 3)} ${digits.slice(3, 5)} ${digits.slice(5)}`;
  return `+${digits.slice(0, 3)} ${digits.slice(3, 5)} ${digits.slice(5, 8)} ${digits.slice(8)}`;
}

export function buildWhatsAppLink(phone: string | null | undefined, message: string): string | null {
  const digits = toWhatsAppDigits(phone);
  if (!digits) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

export function buildSmsLink(phone: string | null | undefined, message: string): string | null {
  const e164 = normalizePhoneE164(phone);
  if (!e164) return null;
  // iOS uses ?body= , Android uses ?body= too (modern). Use ?&body= for safety.
  return `sms:${e164}?&body=${encodeURIComponent(message)}`;
}

export function buildTelLink(phone: string | null | undefined): string | null {
  const e164 = normalizePhoneE164(phone);
  if (!e164) return null;
  return `tel:${e164}`;
}

/**
 * Generate a short, human-readable booking tracking code.
 * Format: SB-YYYY-XXXXX (e.g. SB-2026-8F3K2)
 */
export function generateBookingCode(): string {
  const year = new Date().getFullYear();
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no confusing 0/O/1/I
  let suffix = "";
  for (let i = 0; i < 5; i++) {
    suffix += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `SB-${year}-${suffix}`;
}
