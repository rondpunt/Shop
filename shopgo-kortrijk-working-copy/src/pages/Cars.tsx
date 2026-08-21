import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { z } from "zod";
import { Plus, Car as CarIcon, Trash2, Star, Pencil, Check, X, MoreVertical, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PageHeader } from "@/components/PageHeader";
import { useDataSource, type Car } from "@/hooks/useDataSource";
import { usePremium } from "@/hooks/usePremium";

const COLORS = [
  "hsl(165 100% 41%)", // mint primary
  "hsl(220 100% 56%)", // electric blue
  "hsl(354 100% 64%)", // signal red
  "hsl(32 100% 50%)", // amber
  "hsl(258 90% 66%)", // violet
  "hsl(230 28% 12%)", // navy near-black
  "hsl(240 5% 96%)", // pearl white
  "hsl(220 9% 64%)", // graphite
];

const isLight = (color: string) => color.includes("96%") || color.includes("64%") || color.includes("66%") || color.includes("50%") || color.includes("56%");

const carSchema = z.object({
  name: z.string().trim().min(1, "Naam vereist").max(40),
  plate: z.string().trim().max(15).optional().or(z.literal("")),
  color_hex: z.string().min(1, "Ongeldige kleur"),
});

const Cars = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const isOnboarding = params.get("onboarding") === "1";

  const { cars, loading, addCar, updateCar, deleteCar, setDefaultCar } = useDataSource();
  const { premium } = usePremium();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Car | null>(null);
  const [name, setName] = useState("");
  const [plate, setPlate] = useState("");
  const [color, setColor] = useState(COLORS[0]);

  useEffect(() => {
    if (isOnboarding && !loading && cars.length === 0) {
      setOpen(true);
    }
  }, [isOnboarding, loading, cars.length]);

  const canAddMore = premium || cars.length < 1;

  const openNew = () => {
    if (!canAddMore) {
      toast.info("Upgrade naar Premium voor meerdere voertuigen");
      navigate("/premium");
      return;
    }
    setEditing(null);
    setName("");
    setPlate("");
    setColor(COLORS[0]);
    setOpen(true);
  };

  const openEdit = (c: Car) => {
    setEditing(c);
    setName(c.name);
    setPlate(c.plate ?? "");
    setColor(c.color_hex);
    setOpen(true);
  };

  const save = async () => {
    const parsed = carSchema.safeParse({ name, plate, color_hex: color });
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);

    const isFirst = cars.length === 0;
    try {
      if (editing) {
        await updateCar(editing.id, {
          name: parsed.data.name,
          plate: parsed.data.plate || null,
          color_hex: parsed.data.color_hex,
        });
        toast.success("Auto bijgewerkt");
      } else {
        if (!premium && cars.length >= 1) {
          toast.info("Upgrade naar Premium voor meerdere voertuigen");
          setOpen(false);
          navigate("/premium");
          return;
        }
        await addCar({
          name: parsed.data.name,
          plate: parsed.data.plate || null,
          color_hex: parsed.data.color_hex,
          is_default: isFirst,
        });
        toast.success("Auto toegevoegd");
      }
      setOpen(false);
      if (isOnboarding && isFirst) navigate("/", { replace: true });
    } catch (e: any) {
      toast.error(e?.message ?? "Opslaan mislukt");
    }
  };

  const remove = async (c: Car) => {
    try {
      await deleteCar(c.id);
      toast.success("Auto verwijderd");
    } catch (e: any) {
      toast.error(e?.message);
    }
  };

  const setDefault = async (c: Car) => {
    try {
      await setDefaultCar(c.id);
    } catch (e: any) {
      toast.error(e?.message);
    }
  };

  return (
    <div className="app-page-panel space-y-5">
      <PageHeader
        title="Mijn auto's"
        subtitle="Optioneel — gekoppeld aan elke sessie"
        action={
          <Button
            onClick={openNew}
            size="sm"
            className={`rounded-full ${canAddMore ? "bg-accent text-accent-foreground hover:bg-accent/90" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
          >
            {canAddMore ? <Plus className="mr-1 h-4 w-4" /> : <Lock className="mr-1 h-3.5 w-3.5" />} Nieuw
          </Button>
        }
      />

      {loading ? (
        <div className="grid h-40 place-items-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : cars.length === 0 ? (
        <div className="card-soft p-8 text-center">
          <div className="mint-icon-tile mx-auto mb-3 grid h-16 w-16 place-items-center rounded-2xl">
            <CarIcon className="h-7 w-7 text-primary" />
          </div>
          <h2 className="text-lg font-semibold">Nog geen auto's</h2>
          <p className="mt-1 text-sm text-muted-foreground">Voeg een voertuig toe om er één aan elke sessie te koppelen.</p>
          <Button onClick={openNew} className="mt-4 bg-primary hover:bg-primary-deep">
            <Plus className="mr-1.5 h-4 w-4" /> Voeg auto toe
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {cars.map((c, idx) => {
            const locked = !premium && idx > 0;
            return (
            <div
              key={c.id}
              className={`flex items-center gap-3 rounded-[22px] bg-card p-4 shadow-card ${locked ? "opacity-60" : ""}`}
            >
              <span
                className="relative grid h-11 w-11 shrink-0 place-items-center rounded-2xl shadow-soft ring-1 ring-black/10"
                style={{
                  backgroundColor: c.color_hex,
                  color: isLight(c.color_hex) ? "#14172A" : "#ffffff",
                }}
              >
                <CarIcon className="h-5 w-5" strokeWidth={2.2} />
                {locked && (
                  <span className="absolute -right-1 -bottom-1 grid h-5 w-5 place-items-center rounded-full bg-foreground text-background ring-2 ring-card">
                    <Lock className="h-3 w-3" strokeWidth={3} />
                  </span>
                )}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="truncate font-semibold">{c.name}</span>
                  {c.is_default && (
                    <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
                      Standaard
                    </span>
                  )}
                </div>
                {c.plate && <div className="text-xs text-muted-foreground">{c.plate}</div>}
              </div>
              {locked ? (
                <Button size="sm" variant="ghost" onClick={() => navigate("/premium")} aria-label="Upgrade">
                  <Lock className="h-4 w-4" />
                </Button>
              ) : (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="icon" variant="ghost" aria-label="Meer">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-44">
                    <DropdownMenuItem onClick={() => openEdit(c)}>
                      <Pencil className="mr-2 h-4 w-4" /> Bewerken
                    </DropdownMenuItem>
                    {!c.is_default && (
                      <DropdownMenuItem onClick={() => setDefault(c)}>
                        <Star className="mr-2 h-4 w-4" /> Als standaard
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => remove(c)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="mr-2 h-4 w-4" /> Verwijderen
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
            );
          })}
        </div>
      )}

      {!premium && cars.length >= 1 && (
        <Link
          to="/premium"
          className="flex items-center gap-3 rounded-[22px] bg-card p-4 text-left shadow-card transition-base hover:brightness-95"
        >
          <span className="mint-icon-tile grid h-10 w-10 shrink-0 place-items-center rounded-xl">
            <Lock className="h-4 w-4" />
          </span>
          <span className="flex-1 min-w-0">
            <span className="block truncate text-sm font-bold text-foreground">
              🔒 Premium: voeg meerdere voertuigen toe
            </span>
            <span className="block text-[11px] text-muted-foreground">
              Wissel snel tussen auto's per sessie
            </span>
          </span>
          <span className="rounded-full bg-gold/15 px-2.5 py-1 text-[11px] font-bold text-gold">
            ✨ Upgrade
          </span>
        </Link>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="rounded-3xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Auto bewerken" : "Nieuwe auto"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="car-name">Naam</Label>
              <Input id="car-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Mijn auto" maxLength={40} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="car-plate">Nummerplaat (optioneel)</Label>
              <Input id="car-plate" value={plate} onChange={(e) => setPlate(e.target.value.toUpperCase())} placeholder="1-ABC-123" maxLength={15} />
            </div>
            <div className="space-y-2">
              <Label>Kleur</Label>
              <div className="grid grid-cols-4 gap-2.5">
                {COLORS.map((c) => {
                  const selected = color === c;
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      aria-label={c}
                      aria-pressed={selected}
                      className={`group relative grid h-14 w-full place-items-center rounded-2xl transition-base ${
                        selected ? "ring-2 ring-primary shadow-glow-mint scale-[1.03]" : "ring-1 ring-black/10 hover:scale-[1.02]"
                      }`}
                      style={{
                        backgroundColor: c,
                        color: isLight(c) ? "#14172A" : "#ffffff",
                      }}
                    >
                      <CarIcon className="h-5 w-5" strokeWidth={2.2} />
                      {selected && (
                        <span
                          className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-primary text-white shadow-soft ring-2 ring-card"
                        >
                          <Check className="h-3 w-3" strokeWidth={3} />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setOpen(false)} className="bg-foreground text-background hover:bg-foreground/90">
              <X className="mr-1.5 h-4 w-4" /> Annuleren
            </Button>
            <Button onClick={save} className="bg-primary hover:bg-primary-deep">
              <Check className="mr-1.5 h-4 w-4" /> Opslaan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Cars;
