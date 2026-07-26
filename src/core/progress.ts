/**
 * XP, levels, streaks and badges.
 *
 * The prototype carried two conflicting progression systems: an XP bar
 * (320 / 500 XP → Level 5) and a level table keyed to date counts
 * (1 / 3 / 6 / 10 / 16 / 25 dates). This module resolves that (analysis §7.1):
 *
 *   - XP is the single progression currency; levels are XP thresholds, chosen so
 *     the numbers the design shows on the level card are exact (Level 4 begins
 *     at 320 XP, Level 5 at 500 XP, bar = xp / nextThreshold).
 *   - Date-count milestones survive as badges, where they read better anyway.
 */

import type { DateLog, Person } from './model';
import { flagsValue } from './scoring';

// ------------------------------------------------------------------- xp

/** XP awarded for logging a date, from the prototype: `40 + round(score * 0.35)`. */
export function xpForScore(score: number): number {
  return 40 + Math.round(score * 0.35);
}

export const LEVELS = [
  { level: 1, xp: 0, name: 'Getting out there', req: 'First date logged' },
  { level: 2, xp: 90, name: 'Warming up', req: '90 XP' },
  { level: 3, xp: 190, name: 'In the mix', req: '190 XP' },
  { level: 4, xp: 320, name: 'Finding your rhythm', req: '320 XP' },
  { level: 5, xp: 500, name: 'Knowing your type', req: '500 XP' },
  { level: 6, xp: 750, name: 'Clear-eyed', req: '750 XP' },
] as const;

export const MAX_LEVEL = LEVELS[LEVELS.length - 1].level;

export type LevelState = {
  level: number;
  name: string;
  xp: number;
  /** XP at which the next level starts, or null at max level. */
  nextXp: number | null;
  /** 0–1 for the progress bar. Matches the design: xp / nextXp. */
  fill: number;
};

export function levelFor(xp: number): LevelState {
  let idx = 0;
  for (let i = 0; i < LEVELS.length; i++) {
    if (xp >= LEVELS[i].xp) idx = i;
  }
  const current = LEVELS[idx];
  const next = LEVELS[idx + 1] ?? null;
  return {
    level: current.level,
    name: current.name,
    xp,
    nextXp: next?.xp ?? null,
    fill: next ? Math.min(1, xp / next.xp) : 1,
  };
}

/** Total XP earned across all logged dates. */
export function totalXp(dates: readonly Pick<DateLog, 'score'>[]): number {
  return dates.reduce((sum, d) => sum + xpForScore(d.score), 0);
}

// --------------------------------------------------------------- streaks

const MS_PER_DAY = 86_400_000;

/** Parses `YYYY-MM-DD` at UTC noon, so no timezone can shift the calendar day. */
export function parseDay(day: string): Date {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12));
}

export function toDay(date: Date): string {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, '0');
  const d = `${date.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Monday-based week index — an integer that increments once per week and is
 * comparable across years. Week 0 is the week of 1970-01-05 (a Monday).
 */
export function weekIndex(day: string): number {
  const t = parseDay(day).getTime();
  // 1970-01-01 was a Thursday, so shift back to Monday 1970-01-05 (day 4) as week 0.
  return Math.floor((t - 4 * MS_PER_DAY) / (7 * MS_PER_DAY));
}

/**
 * Consecutive weeks containing at least one logged date.
 *
 * The current week counts once it has a date. A current week with no date yet
 * does not break the streak — otherwise every streak would die each Monday.
 * Missing the whole of last week does break it.
 */
export function streakWeeks(days: readonly string[], today: string): number {
  if (days.length === 0) return 0;
  const weeks = new Set(days.map(weekIndex));
  const thisWeek = weekIndex(today);
  let cursor = weeks.has(thisWeek) ? thisWeek : thisWeek - 1;
  let count = 0;
  while (weeks.has(cursor)) {
    count++;
    cursor--;
  }
  return count;
}

/** Dates-per-week intensity for the last `n` weeks, oldest first (0 / 1 / 2+). */
export function weeklyIntensity(days: readonly string[], today: string, n = 12): number[] {
  const counts = new Map<number, number>();
  for (const day of days) {
    const w = weekIndex(day);
    counts.set(w, (counts.get(w) ?? 0) + 1);
  }
  const thisWeek = weekIndex(today);
  const out: number[] = [];
  for (let i = n - 1; i >= 0; i--) {
    out.push(Math.min(2, counts.get(thisWeek - i) ?? 0));
  }
  return out;
}

// ---------------------------------------------------------------- badges

/** Everything the badge rules need, computed once. */
export type BadgeStats = {
  dateCount: number;
  personCount: number;
  bestScore: number;
  /** Most dates logged with any single person. */
  maxDatesPerPerson: number;
  /** Dates with a non-empty note. */
  noteCount: number;
  redFlagCount: number;
  streakWeeks: number;
};

export type BadgeDef = {
  id: string;
  name: string;
  /** Requirement, shown under the name once earned. */
  sub: string;
  color: string;
  earned: (s: BadgeStats) => boolean;
};

const G = '#6d8a53';
const A = '#c8912f';
const R = '#d85a4a';
const N = '#a89c8f';

export const BADGES: readonly BadgeDef[] = [
  { id: 'first-date', name: 'First Date', sub: 'Logged one', color: A, earned: (s) => s.dateCount >= 1 },
  { id: 'on-a-roll', name: 'On a Roll', sub: '3-week streak', color: R, earned: (s) => s.streakWeeks >= 3 },
  { id: 'sky-high', name: 'Sky High', sub: 'Scored 90+', color: G, earned: (s) => s.bestScore >= 90 },
  {
    id: 'second-round',
    name: 'Second Round',
    sub: 'Same person twice',
    color: A,
    earned: (s) => s.maxDatesPerPerson >= 2,
  },
  { id: 'open-book', name: 'Open Book', sub: '10 notes written', color: G, earned: (s) => s.noteCount >= 10 },
  {
    id: 'honest-eye',
    name: 'Honest Eye',
    sub: 'Logged a red flag',
    color: R,
    earned: (s) => s.redFlagCount >= 1,
  },
  { id: 'explorer', name: 'Explorer', sub: '5 people', color: N, earned: (s) => s.personCount >= 5 },
  { id: 'deep-dive', name: 'Deep Dive', sub: 'Date five', color: N, earned: (s) => s.maxDatesPerPerson >= 5 },
  { id: 'steady', name: 'Steady', sub: '8-week streak', color: N, earned: (s) => s.streakWeeks >= 8 },
];

export function badgeStats(
  people: readonly Person[],
  dates: readonly DateLog[],
  today: string
): BadgeStats {
  const perPerson = new Map<string, number>();
  let redFlagCount = 0;
  let noteCount = 0;
  let bestScore = 0;

  for (const d of dates) {
    perPerson.set(d.personId, (perPerson.get(d.personId) ?? 0) + 1);
    if (d.note.trim()) noteCount++;
    if (d.score > bestScore) bestScore = d.score;
    redFlagCount += flagsValue(d.answers).red.length;
  }

  return {
    dateCount: dates.length,
    personCount: people.length,
    bestScore,
    maxDatesPerPerson: Math.max(0, ...perPerson.values()),
    noteCount,
    redFlagCount,
    streakWeeks: streakWeeks(
      dates.map((d) => d.day),
      today
    ),
  };
}

export function earnedBadgeIds(stats: BadgeStats): string[] {
  return BADGES.filter((b) => b.earned(stats)).map((b) => b.id);
}

/**
 * Badges newly earned by saving a date — drives the "Badge unlocked" card on
 * the result screen. `before` is the set held prior to the save.
 */
export function newlyEarned(before: readonly string[], stats: BadgeStats): BadgeDef[] {
  const had = new Set(before);
  return BADGES.filter((b) => b.earned(stats) && !had.has(b.id));
}
