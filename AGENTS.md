# AGENTS.md

Shop&Go Kortrijk — React/Vite PWA with an Express/Vercel API layer, Supabase (auth + DB),
Stripe (web premium), Google Maps, and a Gemini assistant; also packaged for Android via Capacitor.

Standard commands live in `package.json` and `README.md`; prefer those over duplicating here.

## Cursor Cloud specific instructions

### Running the app
- Full-stack dev server: `npm run dev:legacy` (Express `server.ts` + Vite middleware) on port `3000`,
  serving the SPA and the `/api/*` routes together. `npm run dev` is frontend-only (no `/api`).
- The core app (live Parko data, curated spots, local-storage timer/cars) works with **no secrets**.
  Supabase/Stripe/Maps/Gemini keys are optional; the server fails closed when they are missing.
- `server.ts` and the Vercel functions in `api/` share the hardened helpers in `api/_shared.ts`
  (auth required on payment/AI endpoints, return-URL validation, generic 5xx, security headers).
  Keep the two paths in sync when changing API behavior.

### Optional: local Supabase for auth + database testing (no cloud keys needed)
Docker is **not** preinstalled. To exercise real login and DB-backed features locally:
1. Install Docker (this VM needs `fuse-overlayfs` + `iptables-legacy`; for Docker 29 set
   `/etc/docker/daemon.json` storage-driver `fuse-overlayfs` and `features.containerd-snapshotter=false`),
   start `dockerd`, and `sudo chmod 666 /var/run/docker.sock`.
2. `npx supabase start` (the CLI is available via `npx`; it applies `supabase/migrations` automatically).
   Get connection details with `npx supabase status -o env`. Studio: `:54323`, mailbox (Mailpit): `:54324`.
3. Point the **browser** client at Supabase **same-origin** through the app's built-in dev proxy to avoid
   CSP/CORS/mixed-content issues:
   - In `.env` (git-ignored): `VITE_SUPABASE_URL=http://127.0.0.1:3000/sb` and the local
     `VITE_SUPABASE_PUBLISHABLE_KEY` / `SUPABASE_SERVICE_ROLE_KEY` from `supabase status`.
   - Launch with the proxy target: `DEV_SUPABASE_PROXY_TARGET=http://127.0.0.1:54321 npm run dev:legacy`.
     The `/sb/*` proxy is dev-only and fully inert in production (gated by `NODE_ENV`).
4. Gotchas that cost real time:
   - **Origin must match.** The browser origin and `VITE_SUPABASE_URL` host must be identical
     (`127.0.0.1` ≠ `localhost` for CSP `'self'`). Use `127.0.0.1:3000` consistently.
   - **Service workers.** A previous production build (`start:legacy`) registers a service worker that
     caches the old bundle/headers. When switching back to dev, unregister it and clear site data, or
     you will see stale CSP/`Failed to fetch` errors.
   - The default local auth email sends a **magic link**, not a 6-digit code. The app's UI expects a
     6-digit code (`verifyOtp` type `email`). To test the code UI, temporarily add an
     `[auth.email.template.magic_link]` template containing `{{ .Token }}` to `supabase/config.toml`
     and `npx supabase stop && npx supabase start`. Do **not** commit that change (it alters the
     product's login email).

### Testing / verifying
- `npm run lint`, `npm run test` (Vitest), `npm run build` / `npm run build:legacy`.
- RLS is enforced: an anonymous or non-owner request to `public.cars`/`sessions` is denied. Verify DB
  state directly with `docker exec supabase_db_<project> psql -U postgres -d postgres -c '...'`.

### Hosting
- Vercel: committed `vercel.json` + `api/` functions.
- Any Node host (single web service): `render.yaml` blueprint — build `npm ci --include=dev &&
  npm run build:legacy`, start `npm run start:legacy`, health check `/api/shopgo-spots`. The server
  binds to `0.0.0.0:$PORT`. A persistent public URL requires connecting the host account/credentials.
