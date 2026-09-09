import { describe, it, expect, vi, beforeEach } from "vitest";
import { zoneStatus, statusColor, buildPinSvg, KORTRIJK_CENTER } from "@/lib/mapShared";
import type { ParkoZone } from "@/hooks/useParkoLive";

const sampleZone = (overrides: Partial<ParkoZone> = {}): ParkoZone => ({
  id: "z1",
  name: "Teststraat",
  municipality: "Kortrijk",
  lat: KORTRIJK_CENTER.lat,
  lng: KORTRIJK_CENTER.lng,
  totalBays: 10,
  freeBays: 5,
  occupiedBays: 5,
  unknownBays: 0,
  bays: [],
  ...overrides,
});

describe("mapShared", () => {
  it("classifies zone availability for markers", () => {
    expect(zoneStatus(sampleZone({ freeBays: 8 }))).toBe("free");
    expect(zoneStatus(sampleZone({ freeBays: 2 }))).toBe("warn");
    expect(zoneStatus(sampleZone({ freeBays: 0 }))).toBe("full");
  });

  it("assigns marker colors by status", () => {
    expect(statusColor("free")).toBe("#00C896");
    expect(statusColor("full")).toBe("#FF4757");
  });

  it("builds pin SVG with free count label", () => {
    const svg = buildPinSvg(sampleZone({ freeBays: 12 }), false);
    expect(svg).toContain("12");
    expect(svg).toContain("#00C896");
  });
});

describe("googleMaps fallback decision", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("isGoogleMapsConfigured returns false without env keys", async () => {
    vi.stubEnv("VITE_GOOGLE_MAPS_PLATFORM_KEY", "");
    vi.stubEnv("VITE_GOOGLE_MAPS_API_KEY", "");
    vi.stubEnv("VITE_SUPABASE_PROJECT_ID", "");
    const { isGoogleMapsConfigured } = await import("@/lib/googleMaps");
    await expect(isGoogleMapsConfigured()).resolves.toBe(false);
  });

  it("isGoogleMapsConfigured returns true when platform key is set", async () => {
    vi.stubEnv("VITE_GOOGLE_MAPS_PLATFORM_KEY", "AIzaSyTestKey1234567890");
    const { isGoogleMapsConfigured } = await import("@/lib/googleMaps");
    await expect(isGoogleMapsConfigured()).resolves.toBe(true);
  });
});

describe("stripe payments config", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("hasStripeToken is false without publishable key", async () => {
    vi.stubEnv("VITE_PAYMENTS_CLIENT_TOKEN", "");
    const { hasStripeToken, getPaymentsUnavailableMessage } = await import("@/lib/stripe");
    expect(hasStripeToken()).toBe(false);
    expect(getPaymentsUnavailableMessage()).toContain("niet geconfigureerd");
  });

  it("hasStripeToken is true with pk_test key", async () => {
    vi.stubEnv("VITE_PAYMENTS_CLIENT_TOKEN", "pk_test_abc");
    const { hasStripeToken } = await import("@/lib/stripe");
    expect(hasStripeToken()).toBe(true);
  });
});
