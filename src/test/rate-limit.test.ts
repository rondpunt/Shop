import { describe, expect, it } from "vitest";
import { getClientIp } from "../../api/_rateLimit.js";

describe("getClientIp", () => {
  it("reads the first x-forwarded-for hop", () => {
    expect(
      getClientIp({
        headers: { "x-forwarded-for": "203.0.113.10, 70.41.3.18" },
      }),
    ).toBe("203.0.113.10");
  });

  it("returns null when IP cannot be determined", () => {
    expect(getClientIp({ headers: {} })).toBeNull();
  });
});
