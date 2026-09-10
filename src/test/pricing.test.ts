import { describe, expect, it } from "vitest";
import {
  PREMIUM_MONTHLY_EUR,
  PREMIUM_YEARLY_EUR,
  PREMIUM_TAGLINE,
  formatPremiumPrice,
  premiumYearlySavingsPercent,
} from "@/lib/pricing";

describe("pricing", () => {
  it("uses the requested EUR amounts", () => {
    expect(PREMIUM_MONTHLY_EUR).toBe(3.99);
    expect(PREMIUM_YEARLY_EUR).toBe(29.99);
  });

  it("formats prices in Dutch locale", () => {
    expect(formatPremiumPrice(3.99)).toMatch(/3,99/);
    expect(formatPremiumPrice(29.99)).toMatch(/29,99/);
  });

  it("computes yearly savings vs 12 monthly payments", () => {
    expect(premiumYearlySavingsPercent()).toBe(37);
  });

  it("has the marketing tagline", () => {
    expect(PREMIUM_TAGLINE).toBe("Goedkoper dan één boete");
  });
});
