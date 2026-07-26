import { describe, expect, it } from '@jest/globals';

import type { DateLog, Person } from '../model';
import { datesWithPerson, dayLabel, historyByMonth, peopleWithStats } from '../selectors';

function person(id: string, name: string): Person {
  return { id, name, source: null, status: 'talking', note: '', createdAt: '', updatedAt: '' };
}

function date(id: string, personId: string, day: string, score: number): DateLog {
  return {
    id,
    personId,
    activity: 'Coffee',
    day,
    score,
    note: '',
    answers: {},
    createdAt: day,
    updatedAt: day,
  };
}

describe('peopleWithStats', () => {
  it('reports no dates as null average and "none" trend', () => {
    const [stats] = peopleWithStats([person('a', 'Alex')], []);
    expect(stats.dateCount).toBe(0);
    expect(stats.avgScore).toBeNull();
    expect(stats.trend).toBe('none');
  });

  it('averages scores and detects an upward trend from the last two dates', () => {
    const dates = [date('d1', 'a', '2026-07-01', 60), date('d2', 'a', '2026-07-10', 80)];
    const [stats] = peopleWithStats([person('a', 'Alex')], dates);
    expect(stats.avgScore).toBe(70);
    expect(stats.trend).toBe('up');
    expect(stats.lastDay).toBe('2026-07-10');
  });

  it('detects a downward trend regardless of input order', () => {
    const dates = [date('d2', 'a', '2026-07-10', 50), date('d1', 'a', '2026-07-01', 80)];
    const [stats] = peopleWithStats([person('a', 'Alex')], dates);
    expect(stats.trend).toBe('down');
  });
});

describe('datesWithPerson', () => {
  it('attaches the person name and initial, newest first', () => {
    const people = [person('a', 'Alex'), person('b', 'Blair')];
    const dates = [date('d1', 'a', '2026-07-01', 60), date('d2', 'b', '2026-07-10', 80)];
    const out = datesWithPerson(dates, people);
    expect(out[0]).toMatchObject({ id: 'd2', personName: 'Blair', personInitial: 'B' });
    expect(out[1]).toMatchObject({ id: 'd1', personName: 'Alex', personInitial: 'A' });
  });

  it('falls back gracefully if the person was deleted', () => {
    const [row] = datesWithPerson([date('d1', 'missing', '2026-07-01', 60)], []);
    expect(row.personName).toBe('Someone');
  });
});

describe('historyByMonth', () => {
  it('groups by calendar month, preserving encounter order', () => {
    const people = [person('a', 'Alex')];
    const dates = datesWithPerson(
      [date('d1', 'a', '2026-06-28', 70), date('d2', 'a', '2026-07-18', 90)],
      people
    );
    const groups = historyByMonth(dates);
    expect(groups.map((g) => g.month)).toEqual(['July 2026', 'June 2026']);
    expect(groups[0].items).toHaveLength(1);
  });
});

describe('dayLabel', () => {
  it('formats as short month + day', () => {
    expect(dayLabel('2026-07-18')).toBe('Jul 18');
  });
});
