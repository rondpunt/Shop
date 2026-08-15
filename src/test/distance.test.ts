import { describe, it, expect } from "vitest";
import { distanceKm } from "../data/shopgo-spots";

describe("distanceKm", () => {
  it("should return 0 when computing distance between the exact same point", () => {
    const lat = 50.8275;
    const lng = 3.2647;
    expect(distanceKm(lat, lng, lat, lng)).toBe(0);
  });

  it("should calculate correct approximate distance between two locations", () => {
    // Distance from Grote Markt (50.8275, 3.2647) to Lange Steenstraat (50.8255, 3.2630)
    const distance = distanceKm(50.8275, 3.2647, 50.8255, 3.2630);
    
    // The straight distance is roughly 250 meters (0.25 km)
    expect(distance).toBeGreaterThan(0.1);
    expect(distance).toBeLessThan(0.4);
  });
});
