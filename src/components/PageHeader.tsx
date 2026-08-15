import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

type Props = {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  onBack?: () => void;
  /** Hide back button (e.g. on top-level tab pages) */
  hideBack?: boolean;
};

/**
 * Donker page-header — past bij de premium look uit de screenshots.
 * Donkere navy bg, witte titel, optionele back & action.
 */
export const PageHeader = ({ title, subtitle, action, onBack, hideBack }: Props) => {
  const navigate = useNavigate();
  return (
    <div className="-mx-4 -mt-4 mb-0 bg-deep px-4 pb-5 pt-4 text-white">
      <div className="flex min-h-[28px] items-center justify-between gap-3">
        {!hideBack ? (
          <button
            type="button"
            onClick={onBack ?? (() => navigate(-1))}
            className="-ml-1 flex items-center gap-1 rounded-full px-2 py-1 text-[13px] font-semibold text-white/70 hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Terug
          </button>
        ) : <span />}
        {action}
      </div>
      <div className="mt-4">
        <h1 className="font-display text-[24px] leading-tight text-white sm:text-[28px]">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-1 text-[13px] font-medium text-white/60">{subtitle}</p>
        )}
      </div>
    </div>
  );
};
