# Replit secrets → Shop&Go environment variables

The Shop&Go codebase uses **Supabase auth**, not Clerk. Several names in a typical Replit
**Secrets** panel come from another stack or were mislabeled. When migrating to Render, Vercel, or a
local `.env`, copy only the variables this app reads (see `.env.example`).

## Use these (from Replit)

| Replit secret name | App variable | Notes |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | `VITE_SUPABASE_URL` | e.g. `https://pfxcqfwkdzmcrgbajqch.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | `VITE_SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_…` or legacy anon JWT |
| `VITE_SUPABASE_PROJECT_ID` | `VITE_SUPABASE_PROJECT_ID` | e.g. `pfxcqfwkdzmcrgbajqch` |
| `VITE_GOOGLE_MAPS_PLATFORM_KEY` | `VITE_GOOGLE_MAPS_PLATFORM_KEY` | Browser Maps key (`AIza…`) |

## Mislabeled in Replit — rename, do not use as-is

| Replit secret name | Value looks like | Put it in |
| --- | --- | --- |
| `SUPABASE_SERVICE_ROLE_KEY` | `pk_live_51…` (Stripe **publishable**) | `VITE_PAYMENTS_CLIENT_TOKEN` |

That entry is a Stripe live publishable key, not a Supabase service role JWT. The server expects
`SUPABASE_SERVICE_ROLE_KEY` to be the **service_role** secret from the Supabase dashboard
(Settings → API), which starts with `eyJ…`.

## Not used by this app — omit on Render/Vercel

| Replit secret | Why |
| --- | --- |
| `CLERK_PUBLISHABLE_KEY` | No Clerk dependency; auth is Supabase OTP |
| `CLERK_SECRET_KEY` | Same |
| `VITE_CLERK_PUBLISHABLE_KEY` | Same |
| `SESSION_SECRET` | Not referenced anywhere in this repo |

## Missing from Replit — add from provider dashboards

| App variable | Where to get it |
| --- | --- |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API → `service_role` (secret) |
| `STRIPE_SECRET_KEY` | Stripe → Developers → API keys → Secret key (`sk_live_…` or `sk_test_…`) |
| `APP_ORIGIN` | Your public site URL, e.g. `https://shopgo-kortrijk.onrender.com` |
| `GEMINI_API_KEY` | Optional; AI assistant only (can stay unset) |

## Minimal hosting checklist

**Browser (build-time `VITE_*`):**

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_PROJECT_ID`
- `VITE_GOOGLE_MAPS_PLATFORM_KEY`
- `VITE_PAYMENTS_CLIENT_TOKEN` (Stripe publishable — use the `pk_live_…` value that was stored under the wrong Replit name)

**Server only (never `VITE_`):**

- `SUPABASE_SERVICE_ROLE_KEY`
- `STRIPE_SECRET_KEY`
- `APP_ORIGIN`
- `GEMINI_API_KEY` / `GEMINI_MODEL` (optional)

After setting vars, rebuild so Vite embeds the `VITE_*` values (`npm run build:legacy` on Node hosts).
