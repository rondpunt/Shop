import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Bell } from "lucide-react";
import { REMINDER_MAX, REMINDER_MIN } from "@/lib/preferences";

type Props = {
  value: number;
  onChange: (min: number) => void;
};

/**
 * 4411-style rotary minute dial.
 * - 1-minute resolution from REMINDER_MIN..REMINDER_MAX.
 * - Drag (mouse / touch) anywhere on the ring to spin.
 * - Big readout in the middle, ticks every minute (5-minute majors labeled).
 */
export const ReminderDial = ({ value, onChange }: Props) => {
  const ringRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);
  const lastAngleRef = useRef<number | null>(null);
  // Accumulated rotation in "minute units" (can be negative or large).
  const [rotMin, setRotMin] = useState<number>(value);

  const range = REMINDER_MAX - REMINDER_MIN + 1; // total selectable minutes
  // Each minute occupies this many degrees on the ring.
  const degPerMin = 360 / 30; // use 30-min full circle (matches 4411 max parking)

  // When external value changes, align rotation.
  useEffect(() => {
    setRotMin(value);
  }, [value]);

  const clamp = (m: number) => Math.min(REMINDER_MAX, Math.max(REMINDER_MIN, m));

  const angleFromEvent = (clientX: number, clientY: number) => {
    const el = ringRef.current;
    if (!el) return 0;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    return (Math.atan2(clientY - cy, clientX - cx) * 180) / Math.PI;
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    draggingRef.current = true;
    (e.target as Element).setPointerCapture?.(e.pointerId);
    lastAngleRef.current = angleFromEvent(e.clientX, e.clientY);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!draggingRef.current || lastAngleRef.current === null) return;
    const a = angleFromEvent(e.clientX, e.clientY);
    let delta = a - lastAngleRef.current;
    // Normalize to [-180, 180] for shortest path.
    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;
    lastAngleRef.current = a;

    const minDelta = delta / degPerMin;
    setRotMin((prev) => {
      const next = clamp(prev + minDelta);
      const rounded = Math.round(next);
      if (rounded !== value) onChange(rounded);
      return next;
    });
  };

  const handlePointerUp = () => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    lastAngleRef.current = null;
    setRotMin((prev) => {
      const rounded = clamp(Math.round(prev));
      if (rounded !== value) onChange(rounded);
      return rounded;
    });
  };

  // Visual rotation of the dial: at value V, the indicator at top should point to V.
  const visualAngle = -rotMin * degPerMin;

  const ticks = useMemo(() => {
    const arr: { min: number; major: boolean }[] = [];
    for (let m = 0; m <= 30; m++) {
      arr.push({ min: m, major: m % 5 === 0 });
    }
    return arr;
  }, []);

  const displayed = clamp(Math.round(rotMin));

  return (
    <div className="flex flex-col items-center gap-3 select-none">
      <div
        ref={ringRef}
        className="relative h-64 w-64 touch-none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        {/* Outer ring */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary to-primary-deep shadow-elevated" />
        {/* Inner disc */}
        <div className="absolute inset-4 rounded-full bg-card shadow-soft" />

        {/* Top indicator (fixed pointer) */}
        <div className="pointer-events-none absolute left-1/2 top-1 -translate-x-1/2 z-20">
          <div className="h-3 w-3 rotate-45 rounded-sm bg-accent shadow-glow-green" />
        </div>

        {/* Rotating tick layer */}
        <div
          className="absolute inset-0"
          style={{
            transform: `rotate(${visualAngle}deg)`,
            transition: draggingRef.current ? "none" : "transform 200ms ease-out",
          }}
        >
          {ticks.map(({ min, major }) => {
            // Place tick at angle = min*degPerMin, with 0 at top.
            const a = min * degPerMin - 90;
            return (
              <div
                key={min}
                className="absolute left-1/2 top-1/2"
                style={{
                  transform: `translate(-50%, -50%) rotate(${a + 90}deg) translateY(-110px)`,
                }}
              >
                <div
                  className={`mx-auto rounded-full ${
                    major ? "h-2.5 w-[3px] bg-primary" : "h-1.5 w-[2px] bg-primary/40"
                  }`}
                />
                {major && min >= REMINDER_MIN && min <= REMINDER_MAX && (
                  <div
                    className="mt-1 text-[10px] font-bold text-primary/70"
                    style={{ transform: `rotate(${-(a + 90) - visualAngle}deg)` }}
                  >
                    {min}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Center readout */}
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <div className="flex flex-col items-center">
            <Bell className="mb-1 h-5 w-5 text-primary" />
            <div className="font-display text-6xl leading-none text-primary tabular-nums">
              {displayed}
            </div>
            <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
              min vooraf
            </div>
          </div>
        </div>
      </div>

      {/* Quick presets — 4411 style */}
      <div className="flex flex-wrap justify-center gap-2">
        {[2, 4, 7].map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => onChange(m)}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition-base ${
              displayed === m
                ? "bg-primary text-primary-foreground shadow-soft"
                : "bg-muted text-muted-foreground hover:bg-muted/70"
            }`}
          >
            {m} min
          </button>
        ))}
      </div>

      <p className="max-w-[18rem] text-center text-xs text-muted-foreground">
        Draai aan de knop of kies snel hieronder.
      </p>
    </div>
  );
};
