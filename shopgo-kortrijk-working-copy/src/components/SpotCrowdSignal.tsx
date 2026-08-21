import { Link } from "react-router-dom";
import { ThumbsUp, AlertTriangle, X, Camera, Info, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSpotReports } from "@/hooks/useSpotReports";
import { SIGNAL_THEME } from "@/lib/spotSignal";
import { cn } from "@/lib/utils";

type Props = {
  spotId: string;
  spotName: string;
  /** Optional live-webcam URL — only shown if provided. */
  webcamUrl?: string;
};

/**
 * Shows the fuzzy "drukte"-indicator for a Shop&Go cluster:
 *  - heuristic + crowd-sourced reports
 *  - explicitly never claims "vrij" or "bezet"
 *  - lets logged-in users add a quick report
 */
export const SpotCrowdSignal = ({ spotId, spotName, webcamUrl }: Props) => {
  const { signal, reports, canSubmit, submit, submitting, isLoading } =
    useSpotReports(spotId);
  const theme = SIGNAL_THEME[signal.level];

  return (
    <div className="space-y-3">
      {/* Indicator */}
      <div
        className={cn(
          "rounded-2xl p-3 ring-1 ring-inset",
          theme.bg,
          theme.ring
        )}
      >
        <div className="flex items-start gap-2.5">
          <span
            className={cn(
              "mt-1 inline-block h-2.5 w-2.5 shrink-0 rounded-full",
              theme.dot
            )}
            aria-hidden
          />
          <div className="min-w-0 flex-1">
            <div className={cn("text-sm font-bold leading-tight", theme.text)}>
              {isLoading ? "Drukte ophalen…" : signal.label}
            </div>
            <p className="mt-0.5 text-[11px] leading-snug text-foreground/70">
              {signal.detail}
              {signal.freshness && (
                <span className="ml-1 text-muted-foreground">
                  · laatste melding {signal.freshness}
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="mt-2 flex items-center gap-1.5 rounded-lg bg-card/70 px-2 py-1.5 text-[10px] leading-tight text-muted-foreground">
          <Info className="h-3 w-3 shrink-0" />
          <span>
            Indicatie op basis van uur, dag en meldingen van bestuurders. Geen
            zekerheid over individuele vakken.
          </span>
        </div>
      </div>

      {/* Quick-report buttons */}
      <div>
        <div className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
          Wat zie je nu bij {spotName}?
        </div>
        {canSubmit ? (
          <div className="grid grid-cols-3 gap-1.5">
            <ReportButton
              label="Vrij plekje"
              icon={<ThumbsUp className="h-3.5 w-3.5" />}
              onClick={() => submit({ status: "free" })}
              disabled={submitting}
              tone="success"
            />
            <ReportButton
              label="Druk"
              icon={<AlertTriangle className="h-3.5 w-3.5" />}
              onClick={() => submit({ status: "busy" })}
              disabled={submitting}
              tone="warning"
            />
            <ReportButton
              label="Vol"
              icon={<X className="h-3.5 w-3.5" />}
              onClick={() => submit({ status: "full" })}
              disabled={submitting}
              tone="danger"
            />
          </div>
        ) : (
          <Link
            to="/sync"
            className="block rounded-xl border border-dashed border-border bg-card px-3 py-2 text-center text-[11px] font-semibold text-muted-foreground hover:bg-muted/40"
          >
            Log in om een melding te delen
          </Link>
        )}
      </div>

      {/* Recent reports list */}
      {reports.length > 0 && (
        <div className="rounded-xl bg-muted/40 p-2">
          <div className="mb-1 px-1 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
            Recente meldingen
          </div>
          <ul className="space-y-0.5 text-[11px]">
            {reports.slice(0, 3).map((r) => (
              <li
                key={r.id}
                className="flex items-center justify-between rounded-lg px-1.5 py-1"
              >
                <span className="font-medium capitalize">
                  {r.status === "free"
                    ? "Vrij plekje"
                    : r.status === "busy"
                    ? "Druk"
                    : "Vol"}
                </span>
                <span className="text-muted-foreground">
                  {new Date(r.created_at).toLocaleTimeString("nl-BE", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Optional webcam reference (no occupancy claim) */}
      {webcamUrl && (
        <a
          href={webcamUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between rounded-xl border border-border bg-card px-3 py-2 text-[11px] font-semibold text-foreground hover:bg-muted/40"
        >
          <span className="flex items-center gap-2">
            <Camera className="h-3.5 w-3.5 text-primary" />
            Bekijk live webcam centrum
          </span>
          <span className="text-muted-foreground">↗</span>
        </a>
      )}
    </div>
  );
};

const ReportButton = ({
  label,
  icon,
  onClick,
  disabled,
  tone,
}: {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  disabled: boolean;
  tone: "success" | "warning" | "danger";
}) => {
  const tones: Record<typeof tone, string> = {
    success: "border-success/30 text-success hover:bg-success/10",
    warning: "border-warning/30 text-warning hover:bg-warning/10",
    danger: "border-destructive/30 text-destructive hover:bg-destructive/10",
  };
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "h-9 flex-col gap-0.5 rounded-xl bg-card text-[10px] font-bold uppercase tracking-wider",
        tones[tone]
      )}
    >
      {disabled ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : icon}
      {label}
    </Button>
  );
};
