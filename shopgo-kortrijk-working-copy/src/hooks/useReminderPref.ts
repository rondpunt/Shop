import { useEffect, useState } from "react";
import { prefsStore, type ReminderPrefs } from "@/lib/preferences";

export const useReminderPref = () => {
  const [prefs, setPrefs] = useState<ReminderPrefs>(() => prefsStore.get());

  useEffect(() => {
    const sync = () => setPrefs(prefsStore.get());
    window.addEventListener("shopgo:prefs", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("shopgo:prefs", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const setRemindBefore = (min: number) => {
    setPrefs(prefsStore.set({ remindBeforeMin: min }));
  };
  
  const setAlarmTone = (tone: "soft" | "classic" | "urgent") => {
    setPrefs(prefsStore.set({ alarmTone: tone }));
  };

  return { prefs, setRemindBefore, setAlarmTone };
};
