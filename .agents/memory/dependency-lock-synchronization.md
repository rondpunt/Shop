---
name: Dependency lock synchronization
description: How to keep package updates applied to the actual nested Shop&Go project.
---

The runnable Shop&Go application lives in a nested project directory. When updating dependencies, confirm that the installed version and lockfile inside that application match the manifest; a workspace-level install may not update the app's own dependency tree.

**Why:** A safe version declared in the app manifest can still leave the vulnerable version installed and pinned in its lockfile, so audits and builds continue using the old package.

**How to apply:** After a dependency update, inspect the app-local `npm ls` and lockfile, then run the audit from the app directory before considering the issue resolved.