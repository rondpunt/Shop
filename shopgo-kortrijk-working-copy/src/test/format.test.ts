import { describe, it, expect } from "vitest";
import { formatMMSS, getTimerState } from "../lib/format";

describe("formatMMSS", () => {
  it("should format seconds into MM:SS format with padding", () => {
    expect(formatMMSS(0)).toBe("00:00");
    expect(formatMMSS(5)).toBe("00:05");
    expect(formatMMSS(60)).toBe("01:00");
    expect(formatMMSS(75)).toBe("01:15");
    expect(formatMMSS(3599)).toBe("59:59");
  });

  it("should handle negative seconds by treating them as zero", () => {
    expect(formatMMSS(-10)).toBe("00:00");
  });
});

describe("getTimerState", () => {
  it("should return correct state based on remaining seconds", () => {
    // normal state (more than 10 minutes)
    expect(getTimerState(601)).toBe("normal");
    
    // warning-10 state (between 5 and 10 minutes)
    expect(getTimerState(600)).toBe("warning-10");
    expect(getTimerState(301)).toBe("warning-10");
    
    // warning-5 state (between 2 and 5 minutes)
    expect(getTimerState(300)).toBe("warning-5");
    expect(getTimerState(121)).toBe("warning-5");
    
    // danger state (2 minutes or less)
    expect(getTimerState(120)).toBe("danger");
    expect(getTimerState(1)).toBe("danger");
    
    // expired state (0 seconds or less)
    expect(getTimerState(0)).toBe("expired");
    expect(getTimerState(-5)).toBe("expired");
  });
});
