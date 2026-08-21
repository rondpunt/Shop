/**
 * Cross-platform haptics helper.
 * - Native (Capacitor): @capacitor/haptics for crisp Impact / Notification feedback.
 * - Web (PWA / browser): falls back to navigator.vibrate when available.
 * - Otherwise: no-op (silently ignores). Never throws.
 *
 * Plugins are imported dynamically so the web bundle does not require the
 * native plugin to be present at runtime.
 */

type ImpactStyle = "Light" | "Medium" | "Heavy";
type NotifType = "SUCCESS" | "WARNING" | "ERROR";

let nativeAvailable: boolean | null = null;
let hapticsModule: any = null;

const detectNative = async (): Promise<boolean> => {
  if (nativeAvailable !== null) return nativeAvailable;
  try {
    const cap = (window as any)?.Capacitor;
    const isNative = !!cap?.isNativePlatform?.();
    if (!isNative) {
      nativeAvailable = false;
      return false;
    }
    hapticsModule = await import("@capacitor/haptics");
    nativeAvailable = true;
    return true;
  } catch {
    nativeAvailable = false;
    return false;
  }
};

const webVibrate = (pattern: number | number[]) => {
  try {
    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
      navigator.vibrate(pattern);
    }
  } catch {
    /* ignore */
  }
};

const impact = async (style: ImpactStyle, fallback: number | number[]) => {
  if (await detectNative()) {
    try {
      await hapticsModule.Haptics.impact({ style: hapticsModule.ImpactStyle[style] });
      return;
    } catch {
      /* fallthrough */
    }
  }
  webVibrate(fallback);
};

const notify = async (type: NotifType, fallback: number | number[]) => {
  if (await detectNative()) {
    try {
      await hapticsModule.Haptics.notification({
        type: hapticsModule.NotificationType[type],
      });
      return;
    } catch {
      /* fallthrough */
    }
  }
  webVibrate(fallback);
};

/** Light tap — for buttons, tab-bar, list items. */
export const tap = () => impact("Light", 8);

/** Medium tap — for primary actions. */
export const mediumTap = () => impact("Medium", 14);

/** Success — for confirmations like timer started, trial activated. */
export const success = () => notify("SUCCESS", [10, 40, 10]);

/** Warning — for paywall blocks, timer almost over. */
export const warning = () => notify("WARNING", [20, 60, 20]);
