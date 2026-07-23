import { describe, it, expect } from "vitest";
import {
  normalizePhoneE164,
  toWhatsAppDigits,
  formatPhoneDisplay,
  buildWhatsAppLink,
  buildSmsLink,
  buildTelLink,
  generateBookingCode,
} from "./phone";

describe("normalizePhoneE164", () => {
  it("keeps numbers that already have a country code", () => {
    expect(normalizePhoneE164("+37499112233")).toBe("+37499112233");
    expect(normalizePhoneE164("+1 (555) 123-4567")).toBe("+15551234567");
  });

  it("converts local Armenian numbers to +374", () => {
    expect(normalizePhoneE164("099112233")).toBe("+37499112233");
    expect(normalizePhoneE164("99112233")).toBe("+37499112233");
  });

  it("returns null for empty input", () => {
    expect(normalizePhoneE164("")).toBeNull();
    expect(normalizePhoneE164(null)).toBeNull();
    expect(normalizePhoneE164(undefined)).toBeNull();
    expect(normalizePhoneE164("abc")).toBeNull();
  });
});

describe("link builders", () => {
  it("builds wa.me links with digits only", () => {
    expect(buildWhatsAppLink("099112233", "hi there")).toBe(
      "https://wa.me/37499112233?text=hi%20there"
    );
    expect(toWhatsAppDigits("+374 99 11 22 33")).toBe("37499112233");
  });

  it("builds sms: and tel: links from E.164", () => {
    expect(buildSmsLink("099112233", "hello")).toBe("sms:+37499112233?&body=hello");
    expect(buildTelLink("099112233")).toBe("tel:+37499112233");
  });

  it("returns null when the phone is missing", () => {
    expect(buildWhatsAppLink(null, "x")).toBeNull();
    expect(buildSmsLink(undefined, "x")).toBeNull();
    expect(buildTelLink("")).toBeNull();
  });
});

describe("formatPhoneDisplay", () => {
  it("groups Armenian numbers as +374 99 112 233", () => {
    expect(formatPhoneDisplay("+37499112233")).toBe("+374 99 112 233");
  });

  it("returns empty string for missing input", () => {
    expect(formatPhoneDisplay(null)).toBe("");
  });
});

describe("generateBookingCode", () => {
  it("matches the SB-YYYY-XXXXX format without ambiguous characters", () => {
    for (let i = 0; i < 50; i++) {
      const code = generateBookingCode();
      expect(code).toMatch(/^SB-\d{4}-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{5}$/);
    }
  });
});
