/**
 * The v1 `InsightProvider` adapter (docs/01-analysis.md §11.2): deterministic,
 * on-device pattern detection over `ReflectionInput`'s derived aggregates —
 * no network, no LLM. It covers the design's own examples ("walks and coffee
 * out-score dinners by 14 points", "you rate chemistry high early, then drop
 * comfort by date three") because both are directly computable from the data,
 * so the reflection card renders a real, honest observation in v1 and is
 * simply labelled a pattern rather than an AI reflection.
 *
 * `body`/`suggestion` are i18n keys, not finished prose — see the comment on
 * `Reflection` in `features.ts`.
 */
import type { InsightProvider, Reflection, ReflectionInput } from './features';

type Candidate = {
  id: string;
  /** 0–1ish; the strongest computable pattern wins. */
  priority: number;
  bodyKey: string;
  bodyParams?: Record<string, string | number>;
  suggestionKey?: string;
  suggestionParams?: Record<string, string | number>;
};

/** Below this, no candidate is offered — better silent than a stretch. */
const MIN_PRIORITY = 0.15;

function candidates(input: ReflectionInput): Candidate[] {
  const out: Candidate[] = [];

  let bestDim: { id: string; overall: number; recent: number } | null = null;
  for (const [id, overall] of Object.entries(input.dimensionMeans)) {
    const recent = input.recentDimensionMeans[id];
    if (recent === undefined) continue;
    if (!bestDim || Math.abs(recent - overall) > Math.abs(bestDim.recent - bestDim.overall)) {
      bestDim = { id, overall, recent };
    }
  }
  if (bestDim) {
    const delta = bestDim.recent - bestDim.overall;
    if (Math.abs(delta) >= 0.35) {
      const rising = delta > 0;
      out.push({
        id: 'dimensionTrend',
        priority: Math.min(1, Math.abs(delta) / 2),
        bodyKey: rising ? 'insights.reflection.dimensionRising' : 'insights.reflection.dimensionFalling',
        bodyParams: {
          dimensionId: bestDim.id,
          recent: bestDim.recent.toFixed(1),
          overall: bestDim.overall.toFixed(1),
        },
        suggestionKey: rising ? undefined : 'insights.reflection.dimensionFallingSuggestion',
        suggestionParams: rising ? undefined : { dimensionId: bestDim.id },
      });
    }
  }

  const activities = Object.entries(input.scoreByActivity);
  if (activities.length >= 2) {
    const sorted = [...activities].sort((a, b) => b[1] - a[1]);
    const [bestActivity, bestScore] = sorted[0];
    const [worstActivity, worstScore] = sorted[sorted.length - 1];
    const delta = bestScore - worstScore;
    if (delta >= 8) {
      out.push({
        id: 'activitySpread',
        priority: Math.min(1, delta / 20),
        bodyKey: 'insights.reflection.activitySpread',
        bodyParams: { best: bestActivity, worst: worstActivity, delta: Math.round(delta) },
        suggestionKey: 'insights.reflection.activitySpreadSuggestion',
        suggestionParams: { best: bestActivity },
      });
    }
  }

  if (input.scoreByDateIndex.length >= 3) {
    const delta = input.scoreByDateIndex[2] - input.scoreByDateIndex[0];
    if (Math.abs(delta) >= 6) {
      const rising = delta > 0;
      out.push({
        id: 'dateIndexTrend',
        priority: Math.min(1, Math.abs(delta) / 15),
        bodyKey: rising ? 'insights.reflection.thirdDateRise' : 'insights.reflection.thirdDateDip',
        bodyParams: { delta: Math.round(Math.abs(delta)) },
        suggestionKey: rising ? undefined : 'insights.reflection.thirdDateDipSuggestion',
      });
    }
  }

  if (input.moodBefore !== null && input.moodAfter !== null) {
    const delta = input.moodAfter - input.moodBefore;
    if (Math.abs(delta) >= 0.5) {
      out.push({
        id: 'moodShift',
        priority: Math.min(1, Math.abs(delta) / 1.5),
        bodyKey: delta > 0 ? 'insights.reflection.moodLift' : 'insights.reflection.moodDip',
        bodyParams: { before: input.moodBefore.toFixed(1), after: input.moodAfter.toFixed(1) },
      });
    }
  }

  if (input.meanDaysBetween !== null) {
    out.push({
      id: 'cadence',
      priority: 0.2,
      bodyKey: 'insights.reflection.cadence',
      bodyParams: { days: Math.round(input.meanDaysBetween) },
    });
  }

  return out;
}

function pick(input: ReflectionInput): Candidate | null {
  const top = candidates(input).sort((a, b) => b.priority - a.priority)[0];
  return top && top.priority >= MIN_PRIORITY ? top : null;
}

function toReflection(c: Candidate): Reflection {
  return {
    id: c.id,
    body: c.bodyKey,
    bodyParams: c.bodyParams,
    suggestion: c.suggestionKey,
    suggestionParams: c.suggestionParams,
    fromModel: false,
  };
}

/** Synchronous form of `LocalHeuristicInsights.reflect`, for callers (e.g. the Home teaser) that can't await a promise that never actually does async work. */
export function localReflect(input: ReflectionInput): Reflection | null {
  const c = pick(input);
  return c ? toReflection(c) : null;
}

export const LocalHeuristicInsights: InsightProvider = {
  async reflect(input) {
    return localReflect(input);
  },
  async submitFeedback() {
    // v1 has no server to send this to; the Insights screen keeps its own
    // session-local "thanks" state after a tap. Persisting the verdict
    // itself for a future remote adapter to learn from would need a
    // settings field — deferred until there's a consumer for it.
  },
};
