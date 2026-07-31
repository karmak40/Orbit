import { describe, expect, it } from '@jest/globals';

import type { ReflectionInput } from '../features';
import { localReflect } from '../insightHeuristics';

function baseInput(over: Partial<ReflectionInput> = {}): ReflectionInput {
  return {
    dateCount: 6,
    personCount: 3,
    goal: 'open',
    dimensionMeans: {},
    recentDimensionMeans: {},
    scoreByActivity: {},
    scoreTrend: [],
    greenFlagCounts: {},
    redFlagCounts: {},
    moodBefore: null,
    moodAfter: null,
    meanDaysBetween: null,
    scoreByDateIndex: [],
    ...over,
  };
}

describe('localReflect', () => {
  it('returns null when nothing computable clears the noise floor', () => {
    expect(localReflect(baseInput())).toBeNull();
  });

  it('spots an activity-score spread (the "walks out-score dinners" example)', () => {
    const input = baseInput({ scoreByActivity: { 'A walk': 90, Dinner: 70, Coffee: 88 } });
    const reflection = localReflect(input);
    expect(reflection?.id).toBe('activitySpread');
    expect(reflection?.bodyParams).toMatchObject({ best: 'A walk', worst: 'Dinner', delta: 20 });
    expect(reflection?.fromModel).toBe(false);
  });

  it('spots a third-date dip (the "drop comfort by date three" example)', () => {
    const input = baseInput({ scoreByDateIndex: [88, 80, 70] });
    const reflection = localReflect(input);
    expect(reflection?.id).toBe('dateIndexTrend');
    expect(reflection?.body).toBe('insights.reflection.thirdDateDip');
    expect(reflection?.suggestion).toBe('insights.reflection.thirdDateDipSuggestion');
  });

  it('picks the dimension with the largest recent-vs-overall swing', () => {
    const input = baseInput({
      dimensionMeans: { chemistry: 4, comfort: 4 },
      recentDimensionMeans: { chemistry: 4.1, comfort: 3.2 },
    });
    const reflection = localReflect(input);
    expect(reflection?.id).toBe('dimensionTrend');
    expect(reflection?.body).toBe('insights.reflection.dimensionFalling');
    expect(reflection?.bodyParams?.dimensionId).toBe('comfort');
  });

  it('surfaces a positive mood lift', () => {
    const input = baseInput({ moodBefore: 2.5, moodAfter: 4 });
    const reflection = localReflect(input);
    expect(reflection?.id).toBe('moodShift');
    expect(reflection?.body).toBe('insights.reflection.moodLift');
  });

  it('falls back to cadence only when nothing stronger is available', () => {
    const input = baseInput({ meanDaysBetween: 9 });
    const reflection = localReflect(input);
    expect(reflection?.id).toBe('cadence');
    expect(reflection?.bodyParams).toEqual({ days: 9 });
  });

  it('prefers the strongest signal when several patterns are computable', () => {
    const input = baseInput({
      meanDaysBetween: 9, // weak, priority 0.2
      scoreByActivity: { 'A walk': 95, Dinner: 60 }, // delta 35 → priority 1
    });
    const reflection = localReflect(input);
    expect(reflection?.id).toBe('activitySpread');
  });
});
