import { describe, it, expect } from "vitest";
import {
  FREE_FAVORITES_LIMIT,
  FREE_VEHICLES_LIMIT,
  canAddFavorite,
  canAddVehicle,
  isFavoriteLocked,
  canUseDoubleReminders,
} from "@/lib/premiumLimits";

describe("premiumLimits", () => {
  it("free tier allows one vehicle", () => {
    expect(canAddVehicle(false, 0)).toBe(true);
    expect(canAddVehicle(false, 1)).toBe(false);
    expect(canAddVehicle(true, 5)).toBe(true);
    expect(FREE_VEHICLES_LIMIT).toBe(1);
  });

  it("free tier caps favorites at 8", () => {
    expect(canAddFavorite(false, FREE_FAVORITES_LIMIT - 1)).toBe(true);
    expect(canAddFavorite(false, FREE_FAVORITES_LIMIT)).toBe(false);
    expect(canAddFavorite(true, 100)).toBe(true);
  });

  it("locks favorites beyond free limit by index", () => {
    expect(isFavoriteLocked(false, FREE_FAVORITES_LIMIT - 1)).toBe(false);
    expect(isFavoriteLocked(false, FREE_FAVORITES_LIMIT)).toBe(true);
    expect(isFavoriteLocked(true, 20)).toBe(false);
  });

  it("double reminders require premium", () => {
    expect(canUseDoubleReminders(false)).toBe(false);
    expect(canUseDoubleReminders(true)).toBe(true);
  });
});
