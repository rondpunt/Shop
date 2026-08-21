import { CheckCircle2, Download, Share2, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { usePwaInstall } from "@/hooks/usePwaInstall";

export const PwaInstallCard = () => {
  const { canInstall, installed, isIos, install } = usePwaInstall();

  if (installed) {
    return (
      <div className="mt-4 flex items-center gap-3 rounded-2xl border border-primary/20 bg-primary/10 px-4 py-3">
        <span className="grid h-10 w-10 place-items-center rounded-2xl bg-primary text-primary-foreground">
          <CheckCircle2 className="h-5 w-5" />
        </span>
        <div>
          <div className="text-sm font-bold text-foreground">Shop&Go is geïnstalleerd</div>
          <div className="text-xs text-muted-foreground">Opent als zelfstandige app vanaf je startscherm.</div>
        </div>
      </div>
    );
  }

  if (!canInstall && !isIos) return null;

  return (
    <div className="premium-sheen mt-4 rounded-[22px] border border-primary/15 bg-card p-4 shadow-soft">
      <div className="flex items-start gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-primary/12 text-primary">
          <Smartphone className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[15px] font-extrabold text-foreground">Installeer Shop&Go</div>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Sneller openen, fullscreen gebruiken en de app ook vanuit je startscherm starten.
          </p>
        </div>
      </div>

      {canInstall ? (
        <button
          type="button"
          onClick={async () => {
            const accepted = await install();
            if (accepted) toast.success("Shop&Go wordt geïnstalleerd");
          }}
          className="mt-3 flex min-h-[44px] w-full items-center justify-center gap-2 rounded-2xl bg-primary text-sm font-extrabold text-primary-foreground shadow-glow-mint active:scale-[0.99]"
        >
          <Download className="h-4 w-4" /> Installeer app
        </button>
      ) : (
        <div className="mt-3 flex items-start gap-2 rounded-2xl bg-muted/55 px-3 py-2.5 text-xs text-muted-foreground">
          <Share2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <span>Op iPhone/iPad: tik op <strong>Delen</strong> en kies <strong>Zet op beginscherm</strong>.</span>
        </div>
      )}
    </div>
  );
};
