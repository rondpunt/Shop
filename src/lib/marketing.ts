// Marketing, Attribution & A/B Testing Suite for Shop&Go Kortrijk
import { Logger } from "./logger";

export interface MarketingAttribution {
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  referrerId?: string;
  promoCode?: string;
  firstVisitTime: string;
  lastUpdateTime: string;
}

export interface PromoCodeDetails {
  code: string;
  description: string;
  discountPercent: number;
  freeTrialDays: number;
  validUntil: string;
}

export type ABTestVariation = "standard" | "conversational" | "urgent";

const ATTRIBUTION_KEY = "shopgo_marketing_attribution";
const AB_TEST_KEY = "shopgo_ab_test_headline";

// Supported promo codes
export const PROMO_CODES: Record<string, PromoCodeDetails> = {
  KORTRIJK30: {
    code: "KORTRIJK30",
    description: "30 dagen gratis onbeperkt Premium parkeerassistentie",
    discountPercent: 100,
    freeTrialDays: 30,
    validUntil: "2027-12-31",
  },
  MINT50: {
    code: "MINT50",
    description: "50% korting op uw eerste jaarabonnement",
    discountPercent: 50,
    freeTrialDays: 0,
    validUntil: "2026-12-31",
  },
  ILOVEPARKING: {
    code: "ILOVEPARKING",
    description: "VIP Toegang: 14 dagen gratis proefperiode",
    discountPercent: 100,
    freeTrialDays: 14,
    validUntil: "2026-12-31",
  },
};

export class MarketingSuite {
  /**
   * Parse query parameters from current URL and store them as campaign attribution
   */
  static captureAttribution(searchParams: URLSearchParams): void {
    try {
      const utmSource = searchParams.get("utm_source") || undefined;
      const utmMedium = searchParams.get("utm_medium") || undefined;
      const utmCampaign = searchParams.get("utm_campaign") || undefined;
      const referrerId = searchParams.get("ref") || undefined;
      const promoCode = searchParams.get("promo")?.toUpperCase() || undefined;

      if (!utmSource && !utmMedium && !utmCampaign && !referrerId && !promoCode) {
        return; // Nothing to attribute
      }

      const existingStr = localStorage.getItem(ATTRIBUTION_KEY);
      let attribution: MarketingAttribution;

      if (existingStr) {
        attribution = JSON.parse(existingStr);
        attribution.lastUpdateTime = new Date().toISOString();
        
        // Merge attributes if they don't already exist
        if (utmSource) attribution.utmSource = utmSource;
        if (utmMedium) attribution.utmMedium = utmMedium;
        if (utmCampaign) attribution.utmCampaign = utmCampaign;
        if (referrerId) attribution.referrerId = referrerId;
        if (promoCode) attribution.promoCode = promoCode;
      } else {
        attribution = {
          utmSource,
          utmMedium,
          utmCampaign,
          referrerId,
          promoCode,
          firstVisitTime: new Date().toISOString(),
          lastUpdateTime: new Date().toISOString(),
        };
      }

      localStorage.setItem(ATTRIBUTION_KEY, JSON.stringify(attribution));
      
      Logger.marketing("CAMPAIGN", `Attribution registered successfully`, {
        utm_source: utmSource,
        utm_campaign: utmCampaign,
        referrer_id: referrerId,
        promo_code: promoCode,
      });
    } catch (e) {
      Logger.error("CAMPAIGN", "Failed to capture marketing attribution", { error: String(e) });
    }
  }

  static getAttribution(): MarketingAttribution | null {
    try {
      const stored = localStorage.getItem(ATTRIBUTION_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }

  static validatePromoCode(code: string): PromoCodeDetails | null {
    const normalized = code.trim().toUpperCase();
    const promo = PROMO_CODES[normalized];
    if (promo) {
      Logger.marketing("CONVERSION", `Promo code successfully validated: ${normalized}`);
      return promo;
    }
    Logger.warn("CONVERSION", `Failed validation attempt for promo code: ${code}`);
    return null;
  }

  /**
   * Tracks custom marketing conversion events
   */
  static trackEvent(eventName: string, params?: Record<string, any>): void {
    Logger.marketing("EVENT", `Event: ${eventName}`, params);
    
    // Maintain local tally of conversions/impressions for standard analytics views
    try {
      const statsKey = "shopgo_marketing_events_count";
      const stats = JSON.parse(localStorage.getItem(statsKey) || "{}");
      stats[eventName] = (stats[eventName] || 0) + 1;
      localStorage.setItem(statsKey, JSON.stringify(stats));
    } catch (e) {
      console.error(e);
    }
  }

  static getEventCounts(): Record<string, number> {
    try {
      const statsKey = "shopgo_marketing_events_count";
      return JSON.parse(localStorage.getItem(statsKey) || "{}");
    } catch {
      return {};
    }
  }

  /**
   * Get active A/B test variation
   */
  static getABTestVariation(): ABTestVariation {
    try {
      let variant = localStorage.getItem(AB_TEST_KEY) as ABTestVariation;
      if (!variant || !["standard", "conversational", "urgent"].includes(variant)) {
        // Randomly assign one and save
        const variations: ABTestVariation[] = ["standard", "conversational", "urgent"];
        variant = variations[Math.floor(Math.random() * variations.length)];
        localStorage.setItem(AB_TEST_KEY, variant);
        Logger.marketing("A/B_TEST", `Assigned user to initial test variation: ${variant}`);
      }
      return variant;
    } catch {
      return "standard";
    }
  }

  static setABTestVariation(variation: ABTestVariation): void {
    try {
      localStorage.setItem(AB_TEST_KEY, variation);
      Logger.marketing("A/B_TEST", `User forced to test variation: ${variation}`);
    } catch (e) {
      console.error(e);
    }
  }
}
