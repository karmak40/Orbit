/**
 * App-wide data provider: owns the repository-backed state and exposes read
 * models + actions to every screen via `useOrbitData()`.
 *
 * Data volume is tiny (docs/01-analysis.md §4), so this reloads full arrays
 * from SQLite after each write rather than patching state incrementally —
 * simpler, and provably consistent with what's on disk.
 */
import * as Crypto from 'expo-crypto';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import {
  badgeStats,
  earnedBadgeIds,
  levelFor,
  newlyEarned,
  streakWeeks,
  totalXp,
  weeklyIntensity,
  xpForScore,
  type BadgeDef,
} from '../core/progress';
import { canReveal, computeScore } from '../core/scoring';
import { datesWithPerson, historyByMonth, peopleWithStats } from '../core/selectors';
import {
  BUILT_IN_QUESTIONS,
  DEFAULT_SETTINGS,
  QUESTION_IDS,
  type Answers,
  type DateLog,
  type DateLogWithPerson,
  type GoalId,
  type Person,
  type PersonWithStats,
  type Question,
  type Settings,
  type StatusId,
} from '../core/model';
import { SEED_DATES, SEED_PEOPLE, seedScore } from '../core/seed';
import { toDay } from '../core/progress';
import {
  createDateLog,
  createPerson,
  deleteDateLog,
  deletePerson,
  getSettings,
  listAllDates,
  listPersons,
  listQuestions,
  resetDatabase,
  seedQuestionsIfEmpty,
  setQuestionEnabled,
  updateDateLog,
  updatePerson,
  updateSettings as updateSettingsRepo,
} from './index';

/**
 * Deliberately not `Crypto.randomUUID()` — on web that delegates to the
 * browser's `crypto.randomUUID()`, which throws outside a secure context
 * (https, or exactly `localhost`). Testing over a LAN IP (`http://192.168.x.x`,
 * a normal way to preview an Expo web build on a phone) is exactly such a
 * context, and the throw happens inside `addPerson`/`saveDateLog` with no
 * visible error — saving a new person or date silently does nothing.
 * `getRandomBytes` is the older, ungated WebCrypto primitive; hand-assembling
 * a v4-shaped id from it works in every context on every platform. It only
 * needs to be unique, not a spec-perfect UUID.
 */
function newId(): string {
  const bytes = Crypto.getRandomBytes(16);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** "Today" as a local calendar day — every date belongs to a day, never a timestamp. */
export function today(): string {
  return toDay(new Date());
}

export type LogDraft = {
  personId: string | null;
  activity: string | null;
  answers: Answers;
};

function freshLogDraft(): LogDraft {
  return {
    personId: null,
    activity: null,
    answers: Object.fromEntries(BUILT_IN_QUESTIONS.map((q) => [q.id, defaultAnswerFor(q)])),
  };
}

function defaultAnswerFor(q: Question): Answers[string] {
  switch (q.kind) {
    case 'scale5':
      return { kind: 'scale5', value: 0 };
    case 'moodShift':
      return { kind: 'moodShift', before: 0, after: 0 };
    case 'choice':
      return { kind: 'choice', value: null };
    case 'flagPair':
      return { kind: 'flagPair', green: [], red: [] };
    case 'chips':
      return { kind: 'chips', selected: [] };
  }
}

export type NewestBadge = { badge: BadgeDef; date: DateLog } | null;

type OrbitData = {
  ready: boolean;
  people: PersonWithStats[];
  dates: DateLogWithPerson[];
  questions: Question[];
  settings: Settings;
  hasData: boolean;
  nudgeVisible: boolean;
  history: { month: string; items: DateLogWithPerson[] }[];
  level: ReturnType<typeof levelFor>;
  xp: number;
  streakWeeks: number;
  weeklyIntensity: number[];
  earnedBadgeIds: string[];

  dismissNudge: () => void;

  addPerson: (input: { name: string; source: string | null; status: StatusId }) => Promise<Person>;
  editPerson: (
    id: string,
    patch: { name?: string; source?: string | null; status?: StatusId; note?: string }
  ) => Promise<void>;
  removePerson: (id: string) => Promise<void>;

  scoreDraft: (draft: LogDraft, goal: GoalId) => number;
  canRevealDraft: (draft: LogDraft) => boolean;
  /** What saving this draft *would* do, without writing anything — powers the Result preview. */
  previewProgress: (draft: LogDraft, day?: string) => { score: number; xp: number; streakWeeks: number; newBadges: BadgeDef[] };
  saveDateLog: (
    draft: LogDraft,
    opts: { note: string; day?: string; editingId?: string }
  ) => Promise<{ log: DateLog; newBadges: BadgeDef[] }>;
  removeDateLog: (id: string) => Promise<void>;

  setQuestionEnabled: (id: string, enabled: boolean) => Promise<void>;
  saveSettings: (patch: Partial<Settings>) => Promise<void>;

  fillDemo: () => Promise<void>;
  resetToEmpty: () => Promise<void>;

  /**
   * Set if the initial load couldn't decrypt something on disk — the
   * encryption key (`secureKey.ts`) and the SQLite file have gone out of
   * sync, e.g. a key regenerated without the matching data, or vice versa.
   * There's nothing to repair (that's what the tamper check is for), only
   * `recoverFromCorruption` to wipe and start over. Checked before `ready` in
   * `app/_layout.tsx` — without this, the failure was an uncaught exception
   * during the first render, permanently blocking the app with no in-app way
   * out (only clearing app storage from the OS, which most people won't find).
   */
  corrupted: boolean;
  recoverFromCorruption: () => Promise<void>;

  freshLogDraft: () => LogDraft;
};

const Ctx = createContext<OrbitData | null>(null);

export function OrbitDataProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [corrupted, setCorrupted] = useState(false);
  const [peopleRaw, setPeopleRaw] = useState<Person[]>([]);
  const [datesRaw, setDatesRaw] = useState<DateLog[]>([]);
  const [questions, setQuestions] = useState<Question[]>(BUILT_IN_QUESTIONS as Question[]);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [nudgeDismissed, setNudgeDismissed] = useState(false);

  const reload = useCallback(async () => {
    const [p, d, q, s] = await Promise.all([listPersons(), listAllDates(), listQuestions(), getSettings()]);
    setPeopleRaw(p);
    setDatesRaw(d);
    setQuestions(q);
    setSettings(s);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        await seedQuestionsIfEmpty();
        await reload();
        setReady(true);
      } catch {
        setCorrupted(true);
        setReady(true);
      }
    })();
  }, [reload]);

  const recoverFromCorruption: OrbitData['recoverFromCorruption'] = useCallback(async () => {
    await resetDatabase();
    await seedQuestionsIfEmpty();
    setNudgeDismissed(false);
    await reload();
    setCorrupted(false);
  }, [reload]);

  const people = useMemo(() => peopleWithStats(peopleRaw, datesRaw), [peopleRaw, datesRaw]);
  const dates = useMemo(() => datesWithPerson(datesRaw, peopleRaw), [datesRaw, peopleRaw]);
  const history = useMemo(() => historyByMonth(dates), [dates]);
  const hasData = datesRaw.length > 0;

  const stats = useMemo(() => badgeStats(peopleRaw, datesRaw, today()), [peopleRaw, datesRaw]);
  const xp = useMemo(() => totalXp(datesRaw), [datesRaw]);
  const level = useMemo(() => levelFor(xp), [xp]);
  const streak = useMemo(
    () =>
      streakWeeks(
        datesRaw.map((d) => d.day),
        today()
      ),
    [datesRaw]
  );
  const intensity = useMemo(
    () =>
      weeklyIntensity(
        datesRaw.map((d) => d.day),
        today()
      ),
    [datesRaw]
  );
  const earned = useMemo(() => earnedBadgeIds(stats), [stats]);

  const addPerson: OrbitData['addPerson'] = useCallback(
    async (input) => {
      const person = await createPerson({ id: newId(), ...input });
      await reload();
      return person;
    },
    [reload]
  );

  const editPerson: OrbitData['editPerson'] = useCallback(
    async (id, patch) => {
      await updatePerson(id, patch);
      await reload();
    },
    [reload]
  );

  const removePerson: OrbitData['removePerson'] = useCallback(
    async (id) => {
      await deletePerson(id);
      await reload();
    },
    [reload]
  );

  const scoreDraft: OrbitData['scoreDraft'] = useCallback(
    (draft, goal) => computeScore({ answers: draft.answers, questions, goal }),
    [questions]
  );

  const canRevealDraft: OrbitData['canRevealDraft'] = useCallback(
    (draft) => canReveal({ personId: draft.personId, answers: draft.answers, questions }),
    [questions]
  );

  const previewProgress: OrbitData['previewProgress'] = useCallback(
    (draft, day) => {
      const score = computeScore({ answers: draft.answers, questions, goal: settings.goal });
      const hypothetical: DateLog = {
        id: '__preview__',
        personId: draft.personId ?? '__none__',
        activity: draft.activity ?? 'A date',
        day: day ?? today(),
        score,
        note: '',
        answers: draft.answers,
        createdAt: '',
        updatedAt: '',
      };
      const afterDates = [...datesRaw, hypothetical];
      const afterStats = badgeStats(peopleRaw, afterDates, today());
      return {
        score,
        xp: xpForScore(score),
        streakWeeks: afterStats.streakWeeks,
        newBadges: newlyEarned(earned, afterStats),
      };
    },
    [questions, settings.goal, datesRaw, peopleRaw, earned]
  );

  const saveDateLog: OrbitData['saveDateLog'] = useCallback(
    async (draft, opts) => {
      if (!draft.personId) throw new Error('saveDateLog: no person selected');
      const score = computeScore({ answers: draft.answers, questions, goal: settings.goal });
      const before = stats;

      let log: DateLog;
      if (opts.editingId) {
        await updateDateLog(opts.editingId, {
          activity: draft.activity ?? 'A date',
          day: opts.day ?? today(),
          score,
          note: opts.note,
          answers: draft.answers,
        });
        log = {
          id: opts.editingId,
          personId: draft.personId,
          activity: draft.activity ?? 'A date',
          day: opts.day ?? today(),
          score,
          note: opts.note,
          answers: draft.answers,
          createdAt: '',
          updatedAt: '',
        };
      } else {
        log = await createDateLog({
          id: newId(),
          personId: draft.personId,
          activity: draft.activity ?? 'A date',
          day: opts.day ?? today(),
          score,
          note: opts.note,
          answers: draft.answers,
        });
      }
      await reload();

      const afterDates = opts.editingId ? datesRaw : [...datesRaw, log];
      const afterStats = badgeStats(peopleRaw, afterDates, today());
      const newBadges = newlyEarned(before.dateCount === 0 ? [] : earned, afterStats);
      return { log, newBadges };
    },
    [questions, settings.goal, stats, datesRaw, peopleRaw, earned]
  );

  const removeDateLog: OrbitData['removeDateLog'] = useCallback(
    async (id) => {
      await deleteDateLog(id);
      await reload();
    },
    [reload]
  );

  const setQEnabled: OrbitData['setQuestionEnabled'] = useCallback(
    async (id, enabled) => {
      await setQuestionEnabled(id, enabled);
      await reload();
    },
    [reload]
  );

  const saveSettings: OrbitData['saveSettings'] = useCallback(
    async (patch) => {
      const next = await updateSettingsRepo(patch);
      setSettings(next);
    },
    []
  );

  const fillDemo: OrbitData['fillDemo'] = useCallback(async () => {
    for (const p of SEED_PEOPLE) {
      await createPerson(p);
    }
    for (const d of SEED_DATES) {
      await createDateLog({ ...d, score: seedScore(d) });
    }
    setNudgeDismissed(false);
    await reload();
  }, [reload]);

  const resetToEmpty: OrbitData['resetToEmpty'] = useCallback(async () => {
    await resetDatabase();
    await seedQuestionsIfEmpty();
    setNudgeDismissed(false);
    await reload();
  }, [reload]);

  const value: OrbitData = {
    ready,
    corrupted,
    recoverFromCorruption,
    people,
    dates,
    questions,
    settings,
    hasData,
    nudgeVisible: hasData && !nudgeDismissed,
    history,
    level,
    xp,
    streakWeeks: streak,
    weeklyIntensity: intensity,
    earnedBadgeIds: earned,
    dismissNudge: () => setNudgeDismissed(true),
    addPerson,
    editPerson,
    removePerson,
    scoreDraft,
    canRevealDraft,
    previewProgress,
    saveDateLog,
    removeDateLog,
    setQuestionEnabled: setQEnabled,
    saveSettings,
    fillDemo,
    resetToEmpty,
    freshLogDraft,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useOrbitData(): OrbitData {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useOrbitData must be used within OrbitDataProvider');
  return ctx;
}
