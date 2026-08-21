import { Capacitor, registerPlugin } from "@capacitor/core";

export interface WidgetTimerPlugin {
  startTimer(options: { endsAt: string; address: string }): Promise<{ success: boolean }>;
  stopTimer(): Promise<{ success: boolean }>;
}

const WidgetTimer = registerPlugin<WidgetTimerPlugin>("WidgetTimer");

export default WidgetTimer;

/**
 * Triggers an update of the native Android Homescreen Widget with current session details.
 */
export const updateNativeWidget = async (endsAt: string | null, address: string | null) => {
  if (!Capacitor.isNativePlatform()) return;

  try {
    if (endsAt) {
      await WidgetTimer.startTimer({
        endsAt,
        address: address || "Shop & Go Kortrijk",
      });
      console.log("[Widget] Successfully synced active session to native widget.");
    } else {
      await WidgetTimer.stopTimer();
      console.log("[Widget] Successfully cleared active session from native widget.");
    }
  } catch (error) {
    console.debug("[Widget] Native widget sync failed:", error);
  }
};
