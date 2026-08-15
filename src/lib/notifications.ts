// Unified notification scheduler.
// - Native (Capacitor APK): uses @capacitor/local-notifications -> OS-level alarms,
//   work with screen off / app killed / phone locked.
// - Web (PWA / browser): falls back to setTimeout + Notification API. Reliable
//   while the PWA is in memory; Android Chrome keeps installed PWAs alive a long time.

import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";
import { prefsStore } from "./preferences";

const isNative = Capacitor.isNativePlatform();

function playAlarmTone() {
  try {
    const tone = prefsStore.get().alarmTone || "classic";
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const playBeep = (freq: number, startTime: number, dur: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = tone === "soft" ? "sine" : tone === "urgent" ? "sawtooth" : "square";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.3, startTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + dur);
      osc.start(startTime);
      osc.stop(startTime + dur);
    };
    const t = ctx.currentTime;
    if (tone === "soft") {
      playBeep(440, t, 0.5);
    } else if (tone === "classic") {
      playBeep(600, t, 0.2);
      playBeep(600, t + 0.3, 0.2);
    } else {
      for (let i = 0; i < 5; i++) {
        playBeep(800 + (i%2)*200, t + i*0.15, 0.1);
      }
    }
  } catch(e) {
    // ignore
  }
}


// Stable IDs per session so we can cancel them later.
const idsForSession = (sessionKey: number) => ({
  warn7:   sessionKey * 10 + 1,
  warn4:   sessionKey * 10 + 2,
  warn2:   sessionKey * 10 + 3,
  end:     sessionKey * 10 + 4,
  ongoing: sessionKey * 10 + 9,
});

const sessionKeyFromId = (sessionId: string): number => {
  // Fold uuid into a positive 31-bit int -> stable across reloads.
  let h = 0;
  for (let i = 0; i < sessionId.length; i++) {
    h = (h * 31 + sessionId.charCodeAt(i)) | 0;
  }
  return Math.abs(h) % 100_000_000;
};

// ---------- Permission ----------

export async function ensureNotificationPermission(): Promise<boolean> {
  if (isNative) {
    const status = await LocalNotifications.checkPermissions();
    if (status.display === "granted") return true;
    const req = await LocalNotifications.requestPermissions();
    return req.display === "granted";
  }
  // Web
  if (!("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  const res = await Notification.requestPermission();
  return res === "granted";
}

// ---------- Scheduling ----------

export type ScheduleOpts = {
  sessionId: string;
  endsAt: Date;            // 30-min mark
  remindBeforeMin: number; // user-chosen primary reminder (1..25)
  locationLabel?: string;
};

const webTimers = new Map<string, number[]>();

export async function scheduleSessionAlarms(opts: ScheduleOpts): Promise<void> {
  await cancelSessionAlarms(opts.sessionId);

  const now = Date.now();
  const endTs = opts.endsAt.getTime();
  const place = opts.locationLabel ? ` bij ${opts.locationLabel}` : "";

  // Build the schedule. Always include the user's chosen primary reminder,
  // plus quick safety-net warnings at -2 min and the end itself.
  const items: { at: number; title: string; body: string; key: keyof ReturnType<typeof idsForSession> }[] = [];

  const primaryAt = endTs - opts.remindBeforeMin * 60_000;
  if (primaryAt > now + 1000) {
    items.push({
      at: primaryAt,
      title: `Nog ${opts.remindBeforeMin} min Shop&Go`,
      body: `Tijd om af te ronden${place}.`,
      key: "warn7",
    });
  }

  const twoAt = endTs - 2 * 60_000;
  if (twoAt > now + 1000 && opts.remindBeforeMin !== 2) {
    items.push({
      at: twoAt,
      title: "Nog 2 minuten!",
      body: `Ga nu naar je auto${place}.`,
      key: "warn2",
    });
  }

  if (endTs > now + 1000) {
    items.push({
      at: endTs,
      title: "Shop&Go tijd verlopen",
      body: `Je 30 minuten zijn voorbij${place}. Verplaats je auto.`,
      key: "end",
    });
  }

  if (items.length === 0) return;

  const sessionKey = sessionKeyFromId(opts.sessionId);
  const ids = idsForSession(sessionKey);

  if (isNative) {
    await LocalNotifications.schedule({
      notifications: items.map((it) => ({
        id: ids[it.key],
        title: it.title,
        body: it.body,
        schedule: { at: new Date(it.at), allowWhileIdle: true },
        smallIcon: "ic_stat_icon_config_sample",
        sound: undefined,
        extra: { sessionId: opts.sessionId },
      })),
    });
    return;
  }

  // Web fallback
  const timers: number[] = [];
  for (const it of items) {
    const delay = it.at - Date.now();
    if (delay <= 0) continue;
    const t = window.setTimeout(() => {
      try {
        if ("Notification" in window && Notification.permission === "granted") {
          const n = new Notification(it.title, {
            body: it.body,
            icon: "/app-icon-512.png",
            badge: "/app-icon-512.png",
            tag: `shopgo-${opts.sessionId}-${it.key}`,
            requireInteraction: it.key === "end" || it.key === "warn2",
          });
          n.onclick = () => {
            window.focus();
            n.close();
          };
        }
        if ("vibrate" in navigator) {
          navigator.vibrate(it.key === "end" ? [400, 150, 400, 150, 400] : [300, 120, 300]);
        }
        playAlarmTone();
      } catch {
        /* ignore */
      }
    }, delay);
    timers.push(t);
  }
  webTimers.set(opts.sessionId, timers);
}

// ---------- Ongoing "widget"-style timer notification ----------
//
// Toont een live aftellende notificatie die blijft staan terwijl de app
// geminimaliseerd of gesloten is. Op Android is dit een echte non-dismissable
// foreground-style notification met een chronometer; op iOS verschijnt hij
// in het notificatiecentrum tot sessie-einde. In de web-fallback updaten we
// de notificatie elke 30 sec zolang de tab leeft.

const webOngoing = new Map<string, { notif: Notification | null; interval: number }>();

const formatRemaining = (endTs: number): string => {
  const ms = Math.max(0, endTs - Date.now());
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
};

export async function showOngoingTimerNotification(opts: {
  sessionId: string;
  endsAt: Date;
  locationLabel?: string;
}): Promise<void> {
  const endTs = opts.endsAt.getTime();
  if (endTs <= Date.now() + 1000) return;

  const place = opts.locationLabel ? ` · ${opts.locationLabel}` : "";
  const sessionKey = sessionKeyFromId(opts.sessionId);
  const ids = idsForSession(sessionKey);

  if (isNative) {
    try {
      await LocalNotifications.schedule({
        notifications: [{
          id: ids.ongoing,
          title: `Shop&Go loopt${place}`,
          body: "Tik om de timer te openen",
          schedule: { at: new Date(Date.now() + 500), allowWhileIdle: true },
          smallIcon: "ic_stat_icon_config_sample",
          ongoing: true,
          autoCancel: false,
          extra: {
            sessionId: opts.sessionId,
            endsAt: opts.endsAt.toISOString(),
            chronometer: true,
            chronometerCountDown: true,
            "when": endTs,
            "usesChronometer": true,
          },
         
        }] as any,
      });
    } catch {
      /* ignore — niet alle Android-versies steunen elke optie */
    }
    return;
  }

  // Web fallback
  if (!("Notification" in window) || Notification.permission !== "granted") return;

  // Sluit eerdere ongoing-notificatie voor deze sessie
  const existing = webOngoing.get(opts.sessionId);
  if (existing) {
    try { existing.notif?.close(); } catch { /* ignore */ }
    clearInterval(existing.interval);
  }

  const make = () => {
    try {
      const n = new Notification(`Shop&Go · nog ${formatRemaining(endTs)}`, {
        body: `Eindigt om ${opts.endsAt.toLocaleTimeString("nl-BE", { hour: "2-digit", minute: "2-digit" })}${place}`,
        tag: `shopgo-ongoing-${opts.sessionId}`,
        requireInteraction: true,
        silent: true,
        icon: "/app-icon-512.png",
        badge: "/app-icon-512.png",
      });
      n.onclick = () => { window.focus(); };
      const slot = webOngoing.get(opts.sessionId);
      if (slot) slot.notif = n;
    } catch {
      /* ignore */
    }
  };

  make();
  const interval = window.setInterval(() => {
    if (Date.now() >= endTs) {
      const slot = webOngoing.get(opts.sessionId);
      if (slot) {
        try { slot.notif?.close(); } catch { /* ignore */ }
        clearInterval(slot.interval);
        webOngoing.delete(opts.sessionId);
      }
      return;
    }
    make();
  }, 30_000);

  webOngoing.set(opts.sessionId, { notif: null, interval });
}

export async function cancelSessionAlarms(sessionId: string): Promise<void> {
  if (isNative) {
    const sessionKey = sessionKeyFromId(sessionId);
    const ids = idsForSession(sessionKey);
    try {
      await LocalNotifications.cancel({
        notifications: Object.values(ids).map((id) => ({ id })),
      });
    } catch {
      /* ignore */
    }
    return;
  }
  const timers = webTimers.get(sessionId);
  if (timers) {
    timers.forEach((t) => clearTimeout(t));
    webTimers.delete(sessionId);
  }
  const ongoing = webOngoing.get(sessionId);
  if (ongoing) {
    try { ongoing.notif?.close(); } catch { /* ignore */ }
    clearInterval(ongoing.interval);
    webOngoing.delete(sessionId);
  }
}

export const isNativeNotifications = isNative;
