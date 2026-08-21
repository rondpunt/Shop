---
name: Cloud-only user data
description: Durable product decision for user-owned parking data and authentication.
---

Parking sessions, vehicles, history, favorites, and premium usage are cloud-owned data. A missing Clerk/Supabase session must not silently switch to browser-local storage; the user should authenticate again instead.

**Why:** The same Shop&Go data is shared with another hosted app, and browser storage disappears or becomes device-specific when cookies/storage are cleared.

**How to apply:** Keep local storage limited to non-critical UI preferences and caches. Any user-owned record must require a valid authenticated Supabase session and use the shared database.