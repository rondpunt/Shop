import { Link } from "react-router-dom";
import { Sparkles, X } from "lucide-react";
import { useEffect, useState } from "react";

type Props = {
  /** Stable id used for "do not show again this session" */
  id: string;
  title: string;
  description: string;
  cta?: string;
};

/**
 * Soft, dismissible Premium-prompt.
 * - Nooit bij opstart, alleen contextueel
 * - Altijd wegklikbaar (✕)
 * - Per sessie onthouden via sessionStorage
 */
export const PremiumSoftPrompt = ({ id, title, description, cta = "Bekijk Premium" }: Props) => {
  const key = `shopgo:softprompt:dismissed:${id}`;
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    try {
      setDismissed(sessionStorage.getItem(key) === "1");
    } catch {
      setDismissed(false);
    }
  }, [key]);

  if (dismissed) return null;

  const close = () => {
    try {
      sessionStorage.setItem(key, "1");
    } catch {
      /* ignore */
    }
    setDismissed(true);
  };

  return (
    <div className="relative rounded-2xl border border-border bg-card p-4 shadow-soft">
      <button
        type="button"
        onClick={close}
        aria-label="Sluiten"
        className="absolute right-2 top-2 rounded-full p-1.5 text-muted-foreground hover:bg-muted"
      >
        <X className="h-4 w-4" />
      </button>
      <div className="flex items-start gap-3 pr-6">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gold/15 text-gold">
          <Sparkles className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <div className="text-sm font-bold">{title}</div>
          <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
          <Link
            to="/premium"
            className="mt-2 inline-flex text-xs font-bold text-primary underline-offset-2 hover:underline"
          >
            {cta} →
          </Link>
        </div>
      </div>
    </div>
  );
};
