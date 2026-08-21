import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Bell, Navigation } from "lucide-react";
import { cn } from "@/lib/utils";
import { SGLogo } from "@/components/SGLogo";

type Slide =
  | { kind: "splash" }
  | { kind: "icon"; icon: typeof Bell; title: string; sub: string };

const slides: Slide[] = [
  { kind: "splash" },
  {
    kind: "icon",
    icon: Bell,
    title: "Nooit meer een boete",
    sub: "We waarschuwen je 5 minuten voor het einde van je parkeertijd.",
  },
  {
    kind: "icon",
    icon: Navigation,
    title: "Eén tik = navigeren",
    sub: "Kies een vrije plek en we sturen je er direct naartoe.",
  },
];

const KEY = "shopgo:onboarded:v1";


const SplashSlide = () => {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const start = Date.now();
    const id = window.setInterval(() => {
      const p = Math.min(100, ((Date.now() - start) / 1800) * 100);
      setProgress(p);
      if (p >= 100) window.clearInterval(id);
    }, 60);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="flex flex-1 flex-col justify-between py-10">
      <div className="flex items-center gap-4">
        <SGLogo size={64} className="drop-shadow-[0_5px_16px_hsl(var(--primary)/0.45)]" />
        <div>
          <h1 className="text-[32px] font-black leading-none tracking-normal text-white">Shop&amp;Go</h1>
          <p className="mt-1 text-[17px] font-medium text-white/58">Kortrijk parkeer-reminder</p>
        </div>
      </div>

      <div className="flex flex-1 flex-col items-start justify-center">
        <h2 className="font-display text-[54px] leading-[0.95] text-white sm:text-[64px]">
          30 min
          <span className="block text-primary drop-shadow-[0_0_18px_hsl(var(--primary)/0.65)]">gratis</span>
        </h2>
        <p className="mt-5 max-w-[17rem] text-[17px] font-semibold leading-snug text-white/62">
          Parkeer sneller in Kortrijk met live vrije Shop&amp;Go plaatsen.
        </p>
      </div>

      <div>
        <div className="h-[3px] w-full overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bar-neon transition-all duration-100"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="mt-3 text-[12px] font-medium text-white/45">
          Realtime · Sensordata
        </p>
      </div>
    </div>
  );
};

const Onboarding = () => {
  const navigate = useNavigate();
  const [idx, setIdx] = useState(0);
  const last = idx === slides.length - 1;
  const slide = slides[idx];

  const finish = () => {
    try { localStorage.setItem(KEY, "1"); } catch { /* ignore */ }
    navigate("/", { replace: true });
  };

  return (
    <div className="pt-safe pb-safe flex min-h-[100dvh] flex-col bg-deep px-6 text-white">
      <div className="flex justify-end pt-3">
        <button onClick={finish} className="text-sm font-semibold text-white/55 hover:text-white">
          Overslaan
        </button>
      </div>

      {slide.kind === "splash" ? (
        <SplashSlide />
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <div className="mb-8 grid h-44 w-44 place-items-center rounded-full bg-primary/15">
            <slide.icon className="h-20 w-20 text-primary" strokeWidth={1.6} />
          </div>
          <h1 className="font-display text-[26px] leading-tight">{slide.title}</h1>
          <p className="mt-3 max-w-sm text-sm text-white/65">{slide.sub}</p>
        </div>
      )}

      <div className="mb-6 mt-6 flex justify-center gap-2">
        {slides.map((_, i) => (
          <span
            key={i}
            className={cn(
              "h-2 rounded-full transition-all",
              i === idx ? "w-8 bg-primary" : "w-2 bg-white/25"
            )}
          />
        ))}
      </div>

      <button
        type="button"
        onClick={() => (last ? finish() : setIdx((v) => v + 1))}
        className="btn-pill-primary mb-6 w-full"
      >
        {last ? "Start" : "Volgende"} <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  );
};

export default Onboarding;
