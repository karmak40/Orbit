import { describe, expect, it } from '@jest/globals';

import type { DateLog, Person } from '../model';
import {
  BADGES,
  LEVELS,
  badgeStats,
  earnedBadgeIds,
  levelFor,
  newlyEarned,
  streakWeeks,
  totalXp,
  weekIndex,
  weeklyIntensity,
  xpForScore,
} from '../progress';

describe('xp and levels', () => {
  it('awards XP from the score', () => {
    expect(xpForScore(0)).toBe(40);
    expect(xpForScore(91)).toBe(72);
    expect(xpForScore(99)).toBe(75);
  });

  it('sums XP across dates', () => {
    expect(totalXp([{ score: 91 }, { score: 54 }])).toBe(72 + 59);
  });

  it('reproduces the level card in the design (320 XP = level 4, next at 500)', () => {
    const state = levelFor(320);
    expect(state.level).toBe(4);
    expect(state.name).toBe('Finding your rhythm');
    expect(state.nextXp).toBe(500);
    expect(state.fill).toBeCloseTo(0.64);
  });

  it('starts at level 1 and saturates at the last level', () => {
    expect(levelFor(0).level).toBe(1);
    expect(levelFor(89).level).toBe(1);
    expect(levelFor(90).level).toBe(2);

    const max = levelFor(99999);
    expect(max.level).toBe(LEVELS[LEVELS.length - 1].level);
    expect(max.nextXp).toBeNull();
    expect(max.fill).toBe(1);
  });
});

describe('week arithmetic', () => {
  it('groups Monday through Sunday into one week', () => {
    // 2026-07-20 is a Monday, 2026-07-26 the Sunday that closes the same week.
    expect(weekIndex('2026-07-20')).toBe(weekIndex('2026-07-26'));
    expect(weekIndex('2026-07-27')).toBe(weekIndex('2026-07-20') + 1);
    expect(weekIndex('2026-07-19')).toBe(weekIndex('2026-07-20') - 1);
  });
});

describe('streakWeeks', () => {
  const today = '2026-07-23'; // a Thursday

  it('is zero with no dates', () => {
    expect(streakWeeks([], today)).toBe(0);
  });

  it('counts consecutive weeks ending this week', () => {
    expect(streakWeeks(['2026-07-22', '2026-07-15', '2026-07-08'], today)).toBe(3);
  });

  it('does not break on a current week that has no date yet', () => {
    // nothing logged this week, but the three before it are covered
    expect(streakWeeks(['2026-07-15', '2026-07-08', '2026-07-01'], today)).toBe(3);
  });

  it('breaks when a whole week is missed', () => {
    // this week and last week are both empty
    expect(streakWeeks(['2026-07-08', '2026-07-01'], today)).toBe(0);
  });

  it('counts a week once however many dates it holds', () => {
    expect(streakWeeks(['2026-07-20', '2026-07-21', '2026-07-22'], today)).toBe(1);
  });
});

describe('weeklyIntensity', () => {
  it('returns oldest-first buckets capped at 2', () => {
    const out = weeklyIntensity(
      ['2026-07-20', '2026-07-21', '2026-07-22', '2026-07-15'],
      '2026-07-23',
      3
    );
    expect(out).toHaveLength(3);
    expect(out[2]).toBe(2); // this week, 3 dates -> capped
    expect(out[1]).toBe(1); // last week
    expect(out[0]).toBe(0);
  });
});

// ------------------------------------------------------------- badges

function person(id: string): Person {
  return {
    id,
    name: id,
    source: null,
    status: 'talking',
    note: '',
    createdAt: '',
    updatedAt: '',
  };
}

function date(id: string, personId: string, over: Partial<DateLog> = {}): DateLog {
  return {
    id,
    personId,
    activity: 'Coffee',
    day: '2026-07-22',
    note: '',
    score: 70,
    answers: { flags: { kind: 'flagPair', green: [], red: [] } },
    createdAt: '',
    updatedAt: '',
    ...over,
  };
}

describe('badges', () => {
  const today = '2026-07-23';

  it('earns nothing on an empty journal', () => {
    expect(earnedBadgeIds(badgeStats([], [], today))).toEqual([]);
  });

  it('earns First Date on the first log', () => {
    const stats = badgeStats([person('a')], [date('d1', 'a')], today);
    expect(earnedBadgeIds(stats)).toContain('first-date');
  });

  it('earns Sky High only at 90+', () => {
    const at89 = badgeStats([person('a')], [date('d1', 'a', { score: 89 })], today);
    const at90 = badgeStats([person('a')], [date('d1', 'a', { score: 90 })], today);
    expect(earnedBadgeIds(at89)).not.toContain('sky-high');
    expect(earnedBadgeIds(at90)).toContain('sky-high');
  });

  it('earns Second Round for two dates with the same person', () => {
    const twoPeople = badgeStats(
      [person('a'), person('b')],
      [date('d1', 'a'), date('d2', 'b')],
      today
    );
    const samePerson = badgeStats([person('a')], [date('d1', 'a'), date('d2', 'a')], today);
    expect(earnedBadgeIds(twoPeople)).not.toContain('second-round');
    expect(earnedBadgeIds(samePerson)).toContain('second-round');
  });

  it('earns Honest Eye from a logged red flag', () => {
    const stats = badgeStats(
      [person('a')],
      [
        date('d1', 'a', {
          answers: { flags: { kind: 'flagPair', green: [], red: ['Ran late'] } },
        }),
      ],
      today
    );
    expect(earnedBadgeIds(stats)).toContain('honest-eye');
  });

  it('counts only non-empty notes toward Open Book', () => {
    const dates = Array.from({ length: 10 }, (_, i) =>
      date(`d${i}`, 'a', { note: i < 9 ? 'something' : '   ' })
    );
    expect(earnedBadgeIds(badgeStats([person('a')], dates, today))).not.toContain('open-book');

    dates[9] = date('d9', 'a', { note: 'real note' });
    expect(earnedBadgeIds(badgeStats([person('a')], dates, today))).toContain('open-book');
  });

  it('reports only badges that are new since the last save', () => {
    const stats = badgeStats([person('a')], [date('d1', 'a', { score: 95 })], today);
    const fresh = newlyEarned(['first-date'], stats).map((b) => b.id);
    expect(fresh).toContain('sky-high');
    expect(fresh).not.toContain('first-date');
  });

  it('has a rule for every badge in the design', () => {
    expect(BADGES).toHaveLength(9);
  });
});
