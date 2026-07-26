/**
 * Feature flags and the ports for the three server/AI-dependent features.
 *
 * v1 ships all three flags off, but every screen, storage shape and interface
 * they need exists now, so enabling them later is a flag flip plus one adapter
 * (see docs/01-analysis.md §11). Flags gate *surfaces* only — never storage.
 */

export type FeatureFlags = {
  /** Insights AI reflection card + Profile AI teaser, backed by a remote model. */
  aiReflections: boolean;
  /** Awards → Friends leaderboard. */
  friendsLeaderboard: boolean;
  /** Settings → "+ Add your own question". */
  customQuestions: boolean;
};

export const DEFAULT_FLAGS: FeatureFlags = {
  aiReflections: false,
  friendsLeaderboard: false,
  customQuestions: false,
};

// ------------------------------------------------------- insight provider

/**
 * Input to a reflection.
 *
 * Deliberately carries **derived features only** — no notes, no names, no
 * person ids. A remote adapter therefore cannot leak the sensitive fields even
 * by accident, which keeps the app's "nothing is uploaded, ever" promise
 * degrading to a narrow, explicitly-consented "aggregate numbers only".
 */
export type ReflectionInput = {
  dateCount: number;
  personCount: number;
  goal: string;
  /** Mean 1–5 per enabled dimension, keyed by question id. */
  dimensionMeans: Record<string, number>;
  /** Mean 1–5 per dimension over the most recent third of dates. */
  recentDimensionMeans: Record<string, number>;
  /** Mean score per activity. */
  scoreByActivity: Record<string, number>;
  /** Chronological score series. */
  scoreTrend: number[];
  /** Tag → times logged. */
  greenFlagCounts: Record<string, number>;
  redFlagCounts: Record<string, number>;
  /** Mean mood before / after. */
  moodBefore: number | null;
  moodAfter: number | null;
  /** Mean gap in days between consecutive dates. */
  meanDaysBetween: number | null;
  /** Per-person date-index → score, so "by date three" patterns are visible. */
  scoreByDateIndex: number[];
};

export type Reflection = {
  id: string;
  /** The observation, in the app's voice. */
  body: string;
  /** Optional suggested action. */
  suggestion?: string;
  /** True once a remote model produced it; false for on-device heuristics. */
  fromModel: boolean;
};

export interface InsightProvider {
  /** Returns null when there is not enough data to say anything honest. */
  reflect(input: ReflectionInput): Promise<Reflection | null>;
  submitFeedback(reflectionId: string, helpful: boolean): Promise<void>;
}

/** Placeholder until `LocalHeuristicInsights` lands with the Insights screen. */
export const NullInsightProvider: InsightProvider = {
  async reflect() {
    return null;
  },
  async submitFeedback() {},
};

/** Below this, no reflection is offered — the copy promises patterns at 3 dates. */
export const MIN_DATES_FOR_PATTERNS = 3;
/** Below this, the deeper "what you keep choosing" reflections stay locked. */
export const MIN_DATES_FOR_REFLECTIONS = 5;

// -------------------------------------------------------- social provider

export type SocialStatus = 'off' | 'pairing' | 'on';

export type FriendEntry = {
  id: string;
  /** A self-chosen display name; never sourced from contacts. */
  name: string;
  level: number;
  streakWeeks: number;
  isSelf: boolean;
};

/**
 * Only `{ level, streakWeeks }` ever crosses this interface — matching the
 * design's own promise that names, scores and notes are never shared.
 */
export interface SocialProvider {
  status(): Promise<SocialStatus>;
  pair(code: string): Promise<void>;
  unpair(): Promise<void>;
  publish(snapshot: { level: number; streakWeeks: number }): Promise<void>;
  friends(): Promise<FriendEntry[]>;
}

/** v1 adapter: no account, no network, nothing to disclose. */
export const LocalOnlySocial: SocialProvider = {
  async status() {
    return 'off';
  },
  async pair() {
    throw new Error('Friends are not available yet');
  },
  async unpair() {},
  async publish() {},
  async friends() {
    return [];
  },
};
