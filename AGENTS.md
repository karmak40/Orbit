# Orbit

A private, offline dating journal. Log a date in ~2 minutes, get a score and a
verdict, and over time get patterns. Gamified with XP, levels, streaks, badges.

**Expo SDK 54 / React Native 0.81 / React 19.1.** Expo has changed a lot — read the
versioned docs at https://docs.expo.dev/versions/v54.0.0/ before writing code
against an Expo API.

## Where things are

| Path | What |
|---|---|
| `design/Dating Tracker.dc.html` | The design prototype — **the visual and copy source of truth**. A `.dc.html` design-container file: React 18 + a `sc-if`/`sc-for` template DSL, all logic in one `DCLogic` class. Read it, don't run it. |
| `design/support.js` | The prototype's generated runtime. Reference only; nothing in `src/` uses it. |
| `docs/01-analysis.md` | Project analysis, technology decision, the gaps in the prototype, and how the deferred features are prepared. **Read this first.** |
| `src/core/` | Pure TypeScript domain: model, scoring, progress, feature flags. No React, no React Native, no `data/` imports. Unit-tested. |
| `src/data/` | Encrypted SQLite repositories, migrations, export/import. |
| `src/ui/` | Design tokens (`theme.ts`) and shared primitives. |
| `src/platform/` | Biometrics, notifications, calendar, secure key storage. |
| `app/` | expo-router routes. Screens compose `src/ui` primitives over `src/core` read models. |

## Conventions

- **No raw hex in components.** Everything comes from `src/ui/theme.ts`. If a
  colour is missing from the tokens, add it there with the design's own name.
- **`src/core/` stays pure.** It is the only layer with tests, and it must stay
  runnable in plain Node. Platform access goes through `src/platform/`.
- **Questions are data, not code.** The log flow renders from the question
  schema in `src/core/model.ts`, and scoring consumes whatever is enabled. Never
  hardcode the four dimensions in a screen.
- **Answers are keyed by question id**, never stored as fixed columns — that is
  what keeps user-defined questions a v2 flag flip rather than a migration.
- **Privacy is a hard requirement, not a feature.** The UI promises "everything
  stays on your device. Nothing is uploaded, ever." Notes, names and scores must
  never cross a network boundary. `ReflectionInput` in `src/core/features.ts`
  carries derived aggregates only, by design — do not widen it.
- **Respect `privacy.hideNames`** on every user-facing surface, including
  notification text and (later) widgets. Use `displayName()` from the model.

## Checks

```bash
npm run typecheck && npm test
```

Bundle check (catches Metro/import problems the typechecker misses):

```bash
npx expo export --platform ios --output-dir ../orbit-export-check
```

## Notes / gotchas

- Node 25 is ahead of Expo's tested LTS range. It mostly works, but config-plugin
  resolution during `expo export`/`expo prebuild` can hit
  `ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING` walking into a `.ts` file inside
  `expo-modules-core` — Node 25 refuses to type-strip `.ts` under `node_modules`.
  Usually the real fix is removing a bogus plugin from `app.json` (see next
  point), not downgrading Node — only try Node 22 if a plugin you actually need
  hits this.
- **Only list a package under `app.json`'s `plugins` if it ships an
  `app.plugin.js`** (check `node_modules/<pkg>/app.plugin.js`). Listing one that
  doesn't (e.g. `expo-sharing` — it has no native config to apply) makes Expo's
  config-plugin resolver walk the package's exports looking for one, which is
  what triggers the Node 25 crash above.
- Keep `expo`, `react`, `react-native` and every `expo-*`/`react-native-*`
  package aligned to one SDK's matrix — after bumping the `expo` version, run
  `npx expo install --fix` and then a clean `rm -rf node_modules && npm install`
  (a `--fix` on top of a stale `node_modules` can leave an npm `overrides` entry
  fighting the newly-resolved direct dependency version).
- Import Google Fonts from their **per-weight subpath**
  (`@expo-google-fonts/hanken-grotesk/500Medium`). The package root re-exports
  all 18 weights and Metro bundles every one.
- Never write `package.json` with PowerShell `Out-File -Encoding utf8` — it adds
  a BOM that Expo's config reader rejects.
- expo-sqlite's web backend (wa-sqlite) imports a `.wasm` file directly —
  Metro needs `config.resolver.assetExts.push('wasm')` in `metro.config.js`, or
  the web bundle fails to resolve it. Changes to `metro.config.js` need a full
  `expo start --clear` restart, not just fast refresh.
- React Native Web's `Pressable`/`View` need real `onPress`/`Pressable`, not an
  ad-hoc `onTouchEnd` prop on a plain `View` — the latter silently doesn't fire
  on web (and isn't accessible on native either). If a tap does nothing in the
  browser, check for this before assuming the state logic is broken.
