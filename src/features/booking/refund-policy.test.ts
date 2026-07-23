import { describe, it, expect } from "vitest";
import {
  refundFraction,
  refundAmountMinor,
} from "../../../supabase/functions/_shared/refund-policy";

const startsAt = new Date("2026-08-01T18:00:00Z");
const hoursBefore = (h: number) => new Date(startsAt.getTime() - h * 3_600_000);

describe("refundFraction", () => {
  it("owner cancellations always refund 100%", () => {
    expect(refundFraction({ refund_type: "none" }, startsAt, hoursBefore(1), "owner")).toBe(1);
    expect(refundFraction(null, startsAt, hoursBefore(0.1), "owner")).toBe(1);
  });

  it("full refund outside the cutoff window", () => {
    const policy = { cancellation_hours: 24, refund_type: "full" };
    expect(refundFraction(policy, startsAt, hoursBefore(25), "player")).toBe(1);
    expect(refundFraction(policy, startsAt, hoursBefore(24), "player")).toBe(1);
  });

  it("no refund inside the cutoff for full policies", () => {
    const policy = { cancellation_hours: 24, refund_type: "full" };
    expect(refundFraction(policy, startsAt, hoursBefore(23), "player")).toBe(0);
    expect(refundFraction(policy, startsAt, hoursBefore(1), "player")).toBe(0);
  });

  it("half refund inside the cutoff for partial policies", () => {
    const policy = { cancellation_hours: 24, refund_type: "partial" };
    expect(refundFraction(policy, startsAt, hoursBefore(12), "player")).toBe(0.5);
    expect(refundFraction(policy, startsAt, hoursBefore(48), "player")).toBe(1);
  });

  it("never refunds after the start time or for no-refund policies", () => {
    expect(refundFraction({ refund_type: "none" }, startsAt, hoursBefore(100), "player")).toBe(0);
    expect(refundFraction({ refund_type: "full" }, startsAt, hoursBefore(-1), "player")).toBe(0);
  });

  it("defaults to flexible/24h/full when the snapshot is missing", () => {
    expect(refundFraction(null, startsAt, hoursBefore(30), "player")).toBe(1);
    expect(refundFraction(undefined, startsAt, hoursBefore(2), "player")).toBe(0);
  });
});

describe("refundAmountMinor", () => {
  it("rounds to whole minor units", () => {
    const policy = { cancellation_hours: 24, refund_type: "partial" };
    expect(refundAmountMinor(1_050_00, policy, startsAt, hoursBefore(2), "player")).toBe(52_500);
    expect(refundAmountMinor(1_050_00, policy, startsAt, hoursBefore(48), "player")).toBe(105_000);
    expect(refundAmountMinor(999, policy, startsAt, hoursBefore(2), "player")).toBe(500);
  });
});
