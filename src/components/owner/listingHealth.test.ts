import { describe, it, expect } from "vitest";
import { scoreVenue } from "./listingHealth";
import type { Venue } from "@/hooks/useVenues";

const base = (over: Partial<Venue> = {}): Venue =>
  ({
    id: "v1", owner_id: "o1", name: "Ararat Arena", description: null, address: "x",
    city: "Yerevan", zip_code: null, image_url: null, sports: [], price_per_hour: 12000,
    is_indoor: false, amenities: [], is_active: true, rating: 0, review_count: 0,
    created_at: "", updated_at: "", ...over,
  }) as Venue;

const labels = (v: Venue, rr = 100) => scoreVenue(v, rr).issues.map((i) => i.label);

describe("scoreVenue", () => {
  it("never tells an owner to enable WhatsApp or phone contact", () => {
    // Players book and pay in the app; the WhatsApp handoff was removed in
    // Phase 2. Advice pointing owners back at it works against the product.
    const all = labels(base()).join(" ");
    expect(all).not.toMatch(/whatsapp/i);
    expect(all).not.toMatch(/phone/i);
  });

  it("flags a hidden listing, which is what actually stops bookings now", () => {
    expect(labels(base({ is_active: false }))).toContain(
      "Listing is hidden — make it active to take bookings",
    );
    expect(labels(base({ is_active: true }))).not.toContain(
      "Listing is hidden — make it active to take bookings",
    );
  });

  it("does not penalise a venue for review_count, which nothing maintains", () => {
    // The column is DEFAULT 0 with no writer. Scoring it docked every owner a
    // fixed share of the total and told them "No reviews yet" regardless.
    const perfect = base({
      image_url: "x", description: "d".repeat(80), location_confirmed: true,
      sports: ["Football"], amenities: ["a", "b", "c"], is_active: true,
    });
    expect(scoreVenue(perfect, 100).score).toBe(100);
    expect(labels(perfect).join(" ")).not.toMatch(/no reviews yet/i);
  });

  it("still scores reputation once a venue genuinely has reviews", () => {
    const withFew = base({
      image_url: "x", description: "d".repeat(80), location_confirmed: true,
      sports: ["Football"], amenities: ["a", "b", "c"], review_count: 2,
    });
    expect(scoreVenue(withFew, 100).score).toBeLessThan(100);
    expect(labels(withFew)).toContain("Get more reviews (5+ unlocks full credit)");

    const withMany = base({ ...withFew, review_count: 9 } as Partial<Venue>);
    expect(scoreVenue(withMany, 100).score).toBe(100);
  });

  it("gives partial credit rather than nothing for a short description", () => {
    const short = scoreVenue(base({ description: "tiny" }), 100);
    const none = scoreVenue(base({ description: null }), 100);
    expect(short.score).toBeGreaterThan(none.score);
    expect(short.issues.map((i) => i.label)).toContain("Expand your description (80+ chars)");
  });

  it("scales the response-rate contribution rather than treating it as pass/fail", () => {
    const v = base({ image_url: "x" });
    expect(scoreVenue(v, 100).score).toBeGreaterThan(scoreVenue(v, 0).score);
    expect(labels(v, 40)).toContain("Reply faster — 40% response rate");
    expect(labels(v, 90)).not.toContain("Reply faster — 90% response rate");
  });
});
