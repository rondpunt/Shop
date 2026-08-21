import { ArrowRight, Download, Smartphone, X } from "lucide-react";
import { Link } from "react-router-dom";
import { useState } from "react";
import { usePwaInstall } from "@/hooks/usePwaInstall";

const DISMISS_KEY = "shopgo_install_nudge_until";
const DISMISS_FOR_MS = 7 * 24 * 60 * 60 * 1000;

const isMobileBrowser = () =>
  typeof navigator !== "undefined" && /android|iphone|ipad|ipod/i.test(navigator.userAgent);

type Props = {
  aboveHomeSheet?: boolean;
};

export const PwaInstallNudge = ({ aboveHomeSheet = false }: Props) => {
  const { canInstall, installed, isIos, install } = usePwaInstall();
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === "undefined") return true;
    return Number(window.localStorage.getItem(DISMISS_KEY) ?? 0) > Date.now();
  });

  if (!isMobileBrowser() || installed || dismissed) return null;

  const dismiss = () => {
    window.localStorage.setItem(DISMISS_KEY, String(Date.now() + DISMISS_FOR_MS));
    setDismissed(true);
  };

  return (
    <aside
      className={`animate-install-nudge fixed left-3 right-3 z-50 mx-auto max-w-md ${
        aboveHomeSheet
          ? "bottom-[calc(env(safe-area-inset-bottom)+360px)]"
          : "bottom-[calc(env(safe-area-inset-bottom)+76px)]"
      }`}
      aria-label="Installeer Shop&Go"
    >
      <div className="install-nudge flex items-center gap-3 rounded-[22px] px-3 py-3 text-white">
        <span className="install-nudge-icon grid h-10 w-10 shrink-0 place-items-center rounded-2xl">
          <Smartphone className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-extrabold">Installeer Shop&amp;Go</div>
          <p className="mt-0.5 text-[11px] leading-snug text-white/70">
            {isIos ? "Zet de app op je beginscherm." : "Open sneller vanaf je startscherm."}
          </p>
        </div>
        {canInstall ? (
          <button
            type="button"
            onClick={() => void install()}
            className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-xl bg-primary px-3 text-[11px] font-extrabold text-primary-foreground shadow-glow-mint active:scale-[0.97]"
          >
            <Download className="h-3.5 w-3.5" /> Installeer
          </button>
        ) : (
          <Link
            to="/install"
            className="inline-flex min-h-9 shrink-0 items-center gap-1 rounded-xl bg-white/10 px-2.5 text-[11px] font-extrabold text-white ring-1 ring-white/15 active:scale-[0.97]"
          >
            Bekijk <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        )}
        <button
          type="button"
          onClick={dismiss}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-white/55 transition-colors hover:bg-white/10 hover:text-white"
          aria-label="Installatiemelding sluiten"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </aside>
  );
};