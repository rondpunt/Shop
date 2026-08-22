# Shop&Go Kortrijk — Security Audit

Audit date: 2026-08-15
Release channel: Best-of beta

## Scope
- Git repository and secret hygiene
- Vercel API functions and response headers
- Supabase authentication, RLS and public RPC surfaces
- Google Maps/Parko integrations
- Stripe web checkout
- Gemini assistant
- PWA/service worker
- Capacitor Android manifest and store build configuration

## Critical / high findings resolved

### 1. AI endpoint could consume paid quota anonymously — FIXED
The Vercel Gemini endpoint now requires a valid Supabase bearer session before making an AI request. Request body/text/history sizes are bounded and server failures no longer expose internal details. The client now sends its authenticated access token.

### 2. Stripe return URL was client-controlled — FIXED
Checkout and Billing Portal return URLs are validated against a trusted current/configured app origin. Only known Premium lookup keys are accepted. Auth remains mandatory and payment API responses are non-cacheable.

### 3. Supabase admin configuration used placeholder fallback values — FIXED
Server-only admin access now fails closed when the Supabase URL or service-role key is missing. No fake/placeholder admin client is created.

### 4. Legacy discovered-spots RLS was too broad — FIXED
A legacy policy allowed public table reads and authenticated updates without row ownership. Direct access is now owner-scoped. Public consumers use an anonymized SECURITY DEFINER projection that omits creator IDs. The production Shop&Go database was migrated as part of this audit.

### 5. Android manifest lacked declared location/notification permissions — FIXED
The manifest now declares only Internet, coarse/fine location and notifications. Backups and cleartext network traffic are disabled. No background-location permission is requested.

### 6. Browser Maps configuration referenced Node `process.env` — FIXED
Browser configuration now uses Vite public variables only, with the existing browser-key fallback. Server/service credentials must never use a `VITE_` prefix.

### 7. Native Android build could expose web Stripe checkout — FIXED
Stripe checkout is disabled whenever Capacitor runs on a native platform. Play and Galaxy builds use separate store channels. Google Play Billing 9.1.0 is linked only to the Play flavor. Galaxy IAP requires seller-side product configuration before it can be enabled.

### 8. Repository had no root secret ignore policy — FIXED
Root `.gitignore` now excludes environment files, keystores, signing properties, Google service configuration, Vercel metadata, logs and build output. `.env.example` contains placeholders only.

## Defensive controls added
- CSP, frame protection, MIME sniffing protection and referrer policy on Vercel.
- Permissions Policy limits browser device APIs.
- Trusted return URL validation.
- Generic 5xx responses to clients with server-side logging only.
- Request-size limits on JSON API helpers.
- RLS ownership checks using `auth.uid()`.
- Aggregated public parking forecasts rather than personal session rows.
- Store-specific Android build flavors and non-committed signing configuration.
- CI now checks production dependency audit, lint, tests, TypeScript, PWA and Android release packages.

## Expected public credentials
The following are not secrets and can appear in a client bundle when correctly restricted:
- Supabase project URL/project identifier;
- Supabase publishable/anon key;
- Google Maps browser key;
- Stripe publishable key in the web/PWA build.

The following must remain server-side/private:
- Supabase service-role key;
- Stripe secret key;
- Gemini API key;
- Android production keystore and passwords;
- future Google Play/Samsung receipt-verification credentials.

## Residual/release dependencies
These are not code vulnerabilities but must be completed for a public commercial store release:
- owner-controlled store developer accounts and legal declarations;
- production signing identity;
- Play/Samsung product identifiers;
- server-side verification credentials for store purchases;
- final public support contact/privacy URL;
- review of Google Maps browser-key restrictions and quota alerts for web/native distribution.

## Release rule
A beta is only considered releasable after the latest commit passes both CI jobs and the deployed Vercel URL passes smoke, API, browser-shape and performance checks.

---

# Follow-up audit — 2026-08-22 (self-hosted parity)

The 2026-08-15 audit hardened the Vercel serverless functions in `api/`, but the legacy
Express server in `server.ts` — used for local development and for any single-service
self-hosted deployment (e.g. Render) — still contained the pre-audit code. This pass brings the
self-hosted path to parity by routing it through the same hardened helpers in `api/_shared.ts`.

## Findings resolved in `server.ts`

### F1. AI endpoint had no authentication — FIXED
`POST /api/gemini/assistant` previously ran with no auth, allowing anonymous consumption of paid
Gemini quota. It now requires a valid Supabase bearer session and bounds request text/history size.

### F2. Stripe return URL was client-controlled — FIXED
`/api/checkout` and `/api/customer-portal` passed the client-supplied `returnUrl` straight to
Stripe (open-redirect / phishing vector). Return URLs are now validated against the trusted
`APP_ORIGIN` via `safeReturnUrl`.

### F3. Stripe customer matched by email only — FIXED
Checkout/portal/subscription lookups matched customers by email, which could bind a session to the
wrong account. Customers are now created with `metadata.shopgoUserId` and looked up by that
owner id.

### F4. Checkout accepted arbitrary price ids — FIXED
`priceId` is now restricted to an allowlist of known lookup keys (`premium_monthly`,
`premium_yearly`).

### F5. Supabase admin used placeholder fallback — FIXED
The Express server no longer instantiates a Supabase admin client from `"placeholder-key"`; it
fails closed (503) when the URL or service-role key is missing.

### F6. Verbose error messages leaked to clients — FIXED
All endpoints now return generic messages for 5xx responses; details are logged server-side only.

### F7. Security headers were Vercel-only — FIXED
`vercel.json` headers do not run when self-hosted. `server.ts` now applies the same CSP,
`X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy` and
`Cross-Origin-Opener-Policy` on every response (with `upgrade-insecure-requests` added only when
served over HTTPS). `X-Powered-By` is disabled and JSON bodies are capped at 100 kB.

## Dependency advisory (accepted, dev-only)
`npm audit` reports GHSA-67mh-4wv8-2f99 (esbuild ≤ 0.24.2 via `vite` ≤ 6.4.2). This affects only the
**Vite dev server**; production serves pre-built static assets and the bundled Express server, which
do not run esbuild's dev server. The only published fix is `vite@8` (a breaking major upgrade that
would also require updating `vite-plugin-pwa` and the SWC React plugin), so it is deferred rather
than force-applied. It is not exploitable in production.

## Hosting
The app can be self-hosted as a single Node web service (`build:legacy` + `start:legacy`, see
`render.yaml`) with the same security posture as the Vercel deployment, or on Vercel using the
committed `vercel.json` and the `api/` functions. The server binds to `0.0.0.0:$PORT`.
