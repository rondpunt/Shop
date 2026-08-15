# Shop&Go Kortrijk — Android Store Release

## Current Android identity
- Package/application id: `be.shopgo.kortrijk`
- App name: Shop&Go Kortrijk
- Min SDK: 24
- Compile SDK: 36
- Target SDK: 36
- Beta version: `0.9.0-beta.1` (`versionCode 9`)
- Runtime: Capacitor 8

## Build channels
Two release flavors exist:

### Google Play
```bash
npm ci
npm run build:pwa
npx cap sync android
cd android
./gradlew :app:bundlePlayRelease
```
Output: `android/app/build/outputs/bundle/playRelease/*.aab`

### Samsung Galaxy Store
```bash
npm ci
npm run build:pwa
npx cap sync android
cd android
./gradlew :app:assembleGalaxyRelease
```
Output: `android/app/build/outputs/apk/galaxy/release/*.apk`

CI verifies both outputs on every release-candidate push. Unsigned builds are suitable for CI validation; store upload builds must be signed.

## Release signing
Never commit a keystore or password. Release signing is read from environment variables:
- `ANDROID_KEYSTORE_PATH`
- `ANDROID_KEYSTORE_PASSWORD`
- `ANDROID_KEY_ALIAS`
- `ANDROID_KEY_PASSWORD`

For Google Play, enrol in Play App Signing and protect the upload key separately. For Galaxy Store, sign every release with the same production signing identity used for that listing.

## Google Play billing
The Play flavor includes Google Play Billing Library 9.1.0. The web Stripe checkout is disabled in native Android builds.

Before enabling paid Premium inside the Play binary:
1. Create the subscription/product in Play Console.
2. Map the store product/base-plan identifiers to the Shop&Go Premium plans.
3. Add a native billing bridge to launch/restore purchases.
4. Verify the purchase token server-side through the Google Play Developer API before granting Premium.
5. Configure real-time developer notifications or a periodic reconciliation path.
6. Test with Play license testers/internal testing before production.

Do not grant Premium solely from an unverified client purchase result.

## Samsung Galaxy Store billing
The Galaxy flavor intentionally does not bundle the web Stripe checkout. Before selling digital Premium in Galaxy Store:
1. Complete Samsung Seller Portal commercial-seller requirements.
2. Register the Galaxy Store app and IAP products.
3. Integrate the current Samsung IAP SDK supplied through Samsung's official distribution/repository.
4. Map Samsung product identifiers to the same server-side entitlement model.
5. Verify purchase state/receipt server-side before granting Premium.
6. Test in Samsung's test environment and Seller Portal validation flow.

Keep Play and Galaxy purchase adapters behind the same internal entitlement interface; do not fork Premium feature logic.

## Permissions currently declared
- `INTERNET` — live parking/API/maps.
- `ACCESS_COARSE_LOCATION` — nearby parking with reduced precision.
- `ACCESS_FINE_LOCATION` — user-selected precise nearby/routing support.
- `POST_NOTIFICATIONS` — optional 30-minute timer reminders.

The app does not request background location, microphone, contacts, SMS or broad storage permissions.

## Privacy / Data Safety inventory
Potential personal or user-linked data when the user chooses those functions:
- account/profile identity and email through Supabase Auth;
- vehicle name/number plate;
- parking session timestamps, address and optional coordinates;
- optional session note/photo;
- Premium/subscription entitlement identifiers;
- optional AI prompt text;
- optional community reports.

Public crowd endpoints must not expose account IDs, number plates, personal notes, photos or exact personal session records.

## Required store-side assets / declarations
Code cannot fabricate these owner/legal inputs. Before public submission provide:
- developer/seller account in good standing;
- public privacy-policy URL;
- support contact details;
- app category and content rating answers;
- Google Play Data safety form;
- Samsung privacy/data declarations;
- store listing title, short/long description and screenshots;
- production signing/upload identity;
- subscription product IDs and prices if Premium is sold in that store;
- testing credentials/instructions where store review requires authenticated functionality.

## Release checklist
- [ ] CI web job green
- [ ] CI Android job green
- [ ] AAB generated
- [ ] Galaxy APK generated
- [ ] production keystore configured outside Git
- [ ] privacy URL publicly reachable
- [ ] Data Safety declarations match actual code/data flows
- [ ] Play Billing purchase + restore + server verification tested before enabling Play purchases
- [ ] Samsung IAP purchase + restore + server verification tested before enabling Galaxy purchases
- [ ] no Stripe digital checkout exposed inside store binaries
- [ ] no Lovable server URL or runtime dependency
