/**
 * Aggregations over logged dates for the Insights screen: activity and
 * dimension averages, flag tallies, mood lift, score trend. Also assembles
 * `ReflectionInput` (`features.ts`) — the privacy-safe, derived-aggregates-only
 * shape a pattern heuristic (or later, a remote model) reads.
 *
 * Dimension averages are computed over `scaleQuestions(questions)` — the
 * enabled `scale5` set — never a hardcoded chemistry/conversation/comfort/fun
 * list, so a disabled built-in or a future custom question is handled for
 * free (AGENTS.md: "questions are data, not code").
 */
import type { ReflectionInput } from './features';
import type { DateLog, GoalId, Question } from './model';
import { parseDay } from './progress';
import { flagsValue, moodValue, scaleQuestions, scaleValue } from './scoring';

const MS_PER_DAY = 86_400_000;

function daysBetween(a: string, b: string): number {
  return Math.round((parseDay(b).getTime() - parseDay(a).getTime()) / MS_PER_DAY);
}

function mean(values: readonly number[]): number | null {
  return values.length ? values.reduce((sum, v) => sum + v, 0) / values.length : null;
}

function sortedByDay(dates: readonly DateLog[]): DateLog[] {
  return [...dates].sort((a, b) => a.day.localeCompare(b.day) || a.createdAt.localeCompare(b.createdAt));
}

function topCounts(counts: Map<string, number>, n: number): FlagCount[] {
  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, n);
}

export type ActivityAverage = { activity: string; score: number; count: number };
export type DimensionAverage = { questionId: string; value: number };
export type FlagCount = { tag: string; count: number };

export type InsightsData = {
  dateCount: number;
  /** Chronological, oldest first. */
  scoreTrend: number[];
  /** Mean score of the last 30 days minus the 30 before that; null if either side is empty. */
  scoreDeltaVsPriorMonth: number | null;
  /** Sorted best first. */
  byActivity: ActivityAverage[];
  dimensionAverages: DimensionAverage[];
  /** Up to 3, most-logged first. */
  topGreenFlags: FlagCount[];
  topRedFlags: FlagCount[];
  moodBefore: number | null;
  moodAfter: number | null;
  moodSampleCount: number;
};

export function buildInsightsData(
  dates: readonly DateLog[],
  questions: readonly Question[],
  today: string
): InsightsData {
  const sorted = sortedByDay(dates);

  const last30 = sorted.filter((d) => daysBetween(d.day, today) <= 30);
  const prev30 = sorted.filter((d) => daysBetween(d.day, today) > 30 && daysBetween(d.day, today) <= 60);
  const last30Mean = mean(last30.map((d) => d.score));
  const prev30Mean = mean(prev30.map((d) => d.score));
  const scoreDeltaVsPriorMonth =
    last30Mean !== null && prev30Mean !== null ? Math.round(last30Mean - prev30Mean) : null;

  const byActivityScores = new Map<string, number[]>();
  for (const d of sorted) {
    byActivityScores.set(d.activity, [...(byActivityScores.get(d.activity) ?? []), d.score]);
  }
  const byActivity = [...byActivityScores.entries()]
    .map(([activity, scores]) => ({ activity, score: Math.round(mean(scores)!), count: scores.length }))
    .sort((a, b) => b.score - a.score);

  const dimensionAverages: DimensionAverage[] = [];
  for (const q of scaleQuestions(questions)) {
    const values = sorted.map((d) => scaleValue(d.answers, q.id)).filter((v) => v > 0);
    const m = mean(values);
    if (m !== null) dimensionAverages.push({ questionId: q.id, value: Math.round(m * 10) / 10 });
  }

  const greenCounts = new Map<string, number>();
  const redCounts = new Map<string, number>();
  let moodBeforeSum = 0;
  let moodAfterSum = 0;
  let moodSampleCount = 0;
  for (const d of sorted) {
    const { green, red } = flagsValue(d.answers);
    for (const g of green) greenCounts.set(g, (greenCounts.get(g) ?? 0) + 1);
    for (const r of red) redCounts.set(r, (redCounts.get(r) ?? 0) + 1);
    const mood = moodValue(d.answers);
    if (mood) {
      moodBeforeSum += mood.before;
      moodAfterSum += mood.after;
      moodSampleCount++;
    }
  }

  return {
    dateCount: dates.length,
    scoreTrend: sorted.map((d) => d.score),
    scoreDeltaVsPriorMonth,
    byActivity,
    dimensionAverages,
    topGreenFlags: topCounts(greenCounts, 3),
    topRedFlags: topCounts(redCounts, 3),
    moodBefore: moodSampleCount ? moodBeforeSum / moodSampleCount : null,
    moodAfter: moodSampleCount ? moodAfterSum / moodSampleCount : null,
    moodSampleCount,
  };
}

/** Builds the derived-aggregates-only input an `InsightProvider` reads — see `features.ts`. */
export function buildReflectionInput(
  dates: readonly DateLog[],
  personCount: number,
  questions: readonly Question[],
  goal: GoalId
): ReflectionInput {
  const sorted = sortedByDay(dates);
  const recentSlice = sorted.slice(Math.max(0, sorted.length - Math.ceil(sorted.length / 3)));

  const dimensionMeans: Record<string, number> = {};
  const recentDimensionMeans: Record<string, number> = {};
  for (const q of scaleQuestions(questions)) {
    const allMean = mean(sorted.map((d) => scaleValue(d.answers, q.id)).filter((v) => v > 0));
    const recentMean = mean(recentSlice.map((d) => scaleValue(d.answers, q.id)).filter((v) => v > 0));
    if (allMean !== null) dimensionMeans[q.id] = allMean;
    if (recentMean !== null) recentDimensionMeans[q.id] = recentMean;
  }

  const byActivityScores = new Map<string, number[]>();
  for (const d of sorted) byActivityScores.set(d.activity, [...(byActivityScores.get(d.activity) ?? []), d.score]);
  const scoreByActivity: Record<string, number> = {};
  for (const [activity, scores] of byActivityScores) scoreByActivity[activity] = mean(scores)!;

  const greenFlagCounts: Record<string, number> = {};
  const redFlagCounts: Record<string, number> = {};
  let moodBeforeSum = 0;
  let moodAfterSum = 0;
  let moodSampleCount = 0;
  for (const d of sorted) {
    const { green, red } = flagsValue(d.answers);
    for (const g of green) greenFlagCounts[g] = (greenFlagCounts[g] ?? 0) + 1;
    for (const r of red) redFlagCounts[r] = (redFlagCounts[r] ?? 0) + 1;
    const mood = moodValue(d.answers);
    if (mood) {
      moodBeforeSum += mood.before;
      moodAfterSum += mood.after;
      moodSampleCount++;
    }
  }

  const byPerson = new Map<string, DateLog[]>();
  for (const d of sorted) byPerson.set(d.personId, [...(byPerson.get(d.personId) ?? []), d]);
  const maxIndex = Math.max(0, ...[...byPerson.values()].map((g) => g.length)) - 1;
  const scoreByDateIndex: number[] = [];
  for (let i = 0; i <= maxIndex; i++) {
    const m = mean([...byPerson.values()].filter((g) => g.length > i).map((g) => g[i].score));
    if (m !== null) scoreByDateIndex.push(Math.round(m));
  }

  const gaps: number[] = [];
  for (let i = 1; i < sorted.length; i++) gaps.push(daysBetween(sorted[i - 1].day, sorted[i].day));

  return {
    dateCount: dates.length,
    personCount,
    goal,
    dimensionMeans,
    recentDimensionMeans,
    scoreByActivity,
    scoreTrend: sorted.map((d) => d.score),
    greenFlagCounts,
    redFlagCounts,
    moodBefore: moodSampleCount ? moodBeforeSum / moodSampleCount : null,
    moodAfter: moodSampleCount ? moodAfterSum / moodSampleCount : null,
    meanDaysBetween: mean(gaps),
    scoreByDateIndex,
  };
}
