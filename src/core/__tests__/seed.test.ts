import { describe, expect, it } from '@jest/globals';

import { SCORE_MAX, SCORE_MIN } from '../scoring';
import { SEED_DATES, seedScore } from '../seed';

describe('seed data', () => {
  it('computes a valid score for every seed date', () => {
    for (const date of SEED_DATES) {
      const score = seedScore(date);
      expect(score).toBeGreaterThanOrEqual(SCORE_MIN);
      expect(score).toBeLessThanOrEqual(SCORE_MAX);
    }
  });

  it('ranks the best-feeling date (d4) above the flattest one (d8)', () => {
    const byId = Object.fromEntries(SEED_DATES.map((d) => [d.id, seedScore(d)]));
    expect(byId.d4).toBeGreaterThan(byId.d8);
    // eslint-disable-next-line no-console
    console.log('seed scores:', byId);
  });
});
