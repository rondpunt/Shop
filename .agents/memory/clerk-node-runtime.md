---
name: Clerk server runtime
description: Node runtime requirement for Replit-managed Clerk server-side identity operations.
---

Use Node.js 22 or later for server-side Replit-managed Clerk operations that fetch user records.

**Why:** Node 20 can fail with a native WebSocket error while initializing the Clerk backend transport, leaving an otherwise valid browser session unable to complete server-side account bridging.

**How to apply:** Keep the project runtime on Node 22+ whenever Clerk middleware or the Clerk backend client is used; verify the workflow restarts under that runtime after an upgrade.