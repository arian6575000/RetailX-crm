# RetailX CRM

**Advanced Offline Mobile CRM** for Android. Customers, leads, follow-ups, notes and analytics, all stored on the phone. No account and no internet needed.

Built by **RetailX Solution · 03286575000**.

## Features

| Area | What you get |
|---|---|
| Dashboard | Animated pipeline hero, today's focus (overdue / today / next 7 days), quick actions, growth tiles |
| Customers | Search, status/group/tag filters, long-press menu, duplicate-phone warning, contact picker |
| Customer profile | Call / WhatsApp / SMS / email, activity timeline, notes, files and photos, PDF export |
| Follow-ups | Swipe to complete or snooze, week strip, overdue / today / upcoming sections, local reminders |
| Pipeline | Board and list, stage moves from a long-press menu, convert a won lead into a customer |
| Analytics | Win rate, growth, won revenue, stage donut, lead sources, activity mix (license feature) |
| Groups & tags | Colour-coded segments with live counts |
| Import / export | CSV (formula-injection safe) and phone contacts, with a preview before import |
| Backup & restore | Optional password encryption (XSalsa20-Poly1305), merge or replace restore |
| Security | PIN + biometrics, auto re-lock, screen-capture blocking |
| Licensing | Offline Ed25519 license bound to project code and device ID |
| Themes | Light, Dark, System |

## Tech stack

Expo SDK 58 · React Native 0.88 · React 19 · TypeScript (strict) · expo-router · expo-sqlite · tweetnacl · react-native-svg · expo-linear-gradient · Inter font.

## Design system

Token-based and independent from any other product: semantic colours for light and dark (`src/lib/theme.ts`), indigo primary, violet secondary, cyan accent, 44 dp minimum touch targets, Inter type scale, shared components in `src/ui/`. A unit test (`tests/theme.test.ts`) enforces WCAG AA contrast for every text/background pair in both themes.

## Getting started

```bash
npm install
npm run typecheck
npm test
npm start            # Expo dev server
```

### Activate licensing

`src/license/config.ts` ships with an empty `PUBLIC_KEY_HEX`, so the license gate shows "verification is not configured". Paste the 64-character hex public key from your license generator, then build. Never commit the private key (`.license/` is git-ignored).

### Build an APK

GitHub Actions (`.github/workflows/android-apk.yml`) generates the icons, type-checks, runs `expo prebuild` and `gradle assembleRelease`, then uploads `RetailX-CRM-apk`. Locally: `npx eas build -p android --profile preview`.

### Browser preview (design review)

`tools/preview` renders the real screens in a browser using the real repository on sql.js, for light/dark screenshots without a device:

```bash
PREVIEW_OUT=/tmp/pv node tools/preview/build.mjs
PREVIEW_OUT=/tmp/pv SHOTS=/tmp/shots SCREENS=dashboard,customers node tools/preview/shoot.mjs
```

## Project layout

```
src/app/        expo-router screens (tabs, customer, lead, follow-up, settings, ...)
src/ui/         design-system components, sheets, charts
src/db/         schema, repository, backup core
src/lib/        theme, analytics, csv, lock, notifications, pdf, files
src/license/    offline license verification and gate
tests/          repo, license, analytics, csv, theme tests (node:sqlite)
tools/preview/  browser preview harness
```

## Data and privacy

All data lives in a local SQLite database and the app's private storage. Backups leave the device only when the user shares them. Android auto-backup is disabled.

## Credit

RetailX Solution · 03286575000 (shown in the app and in the footer of every export and PDF).
