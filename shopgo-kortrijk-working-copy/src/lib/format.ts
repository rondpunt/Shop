export const formatMMSS = (seconds: number): string => {
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m.toString().padStart(2, "0")}:${r.toString().padStart(2, "0")}`;
};

export const SHOPGO_DURATION_MIN = 30;
export const SHOPGO_DURATION_SEC = SHOPGO_DURATION_MIN * 60;

export type TimerState = "normal" | "warning-10" | "warning-5" | "danger" | "expired";

export const getTimerState = (remainingSec: number): TimerState => {
  if (remainingSec <= 0) return "expired";
  if (remainingSec <= 120) return "danger";
  if (remainingSec <= 300) return "warning-5";
  if (remainingSec <= 600) return "warning-10";
  return "normal";
};
