import { ArrowRight, Download, MapPinned, Navigation, TimerReset } from "lucide-react";
import { Link } from "react-router-dom";
import { usePwaInstall } from "@/hooks/usePwaInstall";

const Install = () => {
  const { canInstall, installed, isIos, install } = usePwaInstall();

  const handleInstall = async () => {
    await install();
  };

  return (
    <main className="ambient-backdrop min-h-dvh overflow-hidden px-5 pb-10 pt-safe text-white">
      <div className="mx-auto flex min-h-[100dvh] max-w-lg flex-col py-7">
        <header className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2" aria-label="Naar Shop&Go">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary text-primary-deep shadow-glow-mint"><MapPinned size={22} /></span>
            <span className="font-display text-lg tracking-tight">Shop&amp;Go <span className="text-primary">Kortrijk</span></span>
          </Link>
          <span className="micro-label text-white/55">Gratis app</span>
        </header>

        <section className="flex flex-1 flex-col justify-center py-12">
          <div className="mb-5 inline-flex w-fit items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary">
            <span className="pulse-dot h-2 w-2 rounded-full bg-primary" /> Live parkeerinfo
          </div>
          <h1 className="font-display max-w-md text-4xl leading-[1.03] tracking-tight sm:text-5xl">Parkeer. Start je timer. <span className="text-primary">Klaar.</span></h1>
          <p className="mt-5 max-w-md text-base leading-relaxed text-white/68">Shop&amp;Go Kortrijk toont beschikbare plaatsen en helpt je parkeerduur op tijd te bewaken.</p>

          <div className="mt-8 grid gap-3">
            <div className="glass-card flex items-center gap-4 p-4"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-primary"><Navigation size={21} /></span><div><p className="font-bold">Vind een plaats</p><p className="mt-0.5 text-sm text-white/60">Overzicht van de beschikbare Shop&amp;Go-zones.</p></div></div>
            <div className="glass-card flex items-center gap-4 p-4"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-primary"><TimerReset size={21} /></span><div><p className="font-bold">Bewaar je tijd</p><p className="mt-0.5 text-sm text-white/60">Start een timer zodra je geparkeerd bent.</p></div></div>
          </div>
        </section>

        <section className="glass-card p-4">
          {installed ? (
            <p className="text-center text-sm font-semibold text-primary">Shop&amp;Go is al op dit toestel geïnstalleerd.</p>
          ) : canInstall ? (
            <button onClick={handleInstall} className="btn-pill-primary w-full"><Download size={19} /> Installeer Shop&amp;Go</button>
          ) : isIos ? (
            <p className="text-center text-sm leading-relaxed text-white/75">Tik op <strong className="text-white">Deel</strong> in Safari en kies <strong className="text-white">Zet op beginscherm</strong>.</p>
          ) : (
            <p className="text-center text-sm leading-relaxed text-white/75">Open deze pagina in Chrome en kies <strong className="text-white">App installeren</strong> in het browsermenu.</p>
          )}
          <Link to="/" className="mt-3 flex items-center justify-center gap-1 text-sm font-bold text-primary">Open de app <ArrowRight size={16} /></Link>
        </section>
      </div>
    </main>
  );
};

export default Install;
