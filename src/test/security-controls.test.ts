import { describe, expect, it } from "vitest";
import {
  resolveUserIdFromCheckoutSession,
  resolveUserIdFromSubscription,
} from "../../api/_subscriptions.js";

describe("checkout user binding", () => {
  it("prefers metadata userId over client_reference_id", () => {
    const userId = resolveUserIdFromCheckoutSession({
      metadata: { userId: "user-a", shopgoUserId: "user-b" },
      client_reference_id: "user-c",
    } as any);
    expect(userId).toBe("user-a");
  });

  it("falls back to client_reference_id", () => {
    const userId = resolveUserIdFromCheckoutSession({
      metadata: {},
      client_reference_id: "user-c",
    } as any);
    expect(userId).toBe("user-c");
  });

  it("returns null when unbound", () => {
    expect(resolveUserIdFromCheckoutSession({ metadata: {} } as any)).toBeNull();
  });
});

describe("subscription user binding", () => {
  it("reads userId from subscription metadata", () => {
    const userId = resolveUserIdFromSubscription({
      metadata: { shopgoUserId: "user-123" },
    } as any);
    expect(userId).toBe("user-123");
  });
});
