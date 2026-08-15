// User preferences for Shop&Go reminders.
// Local-first: works offline; promoted to user metadata on Sync page.

const KEY = "shopgo.prefs.v1";

export type AlarmTone = "soft" | "classic" | "urgent";

export type ReminderPrefs = {
  // Minutes BEFORE the 30-min mark when the user wants to be alerted.
  // E.g. 10 → user gets reminded 10 minutes before time runs out.
  remindBeforeMin: number;
  alarmTone: AlarmTone;
};

// 4411-style: every minute selectable from 1 to 25.
export const REMINDER_MIN = 1;
export const REMINDER_MAX = 25;
export const REMINDER_OPTIONS = Array.from(
  { length: REMINDER_MAX - REMINDER_MIN + 1 },
  (_, i) => i + REMINDER_MIN
);

const DEFAULTS: ReminderPrefs = {
  remindBeforeMin: 4,
  alarmTone: "classic",
};

const safeRead = (): ReminderPrefs => {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw);
    const v = Number(parsed?.remindBeforeMin);
    const validMin = (!Number.isFinite(v) || v < 0 || v > 29) ? DEFAULTS.remindBeforeMin : Math.round(v);
    
    let tone: AlarmTone = "classic";
    if (parsed?.alarmTone === "soft" || parsed?.alarmTone === "classic" || parsed?.alarmTone === "urgent") {
      tone = parsed.alarmTone as AlarmTone;
    }
    
    return { remindBeforeMin: validMin, alarmTone: tone };
  } catch {
    return DEFAULTS;
  }
};

export const prefsStore = {
  get(): ReminderPrefs {
    return safeRead();
  },
  set(patch: Partial<ReminderPrefs>) {
    const next = { ...safeRead(), ...patch };
    try {
      window.localStorage.setItem(KEY, JSON.stringify(next));
      window.dispatchEvent(new CustomEvent("shopgo:prefs"));
    } catch {
      /* ignore */
    }
    return next;
  },
};
