/**
 * Domain model. Pure types + the enumerations the design fixes.
 * Nothing in `core/` may import from React, React Native or `data/`.
 */

// ---------------------------------------------------------------- people

/** Where you met someone. Free text is allowed too (custom source). */
export const SOURCES = [
  'Hinge',
  'Bumble',
  'Tinder',
  'IRL',
  'Through friends',
  'Work',
  'Coffee shop',
] as const;

/** "Where do things stand?" — value, sub-label and dot colour, per the design. */
export const STATUSES = [
  { id: 'talking', label: 'Talking', sub: 'Early days, still texting', color: '#c8912f' },
  { id: 'seeing', label: 'Seeing again', sub: 'Another date on the books', color: '#6d8a53' },
  { id: 'exclusive', label: 'Exclusive?', sub: 'Heading somewhere real', color: '#6d8a53' },
  { id: 'fence', label: 'On the fence', sub: 'Not sure yet', color: '#c8912f' },
  { id: 'faded', label: 'Faded out', sub: 'It quietly ended', color: '#b8a99a' },
  { id: 'ended', label: 'Ended it', sub: 'You called it', color: '#c24a3a' },
] as const;

export type StatusId = (typeof STATUSES)[number]['id'];

export type Person = {
  id: string;
  name: string;
  /** Where you met — one of SOURCES, or user text. */
  source: string | null;
  status: StatusId;
  /** Private note about the person (not about a specific date). */
  note: string;
  createdAt: string;
  updatedAt: string;
};

// ----------------------------------------------------------------- dates

export const ACTIVITIES = ['Coffee', 'Dinner', 'Drinks', 'A walk', 'Activity', 'Movie'] as const;

export const GREEN_FLAGS = [
  'Made me laugh',
  'Great listener',
  'On time',
  'Curious',
  'Kind to staff',
  'Good energy',
  'Honest',
] as const;

export const RED_FLAGS = [
  'On their phone',
  'One-sided',
  'Bragging',
  'No questions',
  'Bad vibes',
  'Ran late',
  'Talked over me',
] as const;

export const SEE_AGAIN = ['Yes', 'Maybe', 'No'] as const;
export type SeeAgain = (typeof SEE_AGAIN)[number];

export const WHO_PAID = ['I did', 'They did', 'Split'] as const;
export type WhoPaid = (typeof WHO_PAID)[number];

/**
 * A logged date.
 *
 * `answers` is keyed by question id rather than fixed columns, so that
 * user-defined questions (v2) need no schema migration. `score` is
 * denormalised: it is recomputed on save and stored so history stays stable
 * even if the user later changes their weighting or enabled question set.
 */
export type DateLog = {
  id: string;
  personId: string;
  activity: string;
  /** Local calendar day, `YYYY-MM-DD`. Never a timestamp — a date belongs to a day. */
  day: string;
  note: string;
  score: number;
  answers: Answers;
  createdAt: string;
  updatedAt: string;
};

// ------------------------------------------------------------- questions

/**
 * Questions are data, not code. The eight built-ins below are seed rows;
 * enabling, disabling, reordering and (later) adding questions all operate on
 * the same table, and scoring consumes whatever is enabled.
 */
export type QuestionKind = 'scale5' | 'moodShift' | 'choice' | 'flagPair' | 'chips';

export type Question = {
  id: string;
  kind: QuestionKind;
  label: string;
  /** Short hint shown next to the label in the log flow. */
  hint?: string;
  /** Longer explanation shown in Settings. */
  sub: string;
  enabled: boolean;
  /** Display order in the log flow and Settings. */
  order: number;
  /**
   * Relative weight in the score. Only `scale5` questions contribute to the
   * weighted mean; other kinds apply their own fixed adjustments.
   */
  weight: number;
  /** Options for `choice` / `chips`. */
  options?: readonly string[];
  /** For `chips`: which side of the ledger the tags land on. */
  polarity?: 'green' | 'red';
  /** Built-ins cannot be deleted, only disabled. */
  builtIn: boolean;
};

export type Answer =
  /** 1–5, or 0 for "not answered". */
  | { kind: 'scale5'; value: number }
  | { kind: 'moodShift'; before: number; after: number }
  | { kind: 'choice'; value: string | null }
  | { kind: 'flagPair'; green: string[]; red: string[] }
  | { kind: 'chips'; selected: string[] };

export type Answers = Record<string, Answer>;

export const QUESTION_IDS = {
  chemistry: 'chemistry',
  conversation: 'conversation',
  comfort: 'comfort',
  fun: 'fun',
  mood: 'mood',
  seeAgain: 'seeAgain',
  whoPaid: 'whoPaid',
  flags: 'flags',
} as const;

/** The eight built-in questions, in the order the design lists them. */
export const BUILT_IN_QUESTIONS: readonly Question[] = [
  {
    id: QUESTION_IDS.chemistry,
    kind: 'scale5',
    label: 'Chemistry',
    hint: 'The spark',
    sub: 'The spark',
    enabled: true,
    order: 0,
    weight: 1,
    builtIn: true,
  },
  {
    id: QUESTION_IDS.conversation,
    kind: 'scale5',
    label: 'Conversation',
    hint: 'Flow & depth',
    sub: 'Flow and depth',
    enabled: true,
    order: 1,
    weight: 1,
    builtIn: true,
  },
  {
    id: QUESTION_IDS.comfort,
    kind: 'scale5',
    label: 'Comfort & safety',
    hint: 'At ease?',
    sub: 'Did you feel at ease',
    enabled: true,
    order: 2,
    weight: 1,
    builtIn: true,
  },
  {
    id: QUESTION_IDS.fun,
    kind: 'scale5',
    label: 'Fun',
    hint: 'Good time?',
    sub: 'Did you enjoy it',
    enabled: true,
    order: 3,
    weight: 1,
    builtIn: true,
  },
  {
    id: QUESTION_IDS.mood,
    kind: 'moodShift',
    label: 'Mood shift',
    sub: 'Track the lift',
    enabled: true,
    order: 4,
    weight: 0,
    builtIn: true,
  },
  {
    id: QUESTION_IDS.seeAgain,
    kind: 'choice',
    label: 'Would you see them again?',
    sub: 'Yes / maybe / no',
    enabled: true,
    order: 5,
    weight: 0,
    options: SEE_AGAIN,
    builtIn: true,
  },
  {
    id: QUESTION_IDS.whoPaid,
    kind: 'choice',
    label: 'Who paid?',
    sub: 'Logistics',
    enabled: true,
    order: 6,
    weight: 0,
    options: WHO_PAID,
    builtIn: true,
  },
  {
    id: QUESTION_IDS.flags,
    kind: 'flagPair',
    label: 'Green & red flags',
    sub: 'Tag what stood out',
    enabled: true,
    order: 7,
    weight: 0,
    builtIn: true,
  },
];

/** Settings labels for the eight toggles, matching the design's `qDefs`. */
export const QUESTION_SETTING_LABELS: Record<string, string> = {
  mood: 'Mood before / after',
  seeAgain: 'See them again',
  whoPaid: 'Who paid',
  flags: 'Green & red flags',
};

// ------------------------------------------------------------- settings

/** "What are you after right now?" — shapes score weighting. */
export const GOALS = [
  { id: 'serious', label: 'Something serious', sub: 'Looking for a real relationship' },
  { id: 'open', label: 'Open to anything', sub: 'See where things go' },
  { id: 'casual', label: 'Dating casually', sub: 'Fun, low pressure' },
  { id: 'rebuilding', label: 'Getting back out there', sub: 'Rebuilding confidence' },
] as const;

export type GoalId = (typeof GOALS)[number]['id'];

export type Settings = {
  userName: string;
  goal: GoalId;
  privacy: {
    /** Passcode required to open the app. */
    lock: boolean;
    /** Initials only outside a profile — including in notifications and widgets. */
    hideNames: boolean;
    biometric: boolean;
  };
  reminders: {
    /** Nudge ~2h after an evening out. */
    postDate: boolean;
    /** Sunday summary. */
    weekly: boolean;
    /** Read calendar to pre-fill who and where. */
    calendar: boolean;
  };
  /** How the result screen presents a score by default. */
  resultStyle: ResultStyle;
  /** Tone of the verdict copy. */
  verdictTone: VerdictTone;
  onboardedAt: string | null;
  /** `'system'` follows the OS locale (falling back to English); anything else pins it. */
  language: 'system' | SupportedLocale;
};

/** The languages Orbit ships translations for — see `src/i18n/`. */
export const SUPPORTED_LOCALES = ['en', 'de', 'ru', 'uk'] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export const RESULT_STYLES = ['score', 'grade', 'verdict', 'radar'] as const;
export type ResultStyle = (typeof RESULT_STYLES)[number];

export const VERDICT_TONES = ['Gentle', 'Playful', 'Blunt'] as const;
export type VerdictTone = (typeof VERDICT_TONES)[number];

export const DEFAULT_SETTINGS: Settings = {
  userName: '',
  goal: 'open',
  privacy: { lock: true, hideNames: false, biometric: false },
  reminders: { postDate: true, weekly: true, calendar: false },
  resultStyle: 'score',
  verdictTone: 'Playful',
  onboardedAt: null,
  language: 'system',
};

// ------------------------------------------------------------- progress

export type Progress = {
  xp: number;
  level: number;
  /** Consecutive weeks with at least one logged date. */
  streakWeeks: number;
  earnedBadgeIds: string[];
};

// ------------------------------------------------------- derived shapes

/** A person plus the aggregates every list and profile screen needs. */
export type PersonWithStats = Person & {
  dateCount: number;
  /** Mean score, or null when there are no dates yet. */
  avgScore: number | null;
  trend: 'up' | 'down' | 'flat' | 'none';
  lastDay: string | null;
};

/** A date plus the person fields the list rows show. */
export type DateLogWithPerson = DateLog & {
  personName: string;
  personInitial: string;
};

export function initialOf(name: string): string {
  return (name.trim()[0] || '?').toUpperCase();
}

/** Respects the "hide names" privacy setting for any user-facing surface. */
export function displayName(name: string, hideNames: boolean): string {
  return hideNames ? initialOf(name) : name;
}
