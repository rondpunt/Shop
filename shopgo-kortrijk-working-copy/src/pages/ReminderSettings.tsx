import { useState } from "react";
import { Bell, Check } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { useReminderPref } from "@/hooks/useReminderPref";
import { ReminderDial } from "@/components/ReminderDial";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const QUICK = [2, 4, 5, 7, 10];

const ReminderSettings = () => {
  const { prefs, setRemindBefore, setAlarmTone } = useReminderPref();
  const [pendingValue, setPendingValue] = useState(prefs.remindBeforeMin);
  const [pendingTone, setPendingTone] = useState(prefs.alarmTone || "classic");

  const save = () => {
    setRemindBefore(pendingValue);
    setAlarmTone(pendingTone);
    toast.success(`Waarschuwing op ${pendingValue} min vooraf opgeslagen`);
  };

  return (
    <div className="app-page-panel pb-32">
      <PageHeader title="Standaard waarschuwing" subtitle="Wanneer wil je gewaarschuwd worden?" />

      <div className="card-soft flex flex-col items-center px-6 py-6">
        <ReminderDial value={pendingValue} onChange={setPendingValue} />
      </div>

      <div className="mt-4 flex flex-wrap justify-center gap-2">
        {QUICK.map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setPendingValue(m)}
            className={cn(
              "rounded-full border-2 px-4 py-1.5 text-sm font-bold transition-base",
              pendingValue === m
                ? "border-primary bg-primary text-primary-foreground"
                : "border-primary text-primary hover:bg-primary/5"
            )}
          >
            {m} min
          </button>
        ))}
      </div>

      <div className="mt-8">
        <h3 className="mb-3 px-2 text-[12px] font-bold uppercase tracking-wider text-muted-foreground">
          Alarmtoon
        </h3>
        <div className="card-soft overflow-hidden divide-y divide-border/40">
          {(["soft", "classic", "urgent"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setPendingTone(t)}
              className="flex w-full items-center justify-between px-4 py-4 hover:bg-muted/50 transition-colors"
            >
              <span className="font-semibold capitalize text-foreground">{t === "soft" ? "Zacht" : t === "classic" ? "Klassiek" : "Dringend"}</span>
              <div
                className={cn(
                  "flex h-5 w-5 items-center justify-center rounded-full border-2",
                  pendingTone === t ? "border-primary" : "border-muted-foreground/30"
                )}
              >
                {pendingTone === t && <div className="h-2.5 w-2.5 rounded-full bg-primary" />}
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="card-soft mt-5 flex items-center gap-3 p-4">
        <span className="mint-icon-tile grid h-9 w-9 shrink-0 place-items-center rounded-full">
          <Bell className="h-4 w-4" />
        </span>
        <p className="text-[13px] text-foreground">
          Waarschuwing ingesteld op <strong>{pendingValue} min</strong> voor het einde van je parkeertijd.
        </p>
      </div>

      <button type="button" onClick={save} className="btn-pill-primary mt-5 w-full">
        <Check className="h-4 w-4" /> Vastzetten als standaard
      </button>

      <p className="mt-3 px-2 text-center text-[11px] italic text-muted-foreground">
        Deze instelling wordt onthouden op dit toestel én gesynced met je account.
      </p>
    </div>
  );
};

export default ReminderSettings;
