/**
 * Soft usage tracking only — no hard paywall.
 * Map, timer and core parking flows stay available for guests and free users.
 */
export const useAppUsage = () => {
  return { usageCount: 0, isBlocked: false };
};
