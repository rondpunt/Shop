# Shop&Go Kortrijk — Production checklist

Production app tree: **repository root** (`src/`, `api/`, `supabase/`, `android/`).  
Deploy target: static PWA (`npm run build:pwa` → `dist/`) + serverless/API routes where configured.

## Environment variables

### Client (safe to expose — set in Netlify/Vercel *build* env)

| Variable | Purpose |
|----------|---------|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase anon key |
| `VITE_SUPABASE_PROJECT_ID` | Used for edge functions fallback (maps-config, parko) |
| `VITE_GOOGLE_MAPS_PLATFORM_KEY` | Optional Google Maps JS key (HTTP referrer–restricted) |
| `VITE_PAYMENTS_CLIENT_TOKEN` | Stripe **publishable** key (`pk_test_…` or `pk_live_…`) |

If `VITE_GOOGLE_MAPS_PLATFORM_KEY` is missing, the home map **automatically falls back to OpenStreetMap (Leaflet + CARTO dark tiles)** — no blank map.

### Server-only (never `VITE_` prefix)

| Variable | Purpose |
|----------|---------|
| `SUPABASE_SERVICE_ROLE_KEY` | Auth verification in `/api/*` routes |
| `STRIPE_SECRET_KEY` | Stripe Checkout + Customer Portal (`sk_test_…` recommended first) |
| `APP_ORIGIN` | Trusted origin for Stripe return URLs, e.g. `https://shopgo-kortrijk-denkstof.netlify.app` |
| `GEMINI_API_KEY` | Optional AI assistant |

### Stripe setup (test mode first)

1. Create Products/Prices in [Stripe Dashboard](https://dashboard.stripe.com/test/products):
   - **Premium monthly** — €3,99/month — lookup key: `premium_monthly`
   - **Premium yearly** — €29,99/year — lookup key: `premium_yearly`
2. Set `VITE_PAYMENTS_CLIENT_TOKEN=pk_test_…` and `STRIPE_SECRET_KEY=sk_test_…`
3. Set `APP_ORIGIN` to your deployed URL (exact scheme + host)
4. **Webhook (recommended for production):**  
   - Endpoint: your backend `/api/stripe-webhook` (TODO: wire when deploying) or Supabase `check-subscription` polling  
   - Events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`  
   - Secret: `STRIPE_WEBHOOK_SECRET` — **do not commit**

Checkout uses **Embedded Checkout** (`ui_mode: embedded`) via `/api/checkout`. When env is configured, the paywall no longer shows a hard “not enabled” dead end.

## Web vs Google Play billing

| Channel | Billing | Notes |
|---------|---------|-------|
| **PWA / web** | **Stripe** | `VITE_PAYMENTS_CLIENT_TOKEN` + server secret. Works in browser. |
| **Google Play (Android)** | **Play Billing** | Stripe checkout is **disabled** in native Capacitor builds (`isNativeStoreBuild()`). Use Play Billing Library (linked in Play flavor). |
| **Galaxy Store** | Store IAP | Separate seller configuration; no Stripe in store binaries. |

Do not expose Stripe digital checkout inside store-distributed APKs — Google policy requires Play Billing for in-app digital subscriptions.

Pricing constants live in `src/lib/pricing.ts` (currently **€3,99/maand**, **€29,99/jaar**).

## Maps

1. **Preferred:** set `VITE_GOOGLE_MAPS_PLATFORM_KEY` with Maps JavaScript API enabled, referrer-restricted to your domain.
2. **Fallback:** OpenStreetMap via Leaflet — always available, shows parking pins with free/full state.
3. **Legacy:** Supabase `maps-config` edge function can return a browser key if configured.

## Local verification

```bash
cp .env.example .env.local
# Fill Supabase + optional Maps/Stripe test keys

npm install
npm run dev          # Express + Vite (API routes on same origin)
# or
npm run dev:frontend # Vite only (Parko via /api needs proxy or Supabase)

npm test
npm run build:pwa
```

### Manual checks

- [ ] Home map renders (Google or OSM badge) with green/orange/red pins  
- [ ] `/zones` list shows live Parko data  
- [ ] Free user: 1 car, 8 favorites max, single reminder, 60-day history  
- [ ] Premium paywall shows €3,99 / €29,99 and “goedkoper dan één boete”  
- [ ] With Stripe test keys: checkout modal opens (Embedded Checkout)  
- [ ] Without Stripe keys: clear config message, trial still works via Supabase RPC  

## Freemium rules (code: `src/lib/premiumLimits.ts`)

| Feature | Free | Premium |
|---------|------|---------|
| Timer (30 min) | ✅ | ✅ |
| Vehicles | 1 | Unlimited |
| Favorites | 8 | Unlimited |
| History | 60 days | Full + PDF |
| Reminders | 1 | Double/custom |
| Live widget | — | Android Premium |

Soft prompts appear at: 2nd car, favorites limit, reminder settings (double warning).
