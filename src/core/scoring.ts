/**
 * Scoring, grading and verdict copy.
 *
 * The baseline formula is transcribed from the prototype's `computeScore()`:
 *
 *   avg   = mean of the answered 1–5 dimensions
 *   s     = avg * 20
 *   s    += 4 if "see again" is Yes;  s -= 6 if No
 *   s    += 1.2 * greenFlags - 2 * redFlags
 *   score = clamp(round(s), 8, 99)
 *
 * Two documented gaps in the prototype are fixed here (see docs/01-analysis.md §7):
 *   - the intention/goal now actually weights the dimensions, as the UI claims;
 *   - disabled questions no longer contribute, as Settings claims.
 */

import type { Answers, GoalId, Question, SeeAgain, VerdictTone } from './model';
import { QUESTION_IDS } from './model';

export const SCORE_MIN = 8;
export const SCORE_MAX = 99;

/** Bonus/penalty applied by the built-in "see again" answer. */
const SEE_AGAIN_ADJUST: Record<SeeAgain, number> = { Yes: 4, Maybe: 0, No: -6 };
const GREEN_FLAG_BONUS = 1.2;
const RED_FLAG_PENALTY = 2;

/**
 * Per-goal multipliers for the built-in dimensions. The UI promises that
 * "something serious" weights comfort and depth higher, so it does.
 * Custom questions default to 1 under every goal.
 */
const GOAL_WEIGHTS: Record<GoalId, Record<string, number>> = {
  serious: { chemistry: 1.0, conversation: 1.25, comfort: 1.3, fun: 0.9 },
  open: { chemistry: 1, conversation: 1, comfort: 1, fun: 1 },
  casual: { chemistry: 1.2, conversation: 0.9, comfort: 0.9, fun: 1.25 },
  rebuilding: { chemistry: 0.9, conversation: 1.0, comfort: 1.35, fun: 1.15 },
};

/** Human-readable explanation of the active weighting, for Settings. */
export const GOAL_WEIGHT_BLURB: Record<GoalId, string> = {
  serious: 'Scores weight comfort and depth higher',
  open: 'Every question counts equally',
  casual: 'Scores weight fun and chemistry higher',
  rebuilding: 'Scores weight how at ease you felt highest',
};

export function goalWeight(goal: GoalId, questionId: string): number {
  return GOAL_WEIGHTS[goal][questionId] ?? 1;
}

/** The enabled `scale5` questions, in display order — the score's backbone. */
export function scaleQuestions(questions: readonly Question[]): Question[] {
  return questions
    .filter((q) => q.enabled && q.kind === 'scale5')
    .sort((a, b) => a.order - b.order);
}

export function scaleValue(answers: Answers, id: string): number {
  const a = answers[id];
  return a?.kind === 'scale5' ? a.value : 0;
}

export function seeAgainValue(answers: Answers): SeeAgain | null {
  const a = answers[QUESTION_IDS.seeAgain];
  return a?.kind === 'choice' && a.value ? (a.value as SeeAgain) : null;
}

export function flagsValue(answers: Answers): { green: string[]; red: string[] } {
  const a = answers[QUESTION_IDS.flags];
  return a?.kind === 'flagPair' ? { green: a.green, red: a.red } : { green: [], red: [] };
}

export function moodValue(answers: Answers): { before: number; after: number } | null {
  const a = answers[QUESTION_IDS.mood];
  if (a?.kind !== 'moodShift' || (!a.before && !a.after)) return null;
  return { before: a.before, after: a.after };
}

export type ScoreInput = {
  answers: Answers;
  questions: readonly Question[];
  goal: GoalId;
};

/** Weighted mean of the answered enabled dimensions, on the original 1–5 scale. */
export function dimensionMean({ answers, questions, goal }: ScoreInput): number | null {
  let weighted = 0;
  let weight = 0;
  for (const q of scaleQuestions(questions)) {
    const value = scaleValue(answers, q.id);
    if (value <= 0) continue;
    const w = q.weight * goalWeight(goal, q.id);
    if (w <= 0) continue;
    weighted += value * w;
    weight += w;
  }
  return weight > 0 ? weighted / weight : null;
}

export function computeScore(input: ScoreInput): number {
  const mean = dimensionMean(input);
  if (mean === null) return 0;

  let s = mean * 20;

  const enabled = new Set(input.questions.filter((q) => q.enabled).map((q) => q.id));

  if (enabled.has(QUESTION_IDS.seeAgain)) {
    const seeAgain = seeAgainValue(input.answers);
    if (seeAgain) s += SEE_AGAIN_ADJUST[seeAgain];
  }

  if (enabled.has(QUESTION_IDS.flags)) {
    const { green, red } = flagsValue(input.answers);
    s += green.length * GREEN_FLAG_BONUS - red.length * RED_FLAG_PENALTY;
  }

  return Math.max(SCORE_MIN, Math.min(SCORE_MAX, Math.round(s)));
}

/**
 * Gate on the "Reveal my result" button.
 *
 * The prototype required the first two enabled dimensions but never required a
 * person, which let a date be revealed and then silently dropped on save.
 * A person is required here.
 */
export function canReveal(input: {
  personId: string | null;
  answers: Answers;
  questions: readonly Question[];
}): boolean {
  if (!input.personId) return false;
  const needed = scaleQuestions(input.questions).slice(0, 2);
  return needed.every((q) => scaleValue(input.answers, q.id) > 0);
}

/** Why the reveal button is disabled — drives its label. */
export function revealBlocker(input: {
  personId: string | null;
  answers: Answers;
  questions: readonly Question[];
}): 'person' | 'ratings' | null {
  if (!input.personId) return 'person';
  return canReveal(input) ? null : 'ratings';
}

// -------------------------------------------------------------- grading

export function grade(score: number): string {
  if (score >= 93) return 'A+';
  if (score >= 88) return 'A';
  if (score >= 83) return 'A-';
  if (score >= 78) return 'B+';
  if (score >= 72) return 'B';
  if (score >= 66) return 'B-';
  if (score >= 58) return 'C+';
  if (score >= 50) return 'C';
  if (score >= 42) return 'C-';
  return 'D';
}

export function gradeWord(score: number): string {
  if (score >= 88) return 'Exceptional';
  if (score >= 78) return 'Strong';
  if (score >= 66) return 'Solid';
  if (score >= 50) return 'Mixed';
  return 'Rough';
}

const VERDICT_TITLES = [
  'A rare spark',
  'Real potential',
  'Pleasant, not electric',
  'Lukewarm',
  'One and done',
] as const;

const VERDICT_SUBS: Record<VerdictTone, readonly string[]> = {
  Gentle: [
    'Something worth nurturing here.',
    'A promising start — give it room.',
    'Nice company, no pressure to force it.',
    'It was fine. That is allowed to be enough.',
    'Not the one, and that is okay.',
  ],
  Playful: [
    'Cancel your other plans.',
    'Worth a second round, clearly.',
    'Good, but the fireworks stayed home.',
    'The conversation carried it. Barely.',
    'Trust the ick and move on.',
  ],
  Blunt: [
    'This one matters — do not fumble it.',
    'Follow up within 48 hours.',
    'Do not overinvest in a maybe.',
    'You are settling if you go again.',
    'Delete the number. Next.',
  ],
};

/** Band 0 (best) … 4 (worst). "No" to a second date caps the band at 2. */
export function verdictBand(score: number, seeAgain: SeeAgain | null): number {
  let band = score >= 85 ? 0 : score >= 74 ? 1 : score >= 60 ? 2 : score >= 45 ? 3 : 4;
  if (seeAgain === 'No' && band < 2) band = 2;
  return band;
}

export function verdict(
  score: number,
  seeAgain: SeeAgain | null,
  tone: VerdictTone
): { title: string; sub: string } {
  const band = verdictBand(score, seeAgain);
  return { title: VERDICT_TITLES[band], sub: (VERDICT_SUBS[tone] ?? VERDICT_SUBS.Playful)[band] };
}
