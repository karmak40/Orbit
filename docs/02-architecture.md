# Orbit — Architecture

How the app is actually built, as of this writing. `docs/01-analysis.md` covers
*why* — the technology decision, the prototype's gaps, the plan for deferred
features. This doc covers *how* — the layers, the data flow, the patterns
worth knowing before you change something.

---

## 1. The four layers, and the one rule that matters

```
app/        expo-router screens — compose src/ui over src/core read models
  ↓ reads/calls
src/data/   encrypted SQLite repositories + the React context that owns state
  ↓ reads/writes
src/core/   pure TypeScript domain: model, scoring, progress, selectors
src/ui/     design tokens + shared components (no data/ imports)
src/platform/  device access: secure key storage today; biometrics/notifications/calendar later
```

**The one rule: `src/core/` never imports React, React Native, or `src/data/`.**
It's plain TypeScript, runnable in Node, and it's the only layer with tests
(`src/core/__tests__/`). Every scoring rule, every XP/streak/badge formula,
every derived read model lives there specifically so it can be unit-tested
without a simulator and reused if the UI layer is ever rebuilt. If you're
adding a rule that decides *what the data means*, it goes in `core/`. If
you're adding a *view* of that meaning, it goes in `ui/` or `app/`.

`src/ui/` holds tokens (`theme.ts`) and dumb, reusable components (`Button.tsx`,
`Card.tsx`, `Chip.tsx`, `DotScale.tsx`, `Toggle.tsx`, `BackButton.tsx`,
`ConfirmSheet.tsx`, `PersonSheet.tsx`, `ScoreRing.tsx`, `RadarChart.tsx`,
`Splash.tsx`, `Onboarding.tsx`). None of it imports `src/data/` — components
receive data and callbacks as props. `app/` screens are the layer that's
allowed to call `useOrbitData()` and wire everything together.

---

## 2. Launch sequence

`app/_layout.tsx` is the actual entry point (expo-router's root layout), and it
gates three states in order:

```
useFonts() loading  →  Splash (min. hold + DB ready)  →  Onboarding (first run only)  →  <Stack> (the app)
```

- **Fonts.** `RootLayout` returns `null` until Google Fonts resolve (or fail).
  This is before the native splash image hides, so there's never a flash of
  system-font text.
- **Splash** (`src/ui/Splash.tsx`) is a from-scratch animated screen (radial
  gradient, breathing glow, two counter-rotating orbit rings, the wordmark),
  matching the design's launch splash. It's shown by `RootNavigator` — a
  component *inside* `OrbitDataProvider` — for whichever is longer: a 2.1s
  minimum hold, or however long SQLite actually takes to open and migrate
  (`!holdElapsed || !data.ready`). This means the database's real startup work
  runs *during* the splash instead of after it, and a slow first launch holds
  the splash a little longer instead of flashing an empty Home screen.
- **Onboarding** (`src/ui/Onboarding.tsx`) shows once, gated on
  `Settings.onboardedAt === null`. It's the design's 5-step intro (3 story
  slides → intention picker → privacy toggles). Finishing — or tapping Skip —
  calls `saveSettings({ goal, privacy, onboardedAt: <now> })` in one write, so
  it can never show twice and never leaves the settings half-applied.
- **The app** is a plain expo-router `<Stack>` once both gates pass.

Splash and Onboarding are **not routes** — they're rendered directly by
`RootNavigator`'s conditional return, not pushed onto the router stack. They're
one-time gates the user never navigates back to, so giving them route
identities would just be complexity with no payoff.

---

## 3. State: one context, everything reads from it

`src/data/store.tsx` exports `OrbitDataProvider` (wraps the whole app in
`_layout.tsx`) and the `useOrbitData()` hook every screen calls. It is the
**only** place that talks to the repositories in `src/data/*Repo.ts`.

Shape of what it exposes:

```ts
{
  ready, hasData, nudgeVisible,
  people, dates, questions, settings, history,        // read models
  level, xp, streakWeeks, weeklyIntensity, earnedBadgeIds,  // derived progress
  addPerson, editPerson, removePerson,
  scoreDraft, canRevealDraft, previewProgress, saveDateLog, removeDateLog,
  setQuestionEnabled, saveSettings,
  fillDemo, resetToEmpty, freshLogDraft,
}
```

Data volume is tiny (tens of people, hundreds of dates — see
`docs/01-analysis.md` §4), so the provider takes the simple road: every write
(`addPerson`, `saveDateLog`, …) calls its repository function, then reloads the
**full** people/dates/questions/settings arrays from SQLite and recomputes
every derived value (`peopleWithStats`, `badgeStats`, `levelFor`, …) from
scratch. There is no incremental cache-patching to keep in sync. This is
deliberate — at this scale, "reload everything, recompute everything" is both
simpler and *more* correct than optimistic patching, since it's provably
consistent with what's actually on disk after every write.

**Why `previewProgress` exists:** the Result screen needs to show XP, streak
and a possible badge unlock *before* the user taps "Save to journal" — the
design lets you preview the result and back out. `previewProgress(draft)`
builds a hypothetical `DateLog`, runs it through the same `badgeStats`/`xpForScore`
functions as a real save, and returns the answer — without writing anything.
`saveDateLog` and `previewProgress` intentionally share the same core
functions so the preview can never drift from what actually gets saved.

---

## 4. Domain model — the schema-driven question system

This is the one pattern worth understanding before touching the log flow.

The design hardcodes four rating dimensions (chemistry/conversation/comfort/fun)
plus mood/see-again/who-paid/flags. Orbit doesn't. `src/core/model.ts` defines
a `Question` type with a `kind` (`scale5` | `moodShift` | `choice` | `flagPair`
| `chips`), and `BUILT_IN_QUESTIONS` is eight *seed rows* of that type, not
eight hardcoded UI fields. They live in a real `questions` SQLite table
(`src/data/questionsRepo.ts`), toggled on/off from Settings.

Consequences, all deliberate:

- **The log flow renders from the question list.** `app/log.tsx` calls
  `scaleQuestions(data.questions)` to get the enabled rating dimensions and
  maps over them — it never references `chemistry`/`conversation`/etc. by
  name for layout. Turn a question off in Settings and it disappears from the
  log flow *and* stops contributing to scoring, with no code change.
- **Answers are keyed by question id**, not by fixed columns
  (`answers: Record<string, Answer>`, stored as encrypted JSON — see §6). A
  user-defined question (v2, currently flagged off — see §7) is a new row in
  the same table and a new key in the same map. No migration.
- **Scoring consumes whatever is enabled.** `computeScore` (`src/core/scoring.ts`)
  takes `{ answers, questions, goal }` and averages only the *enabled*
  `scale5` questions, weighted by each question's `weight × goalWeight(goal, id)`.
  Disabling a dimension in Settings removes it from the average; it doesn't
  zero it out (which would have dragged every score down as a bug in the
  original prototype — see `docs/01-analysis.md` §7.5).

If you're tempted to add a `if (question.id === 'chemistry')` anywhere in a
screen, that's the signal you're fighting this pattern.

---

## 5. Scoring and progress

`src/core/scoring.ts`:

```
mean  = weighted average of the enabled scale5 answers (goal-weighted)
score = clamp(round(mean × 20 + seeAgainAdjust + 1.2×green − 2×red), 8, 99)
grade(score)   → letter, A+ … D
verdict(score, seeAgain, tone) → { title, sub }, 5 bands × 3 copy tones
```

`src/core/progress.ts` is independent of scoring and takes `DateLog[]` +
`Person[]` as input:

- **XP** — `xpForScore(score) = 40 + round(score × 0.35)`, summed across all
  logged dates. `LEVELS` is a fixed XP-threshold table (this resolves a real
  contradiction in the original design — see `docs/01-analysis.md` §7.1 — which
  showed an XP bar *and* a date-count level table that didn't agree).
- **Streak** — consecutive Monday-based weeks with ≥1 date, computed by
  `weekIndex()`. The current week doesn't break a streak just because you
  haven't logged yet *this* week; missing the entire *previous* week does.
- **Badges** — `BADGES` is a list of `{ id, earned: (stats) => boolean }`
  predicates over `badgeStats()` (counts, streak, best score, notes written,
  red flags logged, …). `newlyEarned(before, after)` diffs two badge-id sets —
  this is what powers the "Badge unlocked" card on the Result screen.

All of this is unit-tested (`src/core/__tests__/`) precisely because it's pure
— no mocking a database or a component tree to verify a streak calculation.

---

## 6. Persistence and encryption

`src/data/db.ts` opens one `expo-sqlite` database and runs a flat, ordered
migration list (`MIGRATIONS`, keyed by `PRAGMA user_version`). Four tables:
`persons`, `dates`, `questions`, `settings` — see the file for the exact DDL.

**What's encrypted and what isn't**, and why: `src/data/crypto.ts` provides
`encryptField`/`decryptField` (AES-256-CTR via the pure-JS `aes-js`, plus a
keyed SHA-256 tag for tamper/corruption detection — not a formally-proven AEAD,
but it means a person's name or a note is never a raw string in the SQLite
file or a backup of it). Applied to:

- `persons.name_enc`, `persons.note_enc`
- `dates.note_enc`, `dates.answers_enc` (the full answers blob — ratings,
  flags, mood — travels encrypted as one JSON string)

**Not** encrypted: `dates.activity`/`day`/`score`, `persons.source`/`status`,
and all of `settings`. These aren't the sensitive payload (see
`docs/01-analysis.md` §6.3 — the promise is about "honest, private writing
about real people"), and leaving them plain lets repositories filter/sort in
SQL without decrypting every row first.

The encryption key lives in `src/platform/secureKey.ts`: native platforms use
`expo-secure-store` (Keychain/Keystore-backed); web — a dev/validation target
only, see `docs/01-analysis.md` §8 — falls back to `localStorage`, which is
**not** secure and is clearly commented as such. Never treat a web session as
carrying the same privacy guarantee as the native app.

This is a pragmatic field-level scheme, not full-disk encryption. The
documented upgrade path is SQLCipher via `op-sqlite`, which needs a dev client
instead of Expo Go — tracked as a follow-up, not blocking.

`src/core/selectors.ts` sits between the repositories and the UI: pure
functions (`peopleWithStats`, `datesWithPerson`, `historyByMonth`) that turn
raw rows into the shapes screens actually render (average score, trend
arrow, month grouping). These stay in `core/` and are tested the same as
scoring/progress, even though they're "just" transforms.

---

## 7. Feature flags — building the seam without building the feature

Three features are deferred but *prepared*, not omitted (`src/core/features.ts`,
detailed rationale in `docs/01-analysis.md` §11):

| Feature | v1 state | The seam |
|---|---|---|
| AI reflections | Off | `InsightProvider` interface; `ReflectionInput` carries **derived aggregates only** (means, counts, trends) — never notes, names, or ids, so a future remote adapter can't leak the sensitive fields even by accident |
| Friends leaderboard | Off | `SocialProvider` interface; only `{ level, streakWeeks }` can ever cross it |
| Custom questions | Off | Already live — see §4. The composer UI is just hidden; the schema underneath it is real |

`DEFAULT_FLAGS` are all `false`. Flipping one on later is an adapter
implementation and a flag flip — not a rewrite of the screens or the storage
shape, because the screens and storage were built against the interface from
the start.

---

## 8. Navigation

expo-router, file-based, under `app/`:

```
app/_layout.tsx              root: fonts → splash → onboarding → Stack
app/(tabs)/_layout.tsx       bottom tab bar (Home / People / Timeline / Awards)
app/(tabs)/index.tsx         Home
app/(tabs)/people.tsx        People
app/(tabs)/timeline.tsx      Timeline
app/(tabs)/awards.tsx        Awards
app/log.tsx                  Log flow + Result (one screen, internal mode switch)
app/settings.tsx             Settings
app/person/[id].tsx          Person profile
app/date/[id].tsx            Date detail
```

Two things worth knowing if you touch navigation:

- **The tab bar switches tabs via `navigation.navigate(routeName)` from the
  custom `tabBar` render prop, not `router.push('/path')`.** Using the router
  from inside the tab bar's own closure updates the URL but silently fails to
  switch the visible screen — a real bug hit and fixed during development
  (the tab bar's closure goes stale after the first navigation). Screens
  navigating to a tab root from *outside* the tab bar (e.g. Home's "See all"
  → Timeline) use `router.push()` normally; that's a different, unaffected
  code path.
- **Log/Result is one screen with a local `mode` state (`'form' | 'result'`),
  not two routes.** The design never navigates away between filling out a
  date and seeing its score — it's a mode switch with a count-up animation.
  Making it two routes would mean re-fetching/re-deriving state across a
  navigation boundary for no UX benefit.

**Modals that are not routes:** `PersonSheet` and `ConfirmSheet` are React
Native `Modal`s rendered inline wherever they're needed (Log's "+ New person",
People's "+", Profile's "Edit"/"Delete", Date Detail's "Delete") — not pushed
routes. This sidesteps threading a "return to X" parameter through three
different callers, which is what the original design's `personReturn` state
machine existed to solve.

Both modals support drag-down-to-dismiss via `PanResponder` (core React
Native, no gesture-handler dependency) and tap-outside-to-dismiss. The
non-obvious part: the "swallow taps inside the sheet" responder claim must sit
on a *sibling* of the drag handle, never a shared ancestor — an ancestor's
`onStartShouldSetResponder` claims the touch the instant it starts, before the
drag handle's own `PanResponder` ever sees movement, which silently breaks
the drag gesture. See the comment in `src/ui/PersonSheet.tsx` if this needs
touching again.

---

## 9. Design system

`src/ui/theme.ts` is the only source of colour, radius, spacing and type
styles — **no raw hex in components** (a genuine convention, not aspirational;
if a colour is missing, add it to the token file with the design's own name).

One landmine already hit and fixed: several large-number type styles
(`metric`, `metricSm`, `metricLg`, `gradeHuge`) originally carried the design's
CSS `line-height:1` verbatim (`lineHeight === fontSize`). That's fine in a
browser; React Native's text layout clips the top of Instrument Serif's tall
glyphs at that ratio on real devices. The fix was giving every large-number
style real headroom (`lineHeight` ~15% above `fontSize`) — if you add a new
big-number display style, give it the same headroom rather than copying the
design's CSS ratio directly. Same applies to any local component style that
spreads a token and then overrides `fontSize` without also adjusting
`lineHeight` — check the ratio, don't assume the spread token's `lineHeight`
still fits.

---

## 10. Testing

`src/core/__tests__/` (Jest, `jest-expo` preset) covers scoring, progress
(XP/levels/streaks/badges), selectors, and the seed data's computed scores —
everything in `core/` is pure, so nothing is mocked. There is currently no
component/screen-level test suite; screens are verified by running the app
(web via Metro for fast iteration, checked against Android/iOS builds for
platform-specific behaviour like the keyboard-avoiding sheet or the drag
gesture, which don't reproduce reliably through browser automation).

```bash
npm run typecheck && npm test
```

Bundle check (catches Metro/import problems the typechecker misses, e.g. a
missing native module or an unresolvable asset):

```bash
npx expo export --platform ios --output-dir ../orbit-export-check
```

---

## 11. What's next

`docs/01-analysis.md` §9 has the full phasing. In short, still open:

- **Passcode lock enforcement.** Onboarding's privacy step already collects
  and saves the choice; nothing yet gates app launch on it.
- **Notifications** (post-date nudge, weekly reflection) — toggles exist and
  persist; nothing is scheduled yet.
- **Calendar pre-fill**, **data export**.
- **Insights screen** — real aggregation over `core/selectors.ts`-style
  transforms, with minimum-data gating (the copy promises patterns at 3 dates,
  deeper reflections around level 5).
- The three flagged-off features in §7, whenever there's a backend to point
  them at.
