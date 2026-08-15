from pathlib import Path


def replace(path, old, new):
    p = Path(path)
    text = p.read_text()
    if old not in text:
        raise RuntimeError(f"Expected block not found in {path}: {old[:80]!r}")
    p.write_text(text.replace(old, new))

# HOME — correct CTA semantics, add community intelligence, adapt to floating dock.
replace(
    "src/pages/Home.tsx",
    'import { Search, MapPin, Loader2, ChevronDown, ChevronUp, ChevronRight, Car } from "lucide-react";',
    'import { Search, MapPin, Loader2, ChevronDown, ChevronUp, ChevronRight, Car, Navigation } from "lucide-react";'
)
replace(
    "src/pages/Home.tsx",
    'import { HomeSessionWidget } from "@/components/HomeSessionWidget";',
    'import { HomeSessionWidget } from "@/components/HomeSessionWidget";\nimport { ZoneIntelligence } from "@/components/ZoneIntelligence";'
)
replace(
    "src/pages/Home.tsx",
    'bottom: "64px", // height of bottom nav\n          height: sheetState === 0 ? "140px" : sheetState === 1 ? "340px" : "calc(100dvh - 84px)",',
    'bottom: "calc(env(safe-area-inset-bottom) + 72px)",\n          height: sheetState === 0 ? "140px" : sheetState === 1 ? "390px" : "calc(100dvh - 92px)",'
)
replace(
    "src/pages/Home.tsx",
    'Live · zojuist vernieuwd <span className="h-2 w-2 rounded-full bg-success pulse-dot" />',
    'Live · {fetchedLabel || "zojuist"} <span className="h-2 w-2 rounded-full bg-success pulse-dot" />'
)
replace(
    "src/pages/Home.tsx",
    'className="card-soft p-4 w-full text-left relative"',
    'className="best-map-card rounded-[24px] p-4 w-full text-left relative"'
)
old = '''                      {recommended.d !== null && (\n                        <div className="mt-1 flex items-center gap-1 text-[13px] text-muted-foreground font-medium">\n                          <Car className="h-3.5 w-3.5" /> {driveMin(recommended.d)} min · {formatDist(recommended.d)}\n                        </div>\n                      )}\n\n                      {recommended.z.freeBays > 0 && (\n                        <button\n                          type="button"\n                          onClick={() => {\n                            if (!activeSession) {\n                              setShowStartSheet(true);\n                            } else {\n                              toast.info("Sessie loopt al");\n                            }\n                          }}\n                          disabled={starting}\n                          className="mt-4 flex min-h-[44px] w-full items-center justify-center gap-1 rounded-xl bg-primary px-3 text-[15px] font-bold text-primary-foreground shadow-glow-mint active:scale-[0.98] transition-transform"\n                        >\n                          {starting ? <Loader2 className="h-5 w-5 animate-spin" /> : "Navigeer →"}\n                        </button>\n                      )}'''
new = '''                      {recommended.d !== null && (\n                        <div className="mt-1 flex items-center gap-1 text-[13px] text-muted-foreground font-medium">\n                          <Car className="h-3.5 w-3.5" /> {driveMin(recommended.d)} min · {formatDist(recommended.d)}\n                        </div>\n                      )}\n\n                      <ZoneIntelligence\n                        spotId={`parko:${recommended.z.id}`}\n                        freeBays={recommended.z.freeBays}\n                        totalBays={recommended.z.totalBays}\n                        compact\n                      />\n\n                      <div className="mt-4 grid grid-cols-[0.85fr_1.35fr] gap-2">\n                        <button\n                          type="button"\n                          onClick={() => navigateTo(recommended.z)}\n                          className="flex min-h-[46px] items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white text-[13px] font-extrabold text-slate-700 active:scale-[0.98]"\n                        >\n                          <Navigation className="h-4 w-4" /> Route\n                        </button>\n                        <button\n                          type="button"\n                          onClick={() => activeSession ? toast.info("Er loopt al een sessie") : setShowStartSheet(true)}\n                          disabled={starting || recommended.z.freeBays === 0}\n                          className="flex min-h-[46px] items-center justify-center gap-2 rounded-2xl bg-primary px-3 text-[14px] font-extrabold text-primary-foreground shadow-glow-mint transition active:scale-[0.98] disabled:bg-slate-200 disabled:text-slate-500 disabled:shadow-none"\n                        >\n                          {starting ? <Loader2 className="h-5 w-5 animate-spin" /> : recommended.z.freeBays > 0 ? "Ik sta hier · start 30 min" : "Nu vol"}\n                        </button>\n                      </div>'''
replace("src/pages/Home.tsx", old, new)
replace(
    "src/pages/Home.tsx",
    'Navigeer <ChevronRight className="h-3 w-3" />',
    'Bekijk <ChevronRight className="h-3 w-3" />'
)

# LOCATION DETAIL — remove fake time-of-day prediction imports, add real intelligence and correct action priority.
replace(
    "src/pages/LocationDetail.tsx",
    'import { getPredictiveAvailability, getPredictionLabel } from "@/lib/predictive";\nimport { TrendingUp, TrendingDown, Minus } from "lucide-react";',
    'import { ZoneIntelligence } from "@/components/ZoneIntelligence";'
)
needle = '''        <div className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-bold text-success">\n          <span className="dot-neon h-2.5 w-2.5 rounded-full pulse-dot" />\n          Live · bijgewerkt {new Date(parko.fetchedAt).toLocaleTimeString("nl-BE", { hour: "2-digit", minute: "2-digit" })}\n        </div>'''
replace(
    "src/pages/LocationDetail.tsx",
    needle,
    needle + '''\n\n        <ZoneIntelligence\n          spotId={`parko:${zone.id}`}\n          freeBays={zone.freeBays}\n          totalBays={zone.totalBays}\n        />'''
)
old = '''        <button\n          type="button"\n          onClick={() => navigateTo(zone)}\n          className="btn-pill-primary mt-4 w-full"\n        >\n          Navigeer →\n        </button>\n        <button\n          type="button"\n          disabled={!!activeSession || starting || zone.freeBays === 0}\n          onClick={() => setShowStartSheet(true)}\n          className="btn-pill-outline mt-2 w-full"\n        >\n          <Play className="h-4 w-4 fill-current" /> Start 30 min\n        </button>'''
new = '''        <button\n          type="button"\n          disabled={!!activeSession || starting || zone.freeBays === 0}\n          onClick={() => setShowStartSheet(true)}\n          className="btn-pill-primary mt-5 w-full disabled:opacity-45 disabled:shadow-none"\n        >\n          <Play className="h-4 w-4 fill-current" /> {activeSession ? "Sessie loopt al" : zone.freeBays > 0 ? "Ik parkeer hier · start 30 min" : "Momenteel vol"}\n        </button>\n        <button\n          type="button"\n          onClick={() => navigateTo(zone)}\n          className="btn-pill-outline mt-2 w-full"\n        >\n          Navigeer naar deze locatie →\n        </button>'''
replace("src/pages/LocationDetail.tsx", old, new)

# LOCAL-FIRST SESSION MODEL — keep spot_id so history/social context survives offline use.
replace(
    "src/lib/localStore.ts",
    '  photo_dataurl: string | null;\n};',
    '  photo_dataurl: string | null;\n  spot_id: string | null;\n};'
)
replace(
    "src/lib/localStore.ts",
    '      photo_dataurl: input.photo_dataurl ?? null,\n    };',
    '      photo_dataurl: input.photo_dataurl ?? null,\n      spot_id: input.spot_id ?? null,\n    };'
)

# Unified data source must fetch/return spot_id for cloud and local sessions.
replace(
    "src/hooks/useDataSource.ts",
    '    photo_url: s.photo_dataurl,\n    car:',
    '    photo_url: s.photo_dataurl,\n    spot_id: s.spot_id ?? null,\n    car:'
)
p = Path("src/hooks/useDataSource.ts")
t = p.read_text().replace(
    'id, car_id, started_at, ends_at, ended_at, lat, lng, address, note, photo_url, cars(name, plate, color_hex)',
    'id, car_id, started_at, ends_at, ended_at, lat, lng, address, note, photo_url, spot_id, cars(name, plate, color_hex)'
)
p.write_text(t)

# HISTORY — distinguish a running session from one whose timer elapsed without explicit stop.
p = Path("src/pages/History.tsx")
t = p.read_text()
old = '''  const start = new Date(row.started_at);\n  const isActive = !row.ended_at;\n  const end = row.ended_at ? new Date(row.ended_at) : null;\n  const minutes = end ? Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000)) : 0;\n\n  // Status:\n  //  - active session (no ended_at, or zero duration): green pulsing "● Actief"\n  //  - ended ≤ 30 min: green "✅ Op tijd"\n  //  - ended > 30 min: red "⚠️ Te laat"\n  const showActive = isActive || minutes === 0;\n  const onTime = !showActive && minutes <= 30;'''
new = '''  const start = new Date(row.started_at);\n  const timerEnd = new Date(row.ends_at);\n  const running = !row.ended_at && timerEnd.getTime() > Date.now();\n  const expiredOpen = !row.ended_at && !running;\n  const end = row.ended_at ? new Date(row.ended_at) : expiredOpen ? timerEnd : null;\n  const minutes = end ? Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000)) : 0;\n  const onTime = !!row.ended_at && minutes <= 30;'''
if old not in t: raise RuntimeError("History status block not found")
t = t.replace(old, new)
t = t.replace('{showActive ? (', '{running ? (')
t = t.replace('''            {showActive ? (\n              <span className="inline-flex items-center gap-1.5 rounded-full bg-success/15 px-2.5 py-0.5 text-[11px] font-bold text-success">\n                <span className="h-1.5 w-1.5 rounded-full bg-success pulse-dot" />\n                Actief\n              </span>\n            ) : onTime ? (''', '''            {running ? (\n              <span className="inline-flex items-center gap-1.5 rounded-full bg-success/15 px-2.5 py-0.5 text-[11px] font-bold text-success">\n                <span className="h-1.5 w-1.5 rounded-full bg-success pulse-dot" /> Actief\n              </span>\n            ) : expiredOpen ? (\n              <span className="inline-flex items-center gap-1 rounded-full bg-warning/15 px-2.5 py-0.5 text-[11px] font-bold text-warning">⏱ Tijd verstreken</span>\n            ) : onTime ? (''')
p.write_text(t)

# PREMIUM — more meaningful feature set and no unverifiable social-proof claim.
p = Path("src/pages/Premium.tsx")
t = p.read_text()
t = t.replace('''const features = [\n  "Onbeperkte favorieten",\n  "Volledige historiek",\n  "Meerdere voertuigen",\n  "Dubbele waarschuwingen",\n  "Live timer-widget",\n];''', '''const features = [\n  "Volledige en langere parkeerhistoriek",\n  "Meerdere voertuigen en favorieten",\n  "Extra timerwaarschuwingen en live widget",\n  "PDF-export van je parkeerhistoriek",\n  "Premium community-inzichten wanneer beschikbaar",\n];''')
t = t.replace('Parkeer slimmer, nooit meer een boete', 'Meer overzicht, waarschuwingen en historiek')
t = t.replace('Meer dan 500 Kortrijkse chauffeurs', 'Veilig betalen via Stripe · op elk moment opzegbaar')
p.write_text(t)

print("Best-of v2 patches applied")
