import { useNavigate } from "react-router-dom";
import { Cloud, Car as CarIcon, History as HistoryIcon, ChevronRight, LogIn, LogOut, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { ShopGoDisclaimer } from "@/components/ShopGoDisclaimer";
import { PageHeader } from "@/components/PageHeader";

const Sync = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  const requireLogin = () => {
    if (!user) navigate("/auth?redirect=/sync");
  };

  return (
    <div className="app-page-panel space-y-5">
      <PageHeader title="Sync & back-up" subtitle="Volledig optioneel. Zonder account werkt alles lokaal." />

      {user ? (
        <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-primary">
            <CheckCircle2 className="h-4 w-4" /> Aangemeld
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{user.email}</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={signOut}>
            <LogOut className="mr-1.5 h-4 w-4" /> Uitloggen
          </Button>
        </div>
      ) : (
        <Button onClick={() => navigate("/auth?redirect=/sync")} className="h-14 w-full rounded-2xl bg-primary text-primary-foreground hover:bg-primary-deep">
          <LogIn className="mr-2 h-5 w-5" /> Inloggen of account aanmaken
        </Button>
      )}

      <div className="space-y-2">
        <SyncCard
          icon={<HistoryIcon className="h-5 w-5" />}
          title="Bewaar historiek in cloud"
          description="Zie je sessies terug op elk toestel."
          onClick={requireLogin}
          enabled={!!user}
        />
        <SyncCard
          icon={<CarIcon className="h-5 w-5" />}
          title="Synchroniseer mijn auto's"
          description="Je voertuigen blijven bewaard, ook na herinstallatie."
          onClick={requireLogin}
          enabled={!!user}
        />
        <SyncCard
          icon={<Cloud className="h-5 w-5" />}
          title="Back-up op nieuw toestel"
          description="Zet alles in één tap terug op een nieuwe telefoon."
          onClick={requireLogin}
          enabled={!!user}
        />
      </div>

      <ShopGoDisclaimer />
    </div>
  );
};

const SyncCard = ({
  icon,
  title,
  description,
  onClick,
  enabled,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
  enabled: boolean;
}) => (
  <button
    onClick={onClick}
    className="flex w-full items-center gap-3 rounded-2xl bg-card p-4 text-left shadow-card transition-base hover:brightness-95"
  >
    <div className="mint-icon-tile grid h-10 w-10 shrink-0 place-items-center rounded-xl">
      {icon}
    </div>
    <div className="flex-1 min-w-0">
      <div className="text-sm font-semibold">{title}</div>
      <div className="text-xs text-muted-foreground">{description}</div>
      {!enabled && (
        <div className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Inloggen vereist
        </div>
      )}
    </div>
    <ChevronRight className="h-4 w-4 text-muted-foreground" />
  </button>
);

export default Sync;
