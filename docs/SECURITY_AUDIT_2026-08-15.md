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
