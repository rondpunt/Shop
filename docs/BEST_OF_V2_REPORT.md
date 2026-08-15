# Shop&Go Kortrijk — Best-of v2 implementatierapport

Datum: 15 augustus 2026  
Werkbranch: `import-parkv3-clean`  
Doelhost: Vercel  
Frontend: React + Vite + PWA  
Backend: Supabase + Vercel Functions  
Kaart: Google Maps  
Live parkingbron: Parko Shop&Go-sensoren

## 1. Doel van deze herbouw

Deze versie combineert de beste onderdelen van twee eerdere codebases:

- **Google Studio / Parkv3** als moderne basis voor kaart, live Parko-data, Google-integratie en nieuwere UI.
- **Lovable / kortrijk shop&go timer** als bron voor de sterkere parking lifecycle: sessies, historie, auto's, reminders, local-first opslag, Premium en communitysignalen.

De app is niet langer afhankelijk van Lovable-hosting. Lovable is alleen gebruikt als bron om verloren functionaliteit terug te vinden en om de bestaande Supabase-database te inspecteren/upgraden.

## 2. Nieuwe productiearchitectuur

### Vercel

Vercel serveert:

- de Vite PWA uit `dist/`;
- alle SPA-routes via `index.html`;
- `/api/parko-states`;
- `/api/shopgo-spots`;
- `/api/checkout`;
- `/api/customer-portal`;
- `/api/check-subscription`;
- `/api/gemini/assistant`.

De oude Express-server blijft alleen als legacy/lokale fallback aanwezig en is niet nodig voor de Vercel-productiebuild.

### Supabase

Supabase blijft verantwoordelijk voor:

- authenticatie;
- voertuigen;
- parking-sessies;
- historie;
- abonnementstatus;
- server-side Premium trial;
- communitymeldingen;
- geaggregeerde voorspellingen van mogelijk vrijkomende plaatsen.

### Parko

Parko blijft de **leidende bron voor actuele beschikbaarheid**. Communitydata of app-timers mogen nooit een officiële sensorstatus overschrijven.

## 3. Parkinglogica — hersteld en verbeterd

Een parking is opnieuw een echte sessie met:

- `started_at`;
- `ends_at`;
- `ended_at`;
- voertuig;
- GPS-coördinaten;
- adres/zone;
- `spot_id`;
- notitie;
- optionele foto.

### Local-first

Zonder account blijven auto's en sessies lokaal bruikbaar. Met account worden ze via Supabase bewaard. `spot_id` wordt nu ook lokaal bijgehouden zodat context niet verloren gaat.

### Historiekfout opgelost

Een oude fout markeerde een niet handmatig afgesloten sessie ook na het verstrijken van de 30 minuten nog als **Actief**.

Nieuwe staten:

- **Actief** — timer loopt echt nog;
- **Tijd verstreken** — timer is verlopen maar sessie werd niet expliciet afgesloten;
- **Op tijd** — gebruiker beëindigde binnen 30 minuten;
- **Te laat** — expliciet beëindigde sessie duurde langer dan 30 minuten.

## 4. Live + community = betere kansinschatting

De app toont drie informatielagen apart:

1. **Nu vrij** — officiële Parko-sensordata.
2. **Community** — recente meldingen van bestuurders: `Net vrij`, `Druk`, `Vol`.
3. **Mogelijk binnenkort vrij** — geaggregeerd uit actieve app-timers.

### Nieuwe voorspelling

Per Parko-zone kan de backend anoniem aggregeren:

- actieve timers;
- mogelijk vrij binnen 5 minuten;
- mogelijk vrij binnen 5–10 minuten;
- recent verlopen timers.

Belangrijk: **mogelijk vrij** is bewust geen reservatie en geen garantie.

### Privacy

Publieke clients krijgen geen:

- user ID;
- exacte gebruikers-GPS uit een melding;
- notities;
- individuele sessietimestamps.

De publieke RPC's geven alleen veilige meldingsvelden of aggregaten terug.

## 5. Databasebeveiliging

RLS is aangescherpt voor persoonlijke data.

Bij updates van `profiles`, `sessions` en `spot_reports` worden nu zowel `USING` als `WITH CHECK` gebruikt zodat een gebruiker een record niet kan herassignen aan iemand anders.

De automatische session-start/session-end triggers draaien als `SECURITY INVOKER`; daar is geen privilege-escalatie nodig.

De twee publieke community-RPC's gebruiken alleen waar nodig `SECURITY DEFINER`, hebben een beperkte output en hun standaard `PUBLIC`-execute-recht is expliciet ingetrokken voordat alleen de bedoelde rollen execute krijgen.

## 6. Design- en layoutcorrecties

### Hoofdnavigatie

De oude drie-tabnavigatie is vervangen door een compact zwevend mobiel dock:

- Kaart;
- Historiek;
- Favorieten;
- Meer.

Historiek is hierdoor een hoofdtaak in plaats van verstopt in instellingen.

### Kaart + bottom sheet

De kaart blijft fullscreen, maar de bottom sheet houdt nu rekening met:

- safe-area;
- het zwevende navigatiedock;
- grotere inhoud in half-open toestand;
- duidelijkere live timestamp.

### Aanbevolen locatie

Een belangrijke semantische fout is opgelost: de oude knop heette **Navigeer**, maar opende in werkelijkheid de 30-minutentimer.

Nieuwe acties:

- **Route** — start echte navigatie;
- **Ik sta hier · start 30 min** — start de parkeerflow.

De kaartkaart toont daarnaast compact:

- officiële vrije plaatsen;
- mogelijke vrijkomende plaatsen;
- recente communityactiviteit.

### Locatiedetail

De actiehiërarchie is gecorrigeerd:

1. na parkeren is **Ik parkeer hier · start 30 min** de primaire actie;
2. **Navigeer naar deze locatie** is secundair;
3. community/forecast-inzicht staat bij de live status.

De half-afgewerkte tijdstip-gebaseerde `predictive.ts`-voorspelling wordt niet meer in dit scherm gebruikt. We tonen geen pseudo-live bezettingspercentage dat niet uit echte data komt.

### Actieve sessie

`/session/:id` wordt nu als echte fullscreen mobiele ervaring behandeld zodat de grote countdown centraal blijft en niet door een standaard paginaheader wordt ingedrukt.

### Visuele polish

Een aparte `best-of-v2.css`-laag voegt toe:

- smart chips;
- sterkere aanbevolen-locatiekaart;
- subtiele depth/glass-effecten;
- Premium sheen;
- standalone-PWA gedrag;
- reduced-motion respect.

Deze laag staat apart van het bestaande design system zodat een regressie eenvoudig terug te draaien is.

## 7. Installeerbare PWA

De PWA-configuratie is uitgebreid met:

- `display: standalone`;
- portrait orientation;
- eigen theme/background kleuren;
- maskable icon;
- start URL en scope;
- shortcuts naar Kaart en Historiek;
- service worker auto-update;
- offline app-shell;
- NetworkFirst-cache voor Parko live;
- expliciete installatiekaart in Instellingen wanneer het platform dit ondersteunt.

Op Android verschijnt de browser-native installatieprompt. Op iOS toont de app instructies voor **Delen → Zet op beginscherm**.

## 8. Premium en aankopen

De bestaande Lovable-monetisatie is behouden maar technisch steviger gemaakt.

### Plannen

- **€1,99 / maand**
- **€14,99 / jaar**
- **7 dagen gratis proefperiode**

Stripe-prijzen worden server-side opgezocht via lookup keys:

- `premium_monthly`
- `premium_yearly`

### Premiumwaarde

Premium is gericht op power-userfunctionaliteit, niet op het blokkeren van de basisparkingfunctie:

- langere/volledige historiek;
- meerdere voertuigen;
- uitgebreidere favorieten;
- extra timerwaarschuwingen/live widget;
- PDF-export;
- uitgebreidere community-inzichten wanneer gebruikt.

### Trial beveiliging

De proefperiode stond vroeger alleen in `localStorage` en kon dus eenvoudig worden gereset.

Nu:

- staat `trial_ends_at` server-side in `profiles`;
- kan een proefperiode slechts één keer worden gestart;
- kan de gebruiker ze beëindigen zonder ze opnieuw te kunnen resetten;
- telt de server-side trial mee in `is_premium()`.

### Stripe

De Vercel checkout gebruikt echte Stripe Embedded Checkout met `ui_mode: embedded`.

Billing Portal is beschikbaar voor abonnementbeheer/opzegging.

**PWA-opmerking:** dit is webbetaling via Stripe. Als de Capacitor-versie later als native digitale abonnementsapp in Google Play wordt gepubliceerd, moet de dan geldende Play Billing-policy apart worden beoordeeld en eventueel Google Play Billing worden toegevoegd.

## 9. Vercel Functions toegevoegd

- `api/parko-states.ts`
- `api/shopgo-spots.ts`
- `api/checkout.ts`
- `api/customer-portal.ts`
- `api/check-subscription.ts`
- `api/gemini/assistant.ts`
- `api/_shared.ts`

Hierdoor is de PWA niet meer afhankelijk van een continu draaiende Express-server.

## 10. Vereiste Vercel environment variables

Publiek/browser:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY
VITE_SUPABASE_PROJECT_ID
VITE_PAYMENTS_CLIENT_TOKEN
GOOGLE_MAPS_PLATFORM_KEY
```

Server-only:

```text
SUPABASE_SERVICE_ROLE_KEY
STRIPE_SECRET_KEY
GEMINI_API_KEY
GEMINI_MODEL=gemini-3.5-flash
```

`SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY` en `GEMINI_API_KEY` mogen nooit met een `VITE_` prefix naar de browser worden gestuurd.

## 11. Bestaande backend

De database van het bestaande `kortrijk shop&go timer`-project is gecontroleerd en bevatte al:

- profiles;
- sessions;
- subscriptions;
- spot_reports;
- `trial_ends_at`;
- `start_trial`;
- `is_premium`.

De best-of-v2 community/RLS/trial-upgrade is rechtstreeks op deze bestaande database toegepast zonder tabellen te verwijderen.

Voor maximale onafhankelijkheid kan deze database later nog naar een volledig eigen Supabase-project worden gemigreerd. Voor **hosting** is Lovable nu niet meer nodig.

## 12. Vercel-status

Er bestaat al een Vercel-project:

```text
shopgo-kortrijk
```

De productie-deployment die tijdens deze audit zichtbaar was, kwam nog van de oudere `cursor/app-overhaul-fc4b` bron/commit en bevat dus **niet automatisch deze nieuwe branch**.

Daarom is `main` bewust nog niet overschreven vanuit deze herbouwbranch. Eerst moet de nieuwe branch naar `main` worden gebracht of als preview aan het Vercel-project worden gekoppeld.

## 13. Automatische kwaliteitscontrole

GitHub CI controleert voortaan bij pushes/PR's:

1. `npm ci`;
2. TypeScript frontend;
3. TypeScript van Vercel `/api` functions;
4. volledige installable PWA-build.

De twee grote herbouwrondes zijn reeds met geslaagde TypeScript- en PWA-builds gevalideerd.

## 14. Belangrijkste fouten die zijn opgelost

- `Navigeer` startte feitelijk een timer in plaats van navigatie.
- verlopen niet-afgesloten parking bleef ten onrechte **Actief**.
- Vercel-frontend was eerder losgekoppeld van API's die nog in `server.ts` zaten.
- Stripe Embedded Checkout gebruikte een foutieve/legacy `ui_mode`.
- Premium trial was client-side resetbaar.
- communitylogica kon te makkelijk impliceren dat iets vrij was wanneer er gewoon geen melding was.
- community-data had een onnodig risico op blootstelling van ruwe gebruikersvelden.
- locatie-detail importeerde een tijdstip-gebaseerde voorspeller maar gebruikte geen betrouwbare voorspelling in de UI.
- historiek stond te diep in de navigatie.
- PWA-manifest was te minimaal voor een verzorgde standalone installatie.
- RLS update policies misten op meerdere plaatsen `WITH CHECK`.

## 15. Wat nog vóór productie-release gecontroleerd moet worden

### Vercel

- Git-repository/production branch koppelen aan `rondpunt/Shop` + `main`.
- Alle environment variables invullen.
- Previewdeployment openen op een echte Android-telefoon.

### Stripe

- controleren of lookup keys `premium_monthly` en `premium_yearly` bestaan;
- sandbox en live keys niet mengen;
- één echte testcheckout doen;
- Billing Portal testen;
- webhook/syncgedrag na betaling controleren.

### Supabase

- login/logout testen vanaf de nieuwe Vercel-domain;
- OAuth redirect URLs bijwerken naar de Vercel-domain;
- trial starten en tweede start blokkeren testen;
- cloudsession start/einde testen en communityrapport verifiëren.

### Parking

- Parko live endpoint gedurende meerdere refresh-cycli testen;
- vrije/bezet-status vergelijken met de officiële bron;
- GPS en route op locatie testen;
- actieve timer met schermvergrendeling/notificaties testen;
- 30-minuten-verloop en historiekstatus testen.

### PWA

- installeren vanuit Chrome op Android;
- standalone openen;
- service-worker update testen;
- offline app-shell testen;
- terug online live data laten vernieuwen.

## 16. Releasebeslissing

De code op `import-parkv3-clean` is de nieuwe **Best-of v2 releasecandidate**.

`main` blijft bewust onaangeraakt totdat de releasecandidate als preview is gecontroleerd. Daarna kan deze branch de basis worden voor de productieversie op Vercel.
