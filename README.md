# Shop&Go Kortrijk

Progressive web app that helps drivers find the 30‑minute free **Shop & Go** parking bays in
Kortrijk, start a timer, and see live Parko sensor availability. Built with React + Vite, an
Express/Vercel API layer, Supabase, Stripe (web premium), Google Maps, and a Gemini assistant.
It is also packaged as an Android app via Capacitor.

## Requirements

- Node.js 22+
- npm

## Getting started

```bash
npm ci
npm run dev:legacy   # full-stack dev server (Express + Vite) on http://localhost:3000
```

`npm run dev:legacy` serves both the React frontend and the `/api/*` routes, matching production.
`npm run dev` runs the Vite frontend only (no `/api` routes).

The core experience (interactive map, **live Parko availability**, and the local‑storage timer/cars
flow) works with **no configuration**. Auth, payments, the map tiles, and the AI assistant are
optional and only activate when their keys are present — the server fails closed without them.

## Configuration

Copy `.env.example` and fill in what you need. Public browser values use the `VITE_` prefix and are
embedded in the client bundle; everything else is server‑only and must never use `VITE_`.

If your secrets were exported from **Replit**, use `docs/REPLIT_ENV_MIGRATION.md` — this app does not
use Clerk or `SESSION_SECRET`, and a Stripe `pk_live_…` value must not be pasted into
`SUPABASE_SERVICE_ROLE_KEY`.

| Variable | Scope | Purpose |
| --- | --- | --- |
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID` | public | Supabase auth + cloud sync |
| `VITE_GOOGLE_MAPS_PLATFORM_KEY` | public | Google Maps tiles |
| `VITE_PAYMENTS_CLIENT_TOKEN` | public | Stripe publishable key (web premium) |
| `SUPABASE_SERVICE_ROLE_KEY` | server | Verifies bearer sessions on `/api/*` |
| `STRIPE_SECRET_KEY` | server | Stripe checkout / billing portal |
| `GEMINI_API_KEY`, `GEMINI_MODEL` | server | AI parking assistant |
| `APP_ORIGIN` | server | Trusted origin used to validate Stripe return URLs |

## Scripts

| Script | Description |
| --- | --- |
| `npm run dev:legacy` | Full-stack dev server (Express + Vite) on port 3000 |
| `npm run dev` | Vite frontend only |
| `npm run build` | Production PWA build to `dist/` (static hosting, e.g. Vercel) |
| `npm run build:legacy` | Build the PWA **and** bundle the Express server to `dist/server.cjs` |
| `npm run start:legacy` | Run the bundled full-stack server (`NODE_ENV=production`) |
| `npm run lint` / `npm run test` | ESLint / Vitest |

## Hosting

The server binds to `0.0.0.0:$PORT` (falling back to `3000`) and applies the same security headers
in Express that `vercel.json` applies on Vercel, so the security posture is identical on either host.

- **Vercel** (static + serverless `api/`): the committed `vercel.json` builds with `build:pwa` and
  serves the hardened functions in `api/`. Set the environment variables above in the project.
- **Render / any Node host** (single full-stack web service): use the committed `render.yaml`
  Blueprint, or configure manually:
  - Build: `npm ci --include=dev && npm run build:legacy`
  - Start: `npm run start:legacy`
  - Health check: `/api/shopgo-spots`
  - Set `APP_ORIGIN` to the service's public URL.

## Security

`/api/*` (both the Vercel functions in `api/` and the Express `server.ts`) share the hardened helpers
in `api/_shared.ts`:

- payment and AI endpoints require a valid Supabase bearer session;
- Stripe customers are bound to the authenticated user via `metadata.shopgoUserId`;
- checkout is restricted to known price lookup keys;
- Stripe return URLs are validated against `APP_ORIGIN`;
- request bodies are size‑limited and 5xx responses never leak internals;
- CSP, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, and
  `Cross-Origin-Opener-Policy` are set on every response.

See `docs/SECURITY_AUDIT_2026-08-15.md` for the full audit.
