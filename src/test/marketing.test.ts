import { describe, it, expect, beforeEach } from "vitest";
import { Logger } from "../lib/logger";
import { MarketingSuite } from "../lib/marketing";

describe("Logger and Marketing Suite integration tests", () => {
  beforeEach(() => {
    Logger.clearLogs();
  });

  it("should correctly store and retrieve application logs", () => {
    Logger.info("TEST", "Hello logging system!");
    const logs = Logger.getLogs();
    const testLog = logs.find((l) => l.category === "TEST");
    
    expect(testLog).toBeDefined();
    expect(testLog?.message).toBe("Hello logging system!");
    expect(testLog?.level).toBe("INFO");
  });

  it("should capture and process marketing campaign parameters correctly", () => {
    const searchParams = new URLSearchParams("?utm_source=facebook&utm_campaign=kortrijk_free&promo=kortrijk30");
    MarketingSuite.captureAttribution(searchParams);

    const attribution = MarketingSuite.getAttribution();
    expect(attribution).not.toBeNull();
    expect(attribution?.utmSource).toBe("facebook");
    expect(attribution?.utmCampaign).toBe("kortrijk_free");
    expect(attribution?.promoCode).toBe("KORTRIJK30");
  });

  it("should accurately validate valid and invalid promo codes", () => {
    const validPromo = MarketingSuite.validatePromoCode("KORTRIJK30");
    expect(validPromo).not.toBeNull();
    expect(validPromo?.code).toBe("KORTRIJK30");
    expect(validPromo?.freeTrialDays).toBe(30);

    const invalidPromo = MarketingSuite.validatePromoCode("FAKE123");
    expect(invalidPromo).toBeNull();
  });

  it("should cleanly retrieve A/B testing headline variations", () => {
    const variation = MarketingSuite.getABTestVariation();
    expect(["standard", "conversational", "urgent"]).toContain(variation);

    MarketingSuite.setABTestVariation("urgent");
    expect(MarketingSuite.getABTestVariation()).toBe("urgent");
  });
});
