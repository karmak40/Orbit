import { describe, expect, it } from '@jest/globals';

import { BUILT_IN_QUESTIONS, QUESTION_IDS, type Answers, type Question } from '../model';
import {
  canReveal,
  computeScore,
  goalWeight,
  grade,
  gradeWord,
  verdict,
  verdictBand,
} from '../scoring';

const questions = BUILT_IN_QUESTIONS;

function answers(over: Partial<Record<string, any>> = {}): Answers {
  return {
    chemistry: { kind: 'scale5', value: 0 },
    conversation: { kind: 'scale5', value: 0 },
    comfort: { kind: 'scale5', value: 0 },
    fun: { kind: 'scale5', value: 0 },
    mood: { kind: 'moodShift', before: 0, after: 0 },
    seeAgain: { kind: 'choice', value: null },
    whoPaid: { kind: 'choice', value: null },
    flags: { kind: 'flagPair', green: [], red: [] },
    ...over,
  } as Answers;
}

const scales = (v: number) =>
  answers({
    chemistry: { kind: 'scale5', value: v },
    conversation: { kind: 'scale5', value: v },
    comfort: { kind: 'scale5', value: v },
    fun: { kind: 'scale5', value: v },
  });

describe('computeScore', () => {
  it('returns 0 when nothing is rated', () => {
    expect(computeScore({ answers: answers(), questions, goal: 'open' })).toBe(0);
  });

  it('maps a flat 1-5 mean onto the 20-100 scale', () => {
    expect(computeScore({ answers: scales(4), questions, goal: 'open' })).toBe(80);
    expect(computeScore({ answers: scales(3), questions, goal: 'open' })).toBe(60);
  });

  it('averages only the answered dimensions', () => {
    const a = answers({
      chemistry: { kind: 'scale5', value: 5 },
      conversation: { kind: 'scale5', value: 3 },
    });
    // mean of 5 and 3 = 4 -> 80; the two unanswered dims are ignored
    expect(computeScore({ answers: a, questions, goal: 'open' })).toBe(80);
  });

  it('applies the see-again adjustment', () => {
    const yes = { ...scales(4), seeAgain: { kind: 'choice', value: 'Yes' } } as Answers;
    const no = { ...scales(4), seeAgain: { kind: 'choice', value: 'No' } } as Answers;
    expect(computeScore({ answers: yes, questions, goal: 'open' })).toBe(84);
    expect(computeScore({ answers: no, questions, goal: 'open' })).toBe(74);
  });

  it('applies flag bonuses and penalties', () => {
    const a = {
      ...scales(4),
      flags: { kind: 'flagPair', green: ['On time', 'Curious'], red: ['Ran late'] },
    } as Answers;
    // 80 + 2*1.2 - 2 = 80.4 -> 80
    expect(computeScore({ answers: a, questions, goal: 'open' })).toBe(80);
  });

  it('clamps to the 8..99 range', () => {
    const perfect = {
      ...scales(5),
      seeAgain: { kind: 'choice', value: 'Yes' },
      flags: { kind: 'flagPair', green: ['On time', 'Curious', 'Honest'], red: [] },
    } as Answers;
    expect(computeScore({ answers: perfect, questions, goal: 'open' })).toBe(99);

    const dire = {
      ...scales(1),
      seeAgain: { kind: 'choice', value: 'No' },
      flags: { kind: 'flagPair', green: [], red: ['Bad vibes', 'One-sided', 'Bragging'] },
    } as Answers;
    expect(computeScore({ answers: dire, questions, goal: 'open' })).toBe(8);
  });

  it('ignores questions the user has disabled', () => {
    const withoutSeeAgain: Question[] = questions.map((q) =>
      q.id === QUESTION_IDS.seeAgain ? { ...q, enabled: false } : q
    );
    const a = { ...scales(4), seeAgain: { kind: 'choice', value: 'Yes' } } as Answers;
    expect(computeScore({ answers: a, questions: withoutSeeAgain, goal: 'open' })).toBe(80);
  });

  it('drops a disabled dimension out of the mean', () => {
    const withoutFun: Question[] = questions.map((q) =>
      q.id === QUESTION_IDS.fun ? { ...q, enabled: false } : q
    );
    const a = answers({
      chemistry: { kind: 'scale5', value: 5 },
      conversation: { kind: 'scale5', value: 5 },
      comfort: { kind: 'scale5', value: 5 },
      fun: { kind: 'scale5', value: 1 },
    });
    expect(computeScore({ answers: a, questions: withoutFun, goal: 'open' })).toBe(99);
  });

  describe('goal weighting', () => {
    const uneven = answers({
      chemistry: { kind: 'scale5', value: 5 },
      conversation: { kind: 'scale5', value: 5 },
      comfort: { kind: 'scale5', value: 2 },
      fun: { kind: 'scale5', value: 5 },
    });

    it('leaves scores untouched under "open to anything"', () => {
      // unweighted mean = 4.25 -> 85
      expect(computeScore({ answers: uneven, questions, goal: 'open' })).toBe(85);
    });

    it('punishes low comfort harder when looking for something serious', () => {
      const open = computeScore({ answers: uneven, questions, goal: 'open' });
      const serious = computeScore({ answers: uneven, questions, goal: 'serious' });
      expect(serious).toBeLessThan(open);
    });

    it('weights comfort highest of all goals when rebuilding confidence', () => {
      const comfort = (['serious', 'open', 'casual', 'rebuilding'] as const).map((g) =>
        goalWeight(g, QUESTION_IDS.comfort)
      );
      expect(goalWeight('rebuilding', QUESTION_IDS.comfort)).toBe(Math.max(...comfort));
    });

    it('also drags a low-comfort date down when rebuilding confidence', () => {
      const open = computeScore({ answers: uneven, questions, goal: 'open' });
      expect(computeScore({ answers: uneven, questions, goal: 'rebuilding' })).toBeLessThan(open);
    });

    it('barely notices low comfort when dating casually', () => {
      const open = computeScore({ answers: uneven, questions, goal: 'open' });
      expect(computeScore({ answers: uneven, questions, goal: 'casual' })).toBeGreaterThan(open);
    });

    it('defaults custom questions to weight 1 under every goal', () => {
      expect(goalWeight('serious', 'my-own-question')).toBe(1);
      expect(goalWeight('casual', 'my-own-question')).toBe(1);
    });
  });
});

describe('canReveal', () => {
  it('requires a person', () => {
    expect(canReveal({ personId: null, answers: scales(4), questions })).toBe(false);
    expect(canReveal({ personId: 'p1', answers: scales(4), questions })).toBe(true);
  });

  it('requires the first two enabled dimensions', () => {
    const onlyFirst = answers({ chemistry: { kind: 'scale5', value: 4 } });
    expect(canReveal({ personId: 'p1', answers: onlyFirst, questions })).toBe(false);

    const firstTwo = answers({
      chemistry: { kind: 'scale5', value: 4 },
      conversation: { kind: 'scale5', value: 2 },
    });
    expect(canReveal({ personId: 'p1', answers: firstTwo, questions })).toBe(true);
  });

  it('needs only a person when every dimension is disabled', () => {
    const noScales: Question[] = questions.map((q) =>
      q.kind === 'scale5' ? { ...q, enabled: false } : q
    );
    expect(canReveal({ personId: 'p1', answers: answers(), questions: noScales })).toBe(true);
  });
});

describe('grading', () => {
  it('maps scores to letters at the design thresholds', () => {
    expect(grade(93)).toBe('A+');
    expect(grade(92)).toBe('A');
    expect(grade(78)).toBe('B+');
    expect(grade(41)).toBe('D');
  });

  it('maps scores to words', () => {
    expect(gradeWord(90)).toBe('Exceptional');
    expect(gradeWord(70)).toBe('Solid');
    expect(gradeWord(20)).toBe('Rough');
  });
});

describe('verdict', () => {
  it('bands by score', () => {
    expect(verdictBand(90, null)).toBe(0);
    expect(verdictBand(80, null)).toBe(1);
    expect(verdictBand(65, null)).toBe(2);
    expect(verdictBand(50, null)).toBe(3);
    expect(verdictBand(20, null)).toBe(4);
  });

  it('caps an enthusiastic verdict when you would not go again', () => {
    expect(verdictBand(95, 'No')).toBe(2);
    // a already-low band is left alone
    expect(verdictBand(20, 'No')).toBe(4);
  });

  it('varies the sub-copy by tone but not the title', () => {
    const gentle = verdict(90, null, 'Gentle');
    const blunt = verdict(90, null, 'Blunt');
    expect(gentle.title).toBe(blunt.title);
    expect(gentle.sub).not.toBe(blunt.sub);
  });
});
