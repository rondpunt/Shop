import { useEffect, useState } from "react";
import { Loader2, Play, X } from "lucide-react";
import { useReminderPref } from "@/hooks/useReminderPref";
import { cn } from "@/lib/utils";
import { tap, success } from "@/lib/haptics";

const CHIPS: { value: number; label: string }[] = [
  { value: 2, label: "2 min" },
  { value: 5, label: "5 min" },
  { value: 7, label: "7 min" },
  { value: 10, label: "10 min" },
  { value: 0, label: "Geen" },
];

type Props = {
  open: boolean;
  onClose: () => void;
  /** Called with the chosen reminder value (0 = none). */
  onConfirm: (remindBeforeMin: number) => void | Promise<void>;
  starting?: boolean;
};

export const StartTimerSheet = ({ open, onClose, onConfirm, starting }: Props) => {
  const { prefs, setRemindBefore } = useReminderPref();
  const [selected, setSelected] = useState<number>(prefs.remindBeforeMin);

  // Re-sync to current default each time the sheet opens, picking the closest chip.
  useEffect(() => {
    if (!open) return;
    const exact = CHIPS.find((c) => c.value === prefs.remindBeforeMin);
    if (exact) {
      setSelected(exact.value);
    } else {
      // pick nearest chip value
      const nearest = CHIPS.reduce((best, c) =>
        Math.abs(c.value - prefs.remindBeforeMin) < Math.abs(best.value - prefs.remindBeforeMin)
          ? c
          : best
      );
      setSelected(nearest.value);
    }
  }, [open, prefs.remindBeforeMin]);

  if (!open) return null;

  const handleConfirm = async () => {
    setRemindBefore(selected);
    success();
    await onConfirm(selected);
  };

  const buttonLabel =
    selected === 0 ? "Start zonder waarschuwing" : `Start met ${selected} min waarschuwing`;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Kies waarschuwingstijd"
    >
      <div
        className="animate-sheet-in pb-safe w-full rounded-t-3xl bg-card p-5 shadow-sheet"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative">
          <span className="mx-auto block h-1.5 w-10 rounded-full bg-muted-foreground/30" />
          <button
            type="button"
            onClick={onClose}
            aria-label="Sluiten"
            className="absolute -top-1 right-0 rounded-full bg-muted p-1.5 text-muted-foreground hover:bg-muted/80"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <h2 className="mt-3 text-[18px] font-bold leading-tight text-foreground">
          Wanneer wil je gewaarschuwd worden?
        </h2>
        <p className="mt-1 text-[13px] text-muted-foreground">
          We sturen een melding zodat je op tijd terug bent bij je auto.
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          {CHIPS.map((c) => {
            const active = selected === c.value;
            return (
              <button
                key={c.value}
                type="button"
                onClick={() => {
                  tap();
                  setSelected(c.value);
                }}
                className={cn(
                  "rounded-full border-2 px-4 py-2 text-sm font-bold transition-base",
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-primary/40 text-foreground hover:border-primary hover:bg-primary/5"
                )}
                aria-pressed={active}
              >
                {c.label}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={handleConfirm}
          disabled={starting}
          className="btn-pill-primary mt-5 w-full"
          style={{ minHeight: 52 }}
        >
          {starting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <Play className="h-4 w-4 fill-current" />
              {buttonLabel}
            </>
          )}
        </button>

        <p className="mt-3 text-center text-[11px] text-muted-foreground">
          Je kan dit later wijzigen bij Instellingen › Waarschuwing
        </p>
      </div>
    </div>
  );
};
