# Shop&Go Kortrijk — Autonomous Beta Release Workplan

## Release goal
Deliver a secure, fast, installable Shop&Go Kortrijk beta that is independent of Lovable hosting, deployable on Vercel, and prepared for Google Play and Samsung Galaxy Store packaging.

## Source of truth
- Repository: `rondpunt/Shop`
- Release candidate branch: `import-parkv3-clean`
- Stable branch after all gates pass: `main`
- Web/PWA beta host: Vercel
- Backend/data: Supabase + Vercel Functions
- Android shell: Capacitor

## Hard release gates
A phase may only advance when its gate passes.

### Gate 1 — Repository hygiene and secrets
- No `.env`, keystore, service-account file or private key in Git.
- Root `.gitignore` blocks secrets, build output and signing files.
- Browser-exposed variables contain public/publishable values only.
- `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, `GEMINI_API_KEY` remain server-only.

### Gate 2 — Security
- Authentication required for private API operations.
- Supabase personal tables protected by RLS.
- SECURITY DEFINER functions expose only aggregated/non-identifying data.
- CSP and security headers configured for Vercel.
- No unrestricted iframe/embed, inline remote script or unsafe redirect handling.
- Android release disables backup of sensitive app state and cleartext traffic.
- No production Capacitor `server.url` or Lovable host dependency.

### Gate 3 — Product integrity
- Homepage remains a live decision screen: map -> best current free option -> navigate.
- No reservation wording or false availability guarantee.
- Timer/history/community remain functional without overwhelming the homepage.
- Loading, empty, stale and error states work without full-screen failure.
- Motion improves orientation and feedback and honours `prefers-reduced-motion`.

### Gate 4 — Web/PWA build
- Dependency install succeeds.
- Frontend TypeScript succeeds.
- Vercel API TypeScript succeeds.
- Tests succeed.
- Production PWA build succeeds.
- Manifest and service worker are valid.

### Gate 5 — Android
- `compileSdkVersion` and `targetSdkVersion` = 36.
- Release version code/name configured centrally.
- Release signing supported through environment/Gradle properties only.
- Unsigned release build remains possible for CI verification.
- AAB task documented for Google Play.
- APK/AAB release outputs documented for Galaxy Store.
- Android manifest uses least privilege.
- Store billing is separated from web Stripe billing; Stripe must not be the only digital-subscription checkout inside store-distributed Android builds.

### Gate 6 — Beta deployment
- Vercel preview/deployment reaches READY state.
- `/` and core SPA routes load.
- `/api/parko-states` responds without leaking upstream internals.
- Protected API routes reject unauthenticated calls.
- No recurring 5xx runtime errors.

### Gate 7 — Browser and device-shape QA
Primary viewport: Samsung Galaxy A56-class portrait viewport.
Also verify a smaller Android viewport and a wider Android viewport.
- No horizontal scrolling.
- Bottom navigation visible and safe-area aware.
- Bottom sheet drag/selection works.
- Marker selection and map movement stay in sync.
- `Navigeer` remains visible.
- Empty/offline/API-error states render.
- No framework error overlay or uncaught console error.

### Gate 8 — Performance
Measure at least:
- initial document response
- JS/CSS transfer size
- API latency for Parko proxy
- map boot behaviour
- layout stability during live refresh

Target behaviour:
- useful shell renders immediately instead of waiting for live data
- live data refresh does not reset sheet state or scroll
- no unnecessary 30-second full-page rerender
- cache headers used on safe public proxy data

### Gate 9 — Release promotion
Only after all prior gates are green:
1. Update release report.
2. Move `main` to the validated release-candidate commit.
3. Deploy validated `main`/release commit to Vercel beta.
4. Re-run smoke tests on the final URL.
5. Capture final screenshots.

## Store handoff deliverables
The repository will contain:
- Android Play/Galaxy release guide
- signing instructions without committed secrets
- privacy policy/data-safety checklist
- store listing copy checklist
- AAB/APK build commands
- permissions/data inventory
- billing architecture notes

Actual Play Console or Galaxy Store publication still requires the owner’s store developer accounts, legal declarations, signing/enrolment decisions and store-side approval. Those credentials are never fabricated or committed.
