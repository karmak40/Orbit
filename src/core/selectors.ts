/**
 * Pure transforms from raw repository rows to the read models screens render.
 * Kept in `core/` (no React, no `data/` imports) so they're unit-testable and
 * reusable from both the app and any future export/report code.
 */
import type { DateLog, DateLogWithPerson, Person, PersonWithStats } from './model';

function monthLabel(day: string): string {
  const [y, m] = day.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

/** Short date label ("Jul 18") for list rows — the design's `d.date` field. */
export function dayLabel(day: string, locale = 'en-US'): string {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString(locale, {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

export function peopleWithStats(people: readonly Person[], dates: readonly DateLog[]): PersonWithStats[] {
  return people.map((p) => {
    const own = dates.filter((d) => d.personId === p.id).sort((a, b) => a.day.localeCompare(b.day));
    const n = own.length;
    const avgScore = n === 0 ? null : Math.round(own.reduce((sum, d) => sum + d.score, 0) / n);
    let trend: PersonWithStats['trend'] = 'none';
    if (n > 1) {
      const last = own[n - 1].score;
      const prev = own[n - 2].score;
      trend = last > prev ? 'up' : last < prev ? 'down' : 'flat';
    }
    return { ...p, dateCount: n, avgScore, trend, lastDay: n ? own[n - 1].day : null };
  });
}

export function datesWithPerson(
  dates: readonly DateLog[],
  people: readonly Person[]
): DateLogWithPerson[] {
  const byId = new Map(people.map((p) => [p.id, p]));
  return dates
    .map((d) => {
      const person = byId.get(d.personId);
      return {
        ...d,
        personName: person?.name ?? 'Someone',
        personInitial: (person?.name.trim()[0] ?? '?').toUpperCase(),
      };
    })
    .sort((a, b) => b.day.localeCompare(a.day) || b.createdAt.localeCompare(a.createdAt));
}

/** Month-grouped, most recent month first — the Timeline screen's shape. */
export function historyByMonth(
  dates: readonly DateLogWithPerson[]
): { month: string; items: DateLogWithPerson[] }[] {
  const groups: { month: string; items: DateLogWithPerson[] }[] = [];
  for (const d of dates) {
    const month = monthLabel(d.day);
    let group = groups.find((g) => g.month === month);
    if (!group) {
      group = { month, items: [] };
      groups.push(group);
    }
    group.items.push(d);
  }
  return groups;
}
