from pathlib import Path


def replace(path, old, new):
    p = Path(path)
    text = p.read_text()
    if old not in text:
        raise RuntimeError(f"Expected block not found in {path}: {old[:100]!r}")
    p.write_text(text.replace(old, new))

# Premium: server-side trial calls are async and require an account.
replace(
    "src/pages/Premium.tsx",
    '  const [openingPortal, setOpeningPortal] = useState(false);',
    '  const [openingPortal, setOpeningPortal] = useState(false);\n  const [trialBusy, setTrialBusy] = useState(false);'
)
replace(
    "src/pages/Premium.tsx",
    '''  const handleStartTrial = () => {\n    startTrial();\n    success();\n    MarketingSuite.trackEvent("premium_trial_started");\n    Logger.marketing("CONVERSION", "User started a 7-day premium free trial");\n    toast.success("🎉 7 dagen Premium gestart", {\n      description: "Geen betaling nu. Na 7 dagen vervalt Premium automatisch.",\n    });\n  };''',
    '''  const handleStartTrial = async () => {\n    if (!user) {\n      warning();\n      toast.info("Meld je eerst aan om je gratis proefperiode te starten.");\n      navigate(`/auth?redirect=${encodeURIComponent("/premium")}`);\n      return;\n    }\n    setTrialBusy(true);\n    try {\n      await startTrial();\n      success();\n      MarketingSuite.trackEvent("premium_trial_started");\n      Logger.marketing("CONVERSION", "User started a server-side 7-day premium trial");\n      toast.success("🎉 7 dagen Premium gestart", {\n        description: "Geen betaling nu. Na 7 dagen vervalt Premium automatisch.",\n      });\n    } catch (e) {\n      warning();\n      toast.error("Proefperiode kon niet starten", {\n        description: e instanceof Error ? e.message : "Probeer opnieuw.",\n      });\n    } finally {\n      setTrialBusy(false);\n    }\n  };\n\n  const handleCancelTrial = async () => {\n    setTrialBusy(true);\n    try {\n      await cancel();\n      tap();\n      toast.info("Proefperiode gestopt");\n    } catch (e) {\n      warning();\n      toast.error("Proefperiode kon niet worden gestopt", {\n        description: e instanceof Error ? e.message : "Probeer opnieuw.",\n      });\n    } finally {\n      setTrialBusy(false);\n    }\n  };'''
)
replace(
    "src/pages/Premium.tsx",
    '''                onClick={() => { cancel(); tap(); toast.info("Proefperiode gestopt"); }}\n                className="btn-pill-outline w-full"''',
    '''                onClick={handleCancelTrial}\n                disabled={trialBusy}\n                className="btn-pill-outline w-full"'''
)
replace(
    "src/pages/Premium.tsx",
    '''                onClick={handleStartTrial}\n                className="btn-pill-primary w-full"\n              >\n                Start 7 dagen gratis <ArrowRight className="h-5 w-5" />''',
    '''                onClick={handleStartTrial}\n                disabled={trialBusy}\n                className="btn-pill-primary w-full"\n              >\n                {trialBusy ? <Loader2 className="h-5 w-5 animate-spin" /> : (<>Start 7 dagen gratis <ArrowRight className="h-5 w-5" /></>)}'''
)

# Premium hook: force a rerender every minute so trial expiry/days-left update while open.
replace(
    "src/hooks/usePremium.ts",
    '  const [trialEndsAt, setTrialEndsAt] = useState<number | null>(null);',
    '  const [trialEndsAt, setTrialEndsAt] = useState<number | null>(null);\n  const [, setClock] = useState(() => Date.now());'
)
replace(
    "src/hooks/usePremium.ts",
    '''    const id = window.setInterval(() => {\n      setTrialEndsAt((current) => current && current <= Date.now() ? current : current);\n    }, 60_000);''',
    '''    const id = window.setInterval(() => setClock(Date.now()), 60_000);'''
)

# Settings: show explicit PWA installation UI when the browser supports it.
replace(
    "src/pages/Settings.tsx",
    'import { PageHeader } from "@/components/PageHeader";',
    'import { PageHeader } from "@/components/PageHeader";\nimport { PwaInstallCard } from "@/components/PwaInstallCard";'
)
replace(
    "src/pages/Settings.tsx",
    '''      <SectionTitle>App</SectionTitle>\n      <Card>\n        <NavRow icon={Languages} label="Taal" value="NL" />\n        <ToggleRow icon={Moon} label="Donkere modus" checked={isDarkMode} onToggle={toggleDark} />\n        <ToggleRow icon={Smartphone} label="Notificaties" checked={notifications} onToggle={toggleNotifications} />\n      </Card>''',
    '''      <SectionTitle>App</SectionTitle>\n      <Card>\n        <NavRow icon={Languages} label="Taal" value="NL" />\n        <ToggleRow icon={Moon} label="Donkere modus" checked={isDarkMode} onToggle={toggleDark} />\n        <ToggleRow icon={Smartphone} label="Notificaties" checked={notifications} onToggle={toggleNotifications} />\n      </Card>\n      <PwaInstallCard />'''
)

# Supabase generated types: keep local schema types aligned with the production backend additions.
p = Path("src/integrations/supabase/types.ts")
t = p.read_text()
for section in ("Row", "Insert", "Update"):
    # Three occurrences are inside profiles only; patch by contextual field around provider/updated_at.
    pass
# Contextual replacements are intentionally explicit.
t = t.replace('''          provider: string | null\n          updated_at: string\n        }\n        Insert:''', '''          provider: string | null\n          trial_ends_at: string | null\n          updated_at: string\n        }\n        Insert:''')
t = t.replace('''          provider?: string | null\n          updated_at?: string\n        }\n        Update:''', '''          provider?: string | null\n          trial_ends_at?: string | null\n          updated_at?: string\n        }\n        Update:''', 1)
t = t.replace('''          provider?: string | null\n          updated_at?: string\n        }\n        Relationships: []\n      }\n      sessions:''', '''          provider?: string | null\n          trial_ends_at?: string | null\n          updated_at?: string\n        }\n        Relationships: []\n      }\n      sessions:''')
t = t.replace('''    Functions: {\n      increment_discovered_spot_visit: {\n        Args: { _spot_id: string }\n        Returns: undefined\n      }\n    }''', '''    Functions: {\n      cancel_trial: { Args: Record<PropertyKey, never>; Returns: undefined }\n      get_spot_forecast_public: {\n        Args: Record<PropertyKey, never>\n        Returns: { spot_id: string; active_sessions: number; departing_5m: number; departing_10m: number; overdue_sessions: number }[]\n      }\n      get_spot_reports_public: {\n        Args: { _spot_id: string; _minutes?: number }\n        Returns: { id: string; spot_id: string; status: string; created_at: string }[]\n      }\n      increment_discovered_spot_visit: { Args: { _spot_id: string }; Returns: undefined }\n      is_premium: { Args: { _user_id: string }; Returns: boolean }\n      start_trial: { Args: Record<PropertyKey, never>; Returns: string }\n    }''')
p.write_text(t)

print("Final polish applied")
