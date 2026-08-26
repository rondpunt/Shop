# Deploy Shop&Go Kortrijk on Render

## Branch to deploy

Use **`cursor/setup-dev-environment-deee`**, not `main`:

| Branch | `render.yaml` | Security hardening |
| --- | --- | --- |
| `main` | **missing** | older |
| `cursor/setup-dev-environment-deee` | **yes** | Express/Vercel API parity, `render.yaml`, Replit env docs |

Repo: https://github.com/rondpunt/Shop.git

## Render MCP (Cursor)

Cloud agents cannot complete Render MCP OAuth. In the **Cursor desktop IDE**:

1. **Settings → Tools & MCP → Render → Connect**
2. Retry agent deploy, or use the dashboard / API script below.

## Option A — Blueprint (dashboard, recommended)

1. Open https://dashboard.render.com/blueprints
2. **New → Blueprint**
3. Connect GitHub and select **rondpunt/Shop**
4. **Branch:** `cursor/setup-dev-environment-deee`
5. **Blueprint path:** `render.yaml` (repo root)
6. Review the planned `shopgo-kortrijk` web service (Frankfurt, free, health `/api/shopgo-spots`)
7. **Deploy Blueprint**
8. After creation, open the service → **Environment** and set secrets (see checklist below)
9. **Manual Deploy** (blueprint sets `autoDeploy: false`)

Expected URL: `https://shopgo-kortrijk.onrender.com` (or the name Render assigns).

## Option B — API script

1. Create an API key: https://dashboard.render.com/u/settings#api-keys
2. Copy secrets into a local file (never commit):

```bash
cp .env.render.example .env.render
# edit .env.render — paste full Replit/Supabase/Stripe values
```

3. Run:

```bash
export RENDER_API_KEY='rnd_...'
export RENDER_ENV_FILE='.env.render'
chmod +x scripts/render-deploy.sh
./scripts/render-deploy.sh
```

The script creates the service if needed, merges env vars, triggers a deploy, and curls `/api/shopgo-spots`.

## Environment variables

Only variables this app reads (see `.env.example` and `docs/REPLIT_ENV_MIGRATION.md`).

### Set now (known / non-secret)

| Variable | Value |
| --- | --- |
| `NODE_ENV` | `production` |
| `GEMINI_MODEL` | `gemini-3.5-flash` |
| `VITE_SUPABASE_URL` | `https://pfxcqfwkdzmcrgbajqch.supabase.co` |
| `VITE_SUPABASE_PROJECT_ID` | `pfxcqfwkdzmcrgbajqch` |
| `APP_ORIGIN` | `https://shopgo-kortrijk.onrender.com` (match your live URL) |

### Need full values (from Replit or provider dashboards)

| Variable | Source |
| --- | --- |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Replit `VITE_SUPABASE_PUBLISHABLE_KEY` (`sb_publishable_…`) |
| `VITE_GOOGLE_MAPS_PLATFORM_KEY` | Replit Maps key (`AIza…`) |
| `VITE_PAYMENTS_CLIENT_TOKEN` | Replit mislabeled `SUPABASE_SERVICE_ROLE_KEY` if value is `pk_live_…` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API → **service_role** (`eyJ…`) |
| `STRIPE_SECRET_KEY` | Stripe → Developers → Secret key (`sk_live_…` or `sk_test_…`) |
| `GEMINI_API_KEY` | Optional — AI assistant only |

**Do not set:** `CLERK_*`, `SESSION_SECRET` (not used by this app).

After changing any `VITE_*` variable, trigger a **new deploy** so Vite embeds them at build time.

## Verify

```bash
curl -sS -o /dev/null -w '%{http_code}\n' https://shopgo-kortrijk.onrender.com/api/shopgo-spots
# expect 200
```

Free tier services spin down after ~15 minutes idle; first request may take 30–60s.

## What works without secrets

- Live Parko data, curated spots, local timer/cars, static PWA shell

## What needs secrets

| Feature | Required vars |
| --- | --- |
| Supabase login / DB cars/sessions | `VITE_SUPABASE_*` + `SUPABASE_SERVICE_ROLE_KEY` |
| Google Maps | `VITE_GOOGLE_MAPS_PLATFORM_KEY` |
| Stripe premium (web) | `VITE_PAYMENTS_CLIENT_TOKEN` + `STRIPE_SECRET_KEY` + `APP_ORIGIN` |
| Gemini assistant | `GEMINI_API_KEY` |
