import type { TFunction } from 'i18next';

import type { VerdictTone } from '../core/model';
import { gradeWord as gradeWordEn, verdictBand } from '../core/scoring';

/**
 * Bridges the plain-English constants `src/core/` returns (and must keep
 * returning — it stays pure, no i18n import) to the active language. `core/`
 * functions like `verdictBand`/`gradeWord`/`SOURCES.indexOf(...)` give an
 * index or an English label; these turn that into a translated string.
 */

function tArray(t: TFunction, key: string): string[] {
  const result = t(key, { returnObjects: true });
  return Array.isArray(result) ? (result as string[]) : [];
}

/** Translates a value against one of the fixed enum arrays (SOURCES, ACTIVITIES, …). Unknown values (seed/demo flavour text) pass through untouched. */
export function translateEnum(t: TFunction, i18nKey: string, options: readonly string[], value: string): string {
  const i = options.indexOf(value);
  if (i < 0) return value;
  return tArray(t, i18nKey)[i] ?? value;
}

const GRADE_WORD_KEYS: Record<string, string> = {
  Exceptional: 'exceptional',
  Strong: 'strong',
  Solid: 'solid',
  Mixed: 'mixed',
  Rough: 'rough',
};

export function tGradeWord(t: TFunction, score: number): string {
  const en = gradeWordEn(score);
  return t(`grade.${GRADE_WORD_KEYS[en] ?? 'solid'}`);
}

export function tVerdictTitle(t: TFunction, score: number, seeAgain: 'Yes' | 'Maybe' | 'No' | null): string {
  const band = verdictBand(score, seeAgain);
  return tArray(t, 'verdict.title')[band] ?? '';
}

export function tVerdictSub(
  t: TFunction,
  score: number,
  seeAgain: 'Yes' | 'Maybe' | 'No' | null,
  tone: VerdictTone
): string {
  const band = verdictBand(score, seeAgain);
  const key = tone.toLowerCase();
  return tArray(t, `verdict.${key}`)[band] ?? tArray(t, 'verdict.playful')[band] ?? '';
}
