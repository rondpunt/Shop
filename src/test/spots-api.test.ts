import { describe, expect, it, vi, afterEach } from "vitest";
import { buildSpotsResponse, isAllowedSpotId } from "../../api/_spots.js";

describe("isAllowedSpotId", () => {
  it("accepts parko and shopgo prefixed ids", () => {
    expect(isAllowedSpotId("parko:kortrijk-grote-markt")).toBe(true);
    expect(isAllowedSpotId("shopgo:grote-markt")).toBe(true);
  });

  it("rejects raw client ids without prefix", () => {
    expect(isAllowedSpotId("grote-markt")).toBe(false);
    expect(isAllowedSpotId("")).toBe(false);
  });
});

describe("buildSpotsResponse", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns mock spots when Parko is unavailable", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: false,
        status: 502,
      }))
    );

    const payload = await buildSpotsResponse();
    expect(payload.stale).toBe(true);
    expect(payload.spots.length).toBeGreaterThan(0);
    expect(payload.spots[0]).toMatchObject({
      id: expect.stringMatching(/^shopgo:/),
      label: expect.any(String),
      status: "unknown",
      updatedAt: expect.any(String),
    });
  });

  it("maps Parko zones to spot DTOs", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => [
          {
            municipality: "Kortrijk",
            name: "Grote Markt",
            latitude: 50.8275,
            longitude: 3.2647,
            sensors: [
              { parkingBay: "1", latitude: 50.8275, longitude: 3.2647, state: "free" },
              { parkingBay: "2", latitude: 50.8276, longitude: 3.2648, state: "occupied" },
            ],
          },
        ],
      }))
    );

    const payload = await buildSpotsResponse();
    expect(payload.stale).toBe(false);
    expect(payload.spots).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "parko:Kortrijk-grote-markt",
          label: "Grote Markt",
          status: "free",
        }),
      ])
    );
  });
});
