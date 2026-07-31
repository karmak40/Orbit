import { describe, expect, it } from '@jest/globals';

import { buildInsightsData, buildReflectionInput } from '../insights';
import { BUILT_IN_QUESTIONS, QUESTION_IDS, type Answers, type DateLog } from '../model';

const questions = BUILT_IN_QUESTIONS;

function log(over: Partial<DateLog> & { day: string; score: number }): DateLog {
  return {
    id: over.day,
    personId: 'p1',
    activity: 'Coffee',
    note: '',
    answers: {
      chemistry: { kind: 'scale5', value: 0 },
      conversation: { kind: 'scale5', value: 0 },
      comfort: { kind: 'scale5', value: 0 },
      fun: { kind: 'scale5', value: 0 },
      mood: { kind: 'moodShift', before: 0, after: 0 },
      seeAgain: { kind: 'choice', value: null },
      whoPaid: { kind: 'choice', value: null },
      flags: { kind: 'flagPair', green: [], red: [] },
    } as Answers,
    createdAt: over.day,
    updatedAt: over.day,
    ...over,
  };
}

describe('buildInsightsData', () => {
  it('averages score by activity, best first', () => {
    const dates = [
      log({ day: '2026-01-01', score: 90, activity: 'A walk' }),
      log({ day: '2026-01-02', score: 70, activity: 'Dinner' }),
      log({ day: '2026-01-03', score: 60, activity: 'Dinner' }),
    ];
    const data = buildInsightsData(dates, questions, '2026-01-03');
    expect(data.byActivity).toEqual([
      { activity: 'A walk', score: 90, count: 1 },
      { activity: 'Dinner', score: 65, count: 2 },
    ]);
  });

  it('averages each enabled scale5 dimension independently', () => {
    const dates = [
      log({
        day: '2026-01-01',
        score: 80,
        answers: {
          chemistry: { kind: 'scale5', value: 5 },
          conversation: { kind: 'scale5', value: 3 },
        } as unknown as Answers,
      }),
      log({
        day: '2026-01-02',
        score: 60,
        answers: {
          chemistry: { kind: 'scale5', value: 3 },
          conversation: { kind: 'scale5', value: 3 },
        } as unknown as Answers,
      }),
    ];
    const data = buildInsightsData(dates, questions, '2026-01-02');
    const chemistry = data.dimensionAverages.find((d) => d.questionId === QUESTION_IDS.chemistry);
    expect(chemistry?.value).toBe(4);
  });

  it('skips a disabled question from dimension averages', () => {
    const disabled = questions.map((q) => (q.id === QUESTION_IDS.fun ? { ...q, enabled: false } : q));
    const dates = [log({ day: '2026-01-01', score: 80, answers: { fun: { kind: 'scale5', value: 5 } } as unknown as Answers })];
    const data = buildInsightsData(dates, disabled, '2026-01-01');
    expect(data.dimensionAverages.some((d) => d.questionId === QUESTION_IDS.fun)).toBe(false);
  });

  it('tallies green/red flags, most-logged first', () => {
    const flagAnswers = (green: string[], red: string[]) =>
      ({ flags: { kind: 'flagPair', green, red } }) as unknown as Answers;
    const dates = [
      log({ day: '2026-01-01', score: 80, answers: flagAnswers(['Made me laugh'], []) }),
      log({ day: '2026-01-02', score: 70, answers: flagAnswers(['Made me laugh', 'On time'], ['Ran late']) }),
    ];
    const data = buildInsightsData(dates, questions, '2026-01-02');
    expect(data.topGreenFlags[0]).toEqual({ tag: 'Made me laugh', count: 2 });
    expect(data.topRedFlags[0]).toEqual({ tag: 'Ran late', count: 1 });
  });

  it('averages mood before/after only over dates with a real mood answer', () => {
    const dates = [
      log({ day: '2026-01-01', score: 80, answers: { mood: { kind: 'moodShift', before: 2, after: 4 } } as unknown as Answers }),
      log({ day: '2026-01-02', score: 70 }), // no mood answer (before/after both 0)
    ];
    const data = buildInsightsData(dates, questions, '2026-01-02');
    expect(data.moodSampleCount).toBe(1);
    expect(data.moodBefore).toBe(2);
    expect(data.moodAfter).toBe(4);
  });

  it('compares the last 30 days to the 30 before that for the month-over-month delta', () => {
    const dates = [
      log({ day: '2025-12-01', score: 60 }), // 30-60 days back from "today"
      log({ day: '2026-01-20', score: 80 }), // within last 30 days
    ];
    const data = buildInsightsData(dates, questions, '2026-01-30');
    expect(data.scoreDeltaVsPriorMonth).toBe(20);
  });

  it('returns null for the delta when one side has no dates', () => {
    const dates = [log({ day: '2026-01-20', score: 80 })];
    const data = buildInsightsData(dates, questions, '2026-01-30');
    expect(data.scoreDeltaVsPriorMonth).toBeNull();
  });
});

describe('buildReflectionInput', () => {
  it('carries derived aggregates only, never notes or names', () => {
    const dates = [log({ day: '2026-01-01', score: 80, note: 'a secret note' })];
    const input = buildReflectionInput(dates, 1, questions, 'open');
    expect(input).not.toHaveProperty('note');
    expect(input).not.toHaveProperty('personId');
    expect(input.dateCount).toBe(1);
    expect(input.personCount).toBe(1);
  });

  it('computes the mean score at each per-person date index (e.g. every "date three")', () => {
    const dates = [
      log({ id: 'a1', day: '2026-01-01', score: 90, personId: 'a' }),
      log({ id: 'a2', day: '2026-01-08', score: 80, personId: 'a' }),
      log({ id: 'a3', day: '2026-01-15', score: 70, personId: 'a' }),
      log({ id: 'b1', day: '2026-01-02', score: 60, personId: 'b' }),
    ];
    const input = buildReflectionInput(dates, 2, questions, 'open');
    // index 0: mean(90, 60) = 75; index 1: 80 (only person a); index 2: 70 (only person a)
    expect(input.scoreByDateIndex).toEqual([75, 80, 70]);
  });

  it('reports the mean gap in days between consecutive logged dates', () => {
    const dates = [
      log({ day: '2026-01-01', score: 80, personId: 'a' }),
      log({ day: '2026-01-11', score: 80, personId: 'b' }),
    ];
    const input = buildReflectionInput(dates, 2, questions, 'open');
    expect(input.meanDaysBetween).toBe(10);
  });
});
