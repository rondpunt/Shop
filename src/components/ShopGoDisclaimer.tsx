import { Info } from "lucide-react";

export const SHOPGO_DISCLAIMER =
  "Deze app is enkel een persoonlijke herinnering. De officiële parkeertijd wordt geregistreerd door de sensor in het parkeervak. Deze app biedt geen garantie tegen boetes.";

export const ShopGoDisclaimer = ({ compact = false }: { compact?: boolean }) => {
  if (compact) {
    return (
      <p className="px-1 text-center text-[11px] leading-relaxed text-muted-foreground">
        {SHOPGO_DISCLAIMER}
      </p>
    );
  }
  return (
    <div className="flex items-start gap-2 rounded-xl bg-muted/60 p-3 text-xs leading-relaxed text-muted-foreground">
      <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <span>{SHOPGO_DISCLAIMER}</span>
    </div>
  );
};
