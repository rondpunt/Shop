import { Link } from "react-router-dom";
import { LogIn, LogOut, Sparkles, ArrowRight } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { useAuth } from "@/hooks/useAuth";
import { usePremium } from "@/hooks/usePremium";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const Profile = () => {
  const { user, profile, signOut } = useAuth();
  const { premium } = usePremium();

  const initials = (profile?.display_name || user?.email || "?")
    .split(/[\s@]/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join("");

  if (!user) {
    return (
      <div className="app-page-panel">
        <PageHeader title="Account" />
        <div className="card-soft p-6 text-center">
          <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full bg-primary/10 text-primary">
            <LogIn className="h-7 w-7" />
          </div>
          <h2 className="text-[17px] font-bold">Meld je aan om je sessies te bewaren</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Je rijdt momenteel als gast. Log in of maak een account aan om historiek,
            favorieten en instellingen te synchroniseren.
          </p>
          <Link to="/auth" className="btn-pill-primary mt-5 w-full">
            Aanmelden / Registreren
          </Link>
          <Link to="/" className="mt-3 inline-block text-[13px] font-semibold text-primary hover:underline">
            Ga verder als gast
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="app-page-panel">
      <PageHeader title="Profiel" />

      <div className="card-soft flex items-center gap-4 p-5">
        <Avatar className="h-14 w-14 border-2 border-primary/20">
          <AvatarImage src={profile?.avatar_url ?? undefined} alt="" />
          <AvatarFallback className="bg-primary text-primary-foreground text-base font-bold">
            {initials || "?"}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[16px] font-bold">{profile?.display_name || "Driver"}</div>
          <div className="truncate text-xs text-muted-foreground">{user.email}</div>
          {premium && (
            <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-gold/15 px-2 py-0.5 text-[10px] font-bold text-gold">
              <Sparkles className="h-3 w-3" /> Premium
            </span>
          )}
        </div>
      </div>

      {!premium && (
        <Link to="/premium" className="mt-4 flex items-center justify-between rounded-2xl bg-deep p-4 text-white shadow-elevated">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-primary">
              ✨ Upgrade
            </div>
            <div className="font-display text-[18px]">Probeer Premium gratis</div>
          </div>
          <ArrowRight className="h-5 w-5" />
        </Link>
      )}

      <button
        type="button"
        onClick={signOut}
        className="btn-pill-outline mt-6 w-full border-destructive text-destructive hover:bg-destructive/5"
      >
        <LogOut className="h-4 w-4" /> Uitloggen
      </button>
    </div>
  );
};

export default Profile;
