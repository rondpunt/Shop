import { describe, it, expect } from "vitest";
import {
  PREMIUM_PRICING,
  PREMIUM_TAGLINE,
  formatPlanPrice,
  yearlySavingsPercent,
  stripeLookupKeyForPlan,
} from "@/lib/pricing";

describe("pricing", () => {
  it("shows updated monthly and yearly prices", () => {
    expect(PREMIUM_PRICING.monthly.label).toBe("€3,99");
    expect(PREMIUM_PRICING.yearly.label).toBe("€29,99");
    expect(PREMIUM_PRICING.monthly.amount).toBe(3.99);
    expect(PREMIUM_PRICING.yearly.amount).toBe(29.99);
  });

  it("formats plan price with suffix", () => {
    expect(formatPlanPrice("monthly")).toBe("€3,99/ maand");
    expect(formatPlanPrice("yearly")).toBe("€29,99/ jaar");
  });

  it("computes yearly savings vs 12× monthly", () => {
    expect(yearlySavingsPercent()).toBeGreaterThan(0);
  });

  it("maps plans to Stripe lookup keys", () => {
    expect(stripeLookupKeyForPlan("monthly")).toBe("premium_monthly");
    expect(stripeLookupKeyForPlan("yearly")).toBe("premium_yearly");
  });

  it("includes conversion tagline", () => {
    expect(PREMIUM_TAGLINE.toLowerCase()).toContain("goedkoper dan één boete");
  });
});
