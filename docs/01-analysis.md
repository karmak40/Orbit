# Orbit — Project Analysis & Technology Decision

Source of truth: `design/Dating Tracker.dc.html`

---

## 1. What the prototype actually is

A **`.dc.html` design-container prototype**, not shippable code:

- `design/support.js` is a generated runtime (`dc-runtime`) that loads **React 18 + ReactDOM + Babel-standalone from unpkg** at page load.
- The markup is a template DSL: `<sc-if value="{{ … }}">`, `<sc-for list="{{ … }}" as="x">`, `{{ interpolation }}`, `<helmet>`, `style-hover="…"`, and `hint-placeholder-*` attributes used only by the design editor.
- All logic lives in one `class Component extends DCLogic` (a React class component in disguise) with a single `renderVals()` that returns ~90 view-model keys — including **pre-baked CSS strings** for every element's `style` attribute.
- Everything is in-memory `this.state`. **No persistence, no navigation, no real dates, no backend.**

Consequence: the prototype is an excellent **visual + interaction spec** and a good **logic sketch**, but the implementation is a rewrite, not a port. What transfers verbatim is the design system, the screen inventory, the copy, and the scoring/verdict arithmetic.

Prototype knobs (design-time props, not app features): `startAt` (Splash/Onboarding/Lock/App), `startEmpty`, `userName`, `defaultResultStyle`, `verdictTone`.

---

## 2. Product summary

**Orbit — "Your dating life, observed."** A private, offline journal for dates: log a date in ~2 minutes on the walk home, get a score + a verdict, and over time get patterns. Gamified with XP, levels, streaks and badges to drive the logging habit.

The core product promise is stated in the UI itself, twice:

> "Everything stays on your device. Nothing is uploaded, ever."

This is the single most constraining requirement in the whole project. It rules out an account-based server-backed architecture for the core app, and it makes the AI features and the friends leaderboard architecturally special cases.

---

## 3. Screen inventory (15 states)

| # | Screen | Notable content |
|---|---|---|
| 1 | Splash | 2.1 s auto-advance; orbiting-rings animation, "Orbit" wordmark |
| 2 | Onboarding | 5 steps: 3 story slides (with hand-drawn SVG art) → intention picker (4 options) → privacy toggles; dot indicator, Skip |
| 3 | Lock | 4-digit PIN keypad + biometric key; auto-unlocks on 4th digit |
| 4 | Home — empty | "Level 1 starts with one date", 3-step unlock preview, "Preview with sample data" |
| 5 | Home — populated | Post-date nudge banner, level/XP card, Dating Score + Streak tiles, log CTA, recent dates, insight teaser, badge carousel |
| 6 | Log flow | Person chips (+ new person), activity chips, 4 × 1–5 dot scales, mood before/after, see-again segmented, who-paid segmented, green/red flag chips, free note, sticky "Reveal" CTA (gated) |
| 7 | Result | Animated count-up in **4 switchable presentations**: score ring, letter grade, verdict card, radar chart; XP earned, streak, badge-unlock card |
| 8 | People | Avg score, status, source tag, date count |
| 9 | Person profile | Dates/avg/trend trio, date history with notes, AI-insight teaser |
| 10 | Person editor | Name, source chips (7), status (6 options, colour-coded), private note, delete-cascade |
| 11 | Date detail | Rating dots, see-again/who-paid, flags, note, edit/delete |
| 12 | Timeline | Month-grouped vertical timeline rail |
| 13 | Awards | 6-level roadmap, 9-badge grid, 12-week streak heat strip, opt-in friends leaderboard |
| 14 | Insights | AI reflection card (+helpful/not feedback), trend line chart, avg-by-activity bars, dimension averages, top green/red flags, mood-lift before→after |
| 15 | Delete confirm | Bottom sheet |

Plus a persistent 5-slot bottom nav (Home / People / **+** / Timeline / Awards) and a fake iOS status bar + home indicator (prototype chrome — drop in the real app).

---

## 4. Domain model (as implied by the prototype)

```
Person   { id, name, initial, tag(source), status, note?, dates[] }
DateLog  { id, personId, activity, iso, date, month, score,
           ratings { chemistry, conversation, comfort, fun, moodBefore, moodAfter },  // 1–5
           seeAgain: 'Yes'|'Maybe'|'No', whoPaid: 'I did'|'They did'|'Split',
           green: string[], red: string[], note }
Settings { goal, questions{8 booleans}, reminders{3}, privacy{lock,hide,biometric} }
Progress { xp, level, streakWeeks, badges[] }
```

Enumerations already fixed by the design: 7 sources, 6 statuses, 6 activities, 7 green flags, 7 red flags, 6 levels, 9 badges.

**Scoring (from `computeScore`)**
```
avg  = mean of the filled 1–5 dims (chemistry, conversation, comfort, fun)
s    = avg * 20
s   += 4 if seeAgain === 'Yes';  s -= 6 if 'No'
s   += 1.2 * greenFlags − 2 * redFlags
score = clamp(round(s), 8, 99)
```
Bands: ≥80 green `#6d8a53`, ≥62 gold `#c8912f`, else red `#c24a3a`.
Grade: A+ ≥93 … D <42. Verdict: 5 bands × 3 tones (Gentle/Playful/Blunt), with `seeAgain === 'No'` forcing band ≥2.
XP per date: `40 + round(score * 0.35)`.

Data volume is tiny — tens of people, hundreds of dates. **Storage choice is driven by encryption and query ergonomics, not scale.**

---

## 5. Design system (extracted — stack-independent)

**Type**: `Instrument Serif` 400 (display: 19–120 px) + `Hanken Grotesk` 400–800 (UI). Both Google Fonts — bundle locally in a native app.

**Palette**
| Role | Hex |
|---|---|
| Page / surface | `#f2ece3`, `#e7e0d6`, gradient `#efe8dd → #e2dacd` |
| Card | `#fffdf9`, border `rgba(36,31,27,.07)` |
| Dark card | gradient `#2a2521 → #3a332c`, deepest `#241f1b` |
| Text | `#241f1b` / `#5a5148` / `#8a7d6d` / `#a89c8f` / `#b8a99a` / disabled `#d8c9bd` |
| Primary action (coral) | `#d85a4a` |
| Link / danger | `#c24a3a` |
| Gold | `#c8912f`, light `#e0b25a` |
| Positive (olive) | `#6d8a53` |
| Neutral chips | `#efe6d8`, `#e9e0d3`, `#e6ddd0` |

**Radii**: 12 / 14 / 16 / 18 / 20 / 22 / 24 / 28, pills `999`.
**Animations** (9 keyframes): `fadeUp`, `pop`, `barGrow`, `ringDraw`, `splashIn`, `splashOrbit`, `breathe`, `slideIn`, `dotPulse`.
**Charts**: trend line, radar, bars, ring, heat strip — all hand-authored SVG. **No charting library needed.**

Design is warm/editorial/analog — earthy paper tones, serif display, no blue, no drop-shadow-heavy "SaaS" look. Worth preserving exactly; it's the product's differentiator against clinical tracker apps.

---

## 6. Technical requirements the design implies

**Non-negotiable (stated in UI copy):**
1. **Local-only storage** — no upload of people, notes, ratings, scores.
2. **Passcode lock** on every open, + **Face ID / biometric** unlock.
3. **Encryption at rest** — notes are the most sensitive data in the app ("honest, private writing about real people").
4. **Scheduled local notifications** — post-date nudge (~2 h after an evening out) and a weekly Sunday reflection.
5. **Calendar read permission** — "auto-detect dates and pre-fill who and where".
6. **Data export**.
7. **Hide names** mode — initials only "in lists **and widgets**" → home-screen widgets are in scope.
8. Offline-first, cold-start-fast, 60 fps animation on a phone.

**Deferred but architecturally relevant:**
9. **AI reflections** (labelled "COMING SOON") — needs an inference path. Sending private notes to a cloud LLM directly contradicts requirement 1, so this needs either on-device inference, or aggregate-only/derived-features prompting behind an explicit opt-in.
10. **Friends leaderboard** (opt-in, off by default) — needs a server + pairing, but shares "only levels and streaks — never names, scores, or notes".
11. **Custom questions** — user-defined questions that feed scoring; `addQuestion()` is a stub.

---

## 7. Gaps and contradictions to resolve before/during implementation

These are genuine holes in the prototype, not oversights to paper over:

1. **Two conflicting progression systems.** The level card shows XP (320/500 → Level 5), but `levelDefs` gates levels on *date counts* (1/3/6/10/16/25). Pick one; suggest XP as the currency and levels as XP thresholds, with date-count badges separate.
2. **"Dating Score" (78, "▲ 6 this month") is undefined.** Per-date scores exist; the aggregate does not. Needs a spec (rolling 30-day weighted mean? recency-decayed?).
3. **Streak is undefined.** The heat strip has three intensities (0 / 1 / 2+ dates per week) — so "3 weeks" presumably means consecutive weeks with ≥1 date. Needs a rule, incl. grace/freeze behaviour.
4. **Intention/goal claims to weight the score** ("Scores weight comfort and depth higher") but `computeScore` ignores it entirely. Needs a per-goal weight table.
5. **Question toggles don't affect scoring.** `computeScore` always uses the 4 fixed dims even when toggled off in Settings. Must respect the enabled set (and custom questions).
6. **No real date/time.** Every entry is hardcoded `'Jul 23' / 2026-07-23`. Needs a date picker, "was this today or yesterday?" fast-path, and timezone-safe local dates.
7. **Notes are never captured.** The `<textarea>`s in the log flow and person editor are uncontrolled and `finish()` writes `note: ''`; editing a date deliberately preserves the old note. Real implementation must wire these.
8. **Insights are entirely hardcoded** (trend `[54,76,68,86,87,90,91,94]`, activity averages, flag counts, mood lift). All need real aggregation **plus minimum-data thresholds** — the copy promises patterns at 3 dates and reflections around level 5, so empty/insufficient states are required for every insight card.
9. **Local-only ⇒ losing the phone loses the journal.** Needs an explicit stance: encrypted opt-in backup (iCloud/Drive), or an honest warning + export nudge.
10. **Leaderboard vs "nothing is uploaded, ever"** — needs a privacy-preserving design (device-generated pseudonym, pairing code, only `{level, streak}` synced) and clear consent copy, or drop it from v1.
11. **No search/filter** anywhere. Fine at 10 dates, painful at 60.
12. **"Hide names" behaviour** is unspecified per-screen (profile? detail? notifications? widgets? notification text is the leakiest surface).
13. **Accessibility**: 10–12 px label text and `#a89c8f` on `#fffdf9` are below WCAG AA; the 1–5 dot scales are unlabelled tap targets. Needs a pass — dynamic type, contrast, and screen-reader labels for the dot rows.

---

## 8. Technology options

Context: single-phone-first product, offline, privacy-critical, animation-rich, ~15 screens, tiny data volume, **developer is on Windows 11 (no Mac available)**.

### A. React Native + Expo (TypeScript) — *recommended*
- **Requirements coverage**: `expo-local-authentication` (Face ID/Touch ID/biometrics), `expo-notifications` (scheduled local), `expo-calendar`, `op-sqlite` with SQLCipher or `expo-sqlite` + `expo-secure-store`-held key (encryption at rest), `react-native-svg` (renders the existing SVG art and all four result presentations near 1:1), `expo-linear-gradient`/`expo-blur`, `react-native-reanimated` (the 9 keyframes), `expo-sharing` (export), widgets via config plugin/native target later.
- **Windows-friendly**: EAS Build produces signed iOS builds in the cloud — no Mac needed.
- **Cost**: the prototype's React logic maps mechanically; inline CSS strings become `StyleSheet` objects. Some CSS has no direct RN analogue (`backdrop-filter`, CSS keyframes, `text-wrap:pretty`, gradient text) — replaced by known equivalents.
- **Risk**: RN-specific layout/animation debugging; needs discipline to keep 60 fps on the result animation.

### B. Flutter (Dart)
- Best animation fidelity and single-binary consistency; excellent local-crypto and SQLite (`drift` + SQLCipher), `local_auth`, `flutter_local_notifications`, `device_calendar`.
- **Cost**: total rewrite of both markup and logic into a different language/paradigm; the prototype gives zero code leverage. iOS signing still needs a Mac or a paid CI (Codemagic).

### C. Native SwiftUI (+ Kotlin/Compose later)
- Best possible privacy story (Keychain + Data Protection classes), best widgets, best Face ID integration, best feel.
- **Cost**: needs a Mac (blocker today), and doubles the work for Android.

### D. Web PWA (Vite + React + TypeScript)
- Fastest to a demo — the prototype's logic ports almost verbatim; IndexedDB + WebCrypto for encrypted local storage.
- **Fails 3 stated requirements**: no Face ID, no reliable scheduled local notifications on iOS, no calendar access. Also no app-store presence and no widgets.
- Legitimate as a **validation build**, not as the product.

### E. Capacitor + React web app
- Keeps the web stack while unlocking native plugins (biometrics, local notifications, SQLite, calendar via community plugin).
- **Cost/risk**: DOM-based scroll/animation feel on mid-range Android; community-plugin quality varies; still needs a Mac or CI for iOS.

### Recommendation

**React Native + Expo + TypeScript**, with domain logic isolated in a plain-TypeScript `core` layer:

```
src/
  core/          # pure TS, zero platform imports — fully unit-testable
    model.ts     # Person, DateLog, Settings, Progress types + enums
    scoring.ts   # computeScore, grade, verdict, goal weighting, question weighting
    progress.ts  # xp, levels, streak, badge rules
    insights.ts  # aggregations + minimum-data gates
  data/          # encrypted SQLite repositories, migrations, export/import
  ui/            # theme tokens, primitives (Chip, Seg, DotScale, Card, Toggle, Sheet)
  screens/       # the 15 states
  platform/      # biometrics, notifications, calendar, secure key
```

Why: it is the only option that covers every stated requirement, ships to both stores from a Windows machine, and gets real leverage from the prototype. The `core` layer also keeps option D open as a cheap web validation target and keeps a future Flutter/Swift rewrite from being a from-scratch job.

---

## 9. Suggested phasing (independent of the final stack choice)

1. **Foundations** — project scaffold, design tokens, font bundling, UI primitives, navigation shell + bottom nav.
2. **Core domain** — `core/` with unit tests: scoring (incl. goal + question weighting), XP/levels, streak, badges. Resolve gaps §7.1–§7.5 here.
3. **Persistence** — encrypted SQLite, repositories, migrations, seed/demo data, export.
4. **Primary loop** — Log flow → Result (all 4 presentations) → Home. This is the product; get it right first.
5. **People & history** — People, Profile, Person editor, Date detail, Timeline, delete-cascade.
6. **Gamification & insights** — Awards, real Insights aggregation with empty/insufficient states.
7. **Privacy & platform** — passcode + biometric lock, hide-names mode, notifications, calendar pre-fill, backup stance.
8. **Onboarding & splash** — last, because it depends on everything else being settled.
9. **Polish** — animations, accessibility pass, performance, store assets.

Deferred to a v2 decision: AI reflections (needs an inference/privacy design), friends leaderboard (needs a server), custom questions, widgets.

---

## 10. Decision (2026-07-26)

| Question | Decision |
|---|---|
| Stack | **React Native + Expo, TypeScript**, with a pure-TS `core/` domain layer |
| Platforms | **iOS + Android** from one codebase (iOS built via EAS — no Mac required) |
| v1 scope | **Core loop + gamification.** AI reflections, friends leaderboard and custom questions are *built up to the seam* and flag-gated, not omitted |

Rationale for the stack is in §8. The scope decision has a specific architectural meaning, spelled out in §11 — "prepare, don't ship" rather than "leave out".

---

## 11. Preparing the server/AI-dependent features without shipping them

The three deferred features must be reachable by flipping a flag once a backend exists, with no rework of screens or storage. That means each one gets a **port (interface) + a local no-op/stub adapter now**, plus the UI it needs, gated behind a flag.

### 11.1 Feature flags

```ts
// src/core/features.ts
export type FeatureFlags = {
  aiReflections: boolean      // Insights AI card, Profile AI teaser
  friendsLeaderboard: boolean // Awards → Friends section
  customQuestions: boolean    // Settings → "+ Add your own question"
}
```
Defaults: all `false` in v1. Resolution order: build-time default → remote config (later) → a hidden dev toggle in Settings, so the flows are testable now against stub adapters. Flags never gate *storage* — only surfaces.

### 11.2 AI reflections — `InsightProvider`

```ts
export interface InsightProvider {
  reflect(input: ReflectionInput): Promise<Reflection | null>
  submitFeedback(id: string, helpful: boolean): Promise<void>
}
```
- **v1 adapter**: `LocalHeuristicInsights` — deterministic, on-device, no network. It already covers the design's own examples ("walks and coffee out-score dinners by 14 points", "you rate chemistry high early, then drop comfort by date three") because those are computable from the data. So the AI card renders real content in v1 and is simply *labelled* as a pattern rather than an AI reflection.
- **v2 adapter**: `RemoteLlmInsights`, same interface.
- **Privacy seam that must exist from day one**: `ReflectionInput` carries **derived features only** — per-dimension means and trends, activity/flag counts, date intervals — and *never* raw notes, names, or person identifiers. A remote adapter then cannot leak the sensitive fields even by accident, and the "nothing is uploaded, ever" promise degrades to a narrow, explicitly-consented "aggregate numbers only" instead of being broken.
- The helpful / not-for-me buttons persist locally in v1 and become the feedback channel later.

### 11.3 Friends leaderboard — `SocialProvider`

```ts
export interface SocialProvider {
  status(): Promise<SocialStatus>            // off | pairing | on
  pair(code: string): Promise<void>
  publish(snapshot: { level: number; streakWeeks: number }): Promise<void>
  friends(): Promise<FriendEntry[]>
}
```
- **v1 adapter**: `LocalOnlySocial` — `status()` is always `off`; the Awards screen renders the existing opt-in empty state ("Compare progress with friends…"), which is exactly what the design shows by default. No account, no network, nothing to disclose.
- Only `{ level, streakWeeks }` ever crosses the interface, matching the design's own promise. Pairing is by code against a device-generated pseudonym — no email, no name, no contact upload.

### 11.4 Custom questions — schema-driven log flow

The riskiest thing to defer badly. If the log flow hardcodes its 4 scales + mood + segments, adding user questions later means rewriting the flow *and* migrating scoring. So v1 builds the flow **schema-driven from the start**:

```ts
type Question =
  | { id: string; kind: 'scale5'; label: string; hint?: string; weight: number; builtIn: boolean }
  | { id: string; kind: 'choice'; label: string; options: string[]; builtIn: boolean }
  | { id: string; kind: 'chips';  label: string; options: string[]; polarity: 'green'|'red'; builtIn: boolean }
```
The eight built-in questions become seed rows of this table; `computeScore` consumes the **enabled** question set with weights (which also fixes gaps §7.4 and §7.5). Answers are stored keyed by `questionId`, not as fixed columns. Shipping custom questions later is then only: unhide the composer, allow `builtIn: false` inserts. No migration, no scoring rewrite.

### 11.5 What this buys

| Feature | v1 state | To enable later |
|---|---|---|
| AI reflections | Real heuristic patterns, on-device | Swap adapter + flag on + consent screen |
| Friends leaderboard | Opt-in empty state | Implement adapter + flag on + pairing UI |
| Custom questions | Schema live, composer hidden | Unhide composer + flag on |
| Widgets | Data layer ready (`hide names` respected in read models) | Add native targets |
