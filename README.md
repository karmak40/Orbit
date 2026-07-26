# Orbit

A private, offline dating journal. Log a date in ~2 minutes, get a score and a
verdict, and over time get patterns. Gamified with XP, levels, streaks and
badges.

Everything stays on your device — people, notes and scores are encrypted at
rest and never cross a network boundary. See
[docs/01-analysis.md §6](docs/01-analysis.md#6-technical-requirements-the-design-implies)
for what that promise actually covers.

Built with Expo SDK 54, React Native 0.81, React 19.1, and expo-router.

## Getting started

```bash
npm install
npm start
```

Then, with the dev server running:

- **Android emulator** — `npm run android` (boots the emulator, installs Expo
  Go, opens the app)
- **Physical phone (iOS or Android)** — install Expo Go from the App Store /
  Play Store, then scan the QR code `npm start` prints. Phone and computer
  need to be on the same Wi-Fi (use `npx expo start --tunnel` if they can't
  see each other)
- **Browser** — `npm run web`. Useful for fast iteration, but it's a dev/
  validation target only — no Face ID, no real notifications, no calendar
  access, and `localStorage` (not the Keychain) backs the encryption key. See
  `docs/01-analysis.md` §8 for why.

Encrypted SQLite (`expo-sqlite`) needs a dev build rather than Expo Go once
you're testing on a real device for real:

```bash
npx expo run:android   # or: eas build --platform ios (Windows can't build iOS locally)
```

## Checks

```bash
npm run typecheck   # tsc --noEmit — see AGENTS.md if this throws a JSX error
npm test            # Jest, src/core/ only — everything there is pure and unmocked
```

Bundle check (catches Metro/import problems the typechecker misses):

```bash
npx expo export --platform ios --output-dir ../orbit-export-check
```

## Where to look next

| Doc | For |
|---|---|
| [AGENTS.md](AGENTS.md) | Conventions, file map, and the gotchas actually hit while building this — read before making changes |
| [docs/01-analysis.md](docs/01-analysis.md) | Why this stack, what the original design prototype got wrong, how the deferred features (AI reflections, friends leaderboard, custom questions) are prepared without being built |
| [docs/02-architecture.md](docs/02-architecture.md) | How it's built: the four layers, the launch sequence, the schema-driven question system, encryption, navigation |
| [design/Dating Tracker.dc.html](design/Dating%20Tracker.dc.html) | The visual and copy source of truth — a design prototype, not runnable app code |

## Project layout

```
app/          expo-router screens (file-based routing)
src/core/     pure domain logic — model, scoring, progress, feature flags — unit-tested, zero React
src/data/     encrypted SQLite repositories + the app-wide data provider
src/ui/       design tokens and shared components
src/platform/ device access (secure key storage today; biometrics/notifications/calendar later)
docs/         analysis and architecture notes
design/       the source-of-truth prototype
```

---

This is a personal project, not a published package — see [LICENSE](LICENSE)
for the license file inherited from the Expo starter template if you're
reusing this scaffold elsewhere.
