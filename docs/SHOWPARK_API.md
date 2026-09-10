# Showpark API integration (API repo → Origin UI)

## Source of truth

| Repo | Role |
|------|------|
| **Origin showpark** (UI, PR #1) | Frontend only — owns all client types/schemas. **Do not duplicate FE DTOs in this repo.** |
| **rondpunt/Shop** (this repo) | API / edge — Vercel `/api/*` routes + Supabase migrations. |

The Showpark app calls this deployment over HTTP. Shapes below are for integration reference only.

## Showpark app env

Set in the **Origin showpark** Expo app (no trailing slash):

```bash
EXPO_PUBLIC_API_URL=https://shopgo-kortrijk.vercel.app
```

Use the Vercel preview URL for branch deploys; override per EAS profile / `app.config`.

## Endpoints

Base: `EXPO_PUBLIC_API_URL`

| Action | Method | Path |
|--------|--------|------|
| Map spots | GET | `/api/spots` |
| Start timer | POST | `/api/timers/start` |
| Checkout | POST | `/api/create-checkout-session` |

Timer start requires `Authorization: Bearer <supabase_access_token>` (anonymous Supabase auth OK).

## Example (Showpark FE)

```typescript
const API = process.env.EXPO_PUBLIC_API_URL!;

export async function fetchSpots() {
  const res = await fetch(`${API}/api/spots`);
  if (!res.ok) throw new Error("spots fetch failed");
  return res.json();
}

export async function startTimer(spotId: string, accessToken: string) {
  const res = await fetch(`${API}/api/timers/start`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ spotId }),
  });
  if (res.status === 402) return { paywall: true, ...(await res.json()) };
  if (!res.ok) throw new Error("timer start failed");
  return res.json();
}
```

## Response shapes (reference — define types in UI repo)

**GET `/api/spots`**

```json
{
  "spots": [{ "id", "lat", "lng", "label", "address?", "status": "free|occupied|unknown", "updatedAt" }],
  "cachedAt": "ISO-8601",
  "stale": false
}
```

**POST `/api/timers/start`**

- `200`: `{ "session": { "id", "spotId", "startedAt", "endsAt", "endedAt" }, "usage": { "used", "limit", "remaining", "isPremium" } }`
- `402`: `{ "code": "PAYWALL", "paywall", "usage" }`
