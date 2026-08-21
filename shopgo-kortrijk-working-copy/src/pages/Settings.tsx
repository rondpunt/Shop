import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import {
  Bell, Car as CarIcon, History as HistoryIcon, Info, Moon,
  Sparkles, User as UserIcon, ChevronRight, Lock, Shield, Smartphone,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { PwaInstallCard } from "@/components/PwaInstallCard";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/hooks/useAuth";
import { ensureNotificationPermission } from "@/lib/notifications";
import { usePremium } from "@/hooks/usePremium";
import { tap as hapticTap } from "@/lib/haptics";
import { APP_VERSION, APP_BUILD_DATE } from "@/lib/version";

type IconType = typeof Bell;

const IconTile = ({ Icon }: { Icon: IconType }) => (
  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary">
    <Icon className="h-[18px] w-[18px]" />
  </span>
);

type NavRowProps = {
  to?: string;
  onClick?: () => void;
  icon: IconType;
  label: string;
  value?: string;
  locked?: boolean;
};

const NavRow = ({ to, onClick, icon: Icon, label, value, locked }: NavRowProps) => {
  const inner = (
    <>
      <IconTile Icon={Icon} />
      <span className="flex-1 text-[16px] font-semibold text-card-foreground">{label}</span>
      {value && <span className="text-[14px] font-medium text-card-muted">{value}</span>}
      {locked ? <Lock className="h-4 w-4 text-card-muted" /> : <ChevronRight className="h-4 w-4 text-card-muted" />}
    </>
  );
  const cls = "flex min-h-[60px] w-full items-center gap-3 px-4 py-3 transition-colors active:bg-muted/50";
  const tap = () => hapticTap();
  if (to) {
    return (
      <Link to={to} onClick={tap} className={cls}>
        {inner}
      </Link>
    );
  }
  return (
    <button type="button" onClick={() => { tap(); onClick?.(); }} className={cls}>
      {inner}
    </button>
  );
};

type ToggleRowProps = {
  icon: IconType;
  label: string;
  checked: boolean;
  disabled?: boolean;
  locked?: boolean;
  trailingLabel?: string;
  onToggle?: (val: boolean) => void;
};

const ToggleRow = ({ icon: Icon, label, checked, disabled, locked, trailingLabel, onToggle }: ToggleRowProps) => {
  const handleToggle = (val: boolean) => {
    if (disabled || locked) return;
    hapticTap();
    onToggle?.(val);
  };
  return (
    <label className="flex min-h-[60px] w-full cursor-pointer items-center gap-3 px-4 py-3 text-left transition-colors active:bg-muted/50 data-[disabled=true]:cursor-default data-[disabled=true]:opacity-50" data-disabled={disabled}>
      <IconTile Icon={Icon} />
      <span className="flex-1 text-[16px] font-semibold text-card-foreground">{label}</span>
      {trailingLabel && <span className="text-[13px] font-medium text-card-muted">{trailingLabel}</span>}
      {locked && <Lock className="h-4 w-4 text-card-muted" />}
      <Switch checked={checked} disabled={disabled || locked} onCheckedChange={handleToggle} aria-label={label} />
    </label>
  );
};

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <h2 className="mb-2 mt-6 px-2 text-[12px] font-bold uppercase tracking-wider text-foreground/80">{children}</h2>
);

const Card = ({ children }: { children: React.ReactNode }) => (
  <div className="card-soft divide-y divide-border/40 overflow-hidden">{children}</div>
);

const Settings = () => {
  const { user, updateTheme } = useAuth();
  const { premium } = usePremium();
  const [isDarkMode, setIsDarkMode] = useState(() => document.documentElement.classList.contains("dark"));
  const [notifications, setNotifications] = useState(() => localStorage.getItem("notifications") !== "false");

  const toggleDark = (val: boolean) => {
    setIsDarkMode(val);
    void updateTheme(val ? "dark" : "light");
  };

  const toggleNotifications = async (val: boolean) => {
    if (val) {
      const granted = await ensureNotificationPermission();
      if (!granted) {
        setNotifications(false);
        localStorage.setItem("notifications", "false");
        toast.warning("Meldingen zijn niet toegestaan", {
          description: "Geef Shop&Go toestemming in de browser- of telefooninstellingen.",
        });
        return;
      }
      setNotifications(true);
      localStorage.setItem("notifications", "true");
      toast.success("Timerwaarschuwingen ingeschakeld");
      return;
    }
    setNotifications(false);
    localStorage.setItem("notifications", "false");
    toast.info("Timerwaarschuwingen uitgeschakeld");
  };

  return (
    <div className="-mx-4 min-h-[calc(100dvh-9rem)] bg-background px-4 pb-8">
      <PageHeader title="Instellingen" hideBack />

      <SectionTitle>Parkeren</SectionTitle>
      <Card>
        <NavRow to="/instellingen/waarschuwing" icon={Bell} label="Waarschuwingstijd" value="5 min" />
        <NavRow to="/auto" icon={CarIcon} label="Mijn voertuigen" />
      </Card>

      <SectionTitle>Account</SectionTitle>
      <Card>
        <NavRow to="/profiel" icon={UserIcon} label={user ? "Profiel & account" : "Inloggen / Registreren"} />
        <NavRow to={premium ? "/historiek" : "/premium"} icon={HistoryIcon} label="Uitgebreide historiek" locked={!premium} />
      </Card>

      <SectionTitle>App</SectionTitle>
      <Card>
        <ToggleRow icon={Moon} label="Donkere modus" checked={isDarkMode} onToggle={toggleDark} />
        <ToggleRow icon={Smartphone} label="Timerwaarschuwingen" checked={notifications} onToggle={toggleNotifications} />
      </Card>
      <PwaInstallCard />

      {!premium && (
        <Link
          to="/premium"
          onClick={() => hapticTap()}
          className="mt-5 flex items-center justify-between rounded-2xl bg-primary p-4 text-primary-foreground shadow-glow-mint transition-transform active:scale-[0.99]"
        >
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-white/20 text-white"><Sparkles className="h-5 w-5" /></span>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-white/80">Premium</div>
              <div className="font-display text-[18px] leading-tight">Upgrade naar Premium</div>
            </div>
          </div>
          <ChevronRight className="h-5 w-5" />
        </Link>
      )}

      <SectionTitle>Info</SectionTitle>
      <Card>
        <NavRow to="/over" icon={Info} label="Over Shop&Go" value={`v${APP_VERSION}`} />
        <NavRow to="/privacy" icon={Shield} label="Privacybeleid" />
      </Card>

      <p className="mt-3 text-center text-xs text-muted-foreground">Shop&Go · v{APP_VERSION} · {APP_BUILD_DATE}</p>
    </div>
  );
};

export default Settings;
