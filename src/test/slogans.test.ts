import { describe, it, expect } from "vitest";
import { pickSlogan } from "../lib/slogans";

describe("pickSlogan", () => {
  it("should return a deterministic slogan for each state", () => {
    const states = ["near", "mid", "far", "none", "noLoc", "active"] as const;

    states.forEach((state) => {
      const slogan = pickSlogan(state);
      expect(slogan).toBeTypeOf("string");
      expect(slogan.length).toBeGreaterThan(0);
    });
  });

  it("should be stable when called repeatedly within the same state on the same day", () => {
    const firstCall = pickSlogan("near");
    const secondCall = pickSlogan("near");
    expect(firstCall).toBe(secondCall);
  });
});
