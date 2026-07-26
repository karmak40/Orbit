/**
 * Sample data for first-run "Preview with sample data" and for local dev.
 *
 * People, activities and notes are carried over verbatim from the prototype's
 * `seedPeople()` (design/Dating Tracker.dc.html:1036) so the seeded app reads
 * exactly like the design. One thing the prototype never actually had: the
 * prototype only ever stored a bare `score` per date, with no rating answers
 * behind it (`od.ratings || {chemistry:4, ...}` is a hardcoded fallback used
 * for every seeded date — see docs/01-analysis.md §7.7). Our model ties score
 * to answers via `computeScore`, so each date below carries real per-dimension
 * ratings chosen to match the *tone* of its note; the resulting score lands
 * close to, but not always identical to, the prototype's hardcoded number.
 */
import { computeScore } from './scoring';
import { BUILT_IN_QUESTIONS, type Answers, type StatusId } from './model';

export type SeedPerson = {
  id: string;
  name: string;
  source: string;
  status: StatusId;
};

export type SeedDate = {
  id: string;
  personId: string;
  activity: string;
  day: string;
  note: string;
  answers: Answers;
};

function answers(a: {
  chemistry?: number;
  conversation?: number;
  comfort?: number;
  fun?: number;
  seeAgain?: 'Yes' | 'Maybe' | 'No';
  whoPaid?: 'I did' | 'They did' | 'Split';
  green?: string[];
  red?: string[];
}): Answers {
  return {
    chemistry: { kind: 'scale5', value: a.chemistry ?? 0 },
    conversation: { kind: 'scale5', value: a.conversation ?? 0 },
    comfort: { kind: 'scale5', value: a.comfort ?? 0 },
    fun: { kind: 'scale5', value: a.fun ?? 0 },
    mood: { kind: 'moodShift', before: 0, after: 0 },
    seeAgain: { kind: 'choice', value: a.seeAgain ?? null },
    whoPaid: { kind: 'choice', value: a.whoPaid ?? null },
    flags: { kind: 'flagPair', green: a.green ?? [], red: a.red ?? [] },
  };
}

export const SEED_PEOPLE: readonly SeedPerson[] = [
  { id: 'maya', name: 'Maya', source: 'Bumble', status: 'seeing' },
  { id: 'alex', name: 'Alex', source: 'Coffee shop', status: 'exclusive' },
  { id: 'jordan', name: 'Jordan', source: 'Hinge', status: 'fence' },
  { id: 'sam', name: 'Sam', source: 'IRL', status: 'faded' },
];

export const SEED_DATES: readonly SeedDate[] = [
  {
    id: 'd1',
    personId: 'maya',
    activity: 'Wine bar downtown',
    day: '2026-07-18',
    note: 'Talked until they closed. Genuinely funny.',
    answers: answers({
      chemistry: 4,
      conversation: 5,
      comfort: 4,
      fun: 4,
      seeAgain: 'Yes',
      whoPaid: 'Split',
      green: ['Made me laugh'],
    }),
  },
  {
    id: 'd2',
    personId: 'maya',
    activity: 'Coffee & a walk',
    day: '2026-07-09',
    note: 'Easy. A little nervous but warmed up fast.',
    answers: answers({
      chemistry: 4,
      conversation: 4,
      comfort: 4,
      fun: 4,
      seeAgain: 'Yes',
      whoPaid: 'Split',
      green: ['Curious'],
    }),
  },
  {
    id: 'd3',
    personId: 'maya',
    activity: 'First — dinner',
    day: '2026-06-28',
    note: 'Great first impression, split the bill.',
    answers: answers({
      chemistry: 4,
      conversation: 4,
      comfort: 3,
      fun: 4,
      seeAgain: 'Yes',
      whoPaid: 'Split',
      green: ['On time'],
    }),
  },
  {
    id: 'd4',
    personId: 'alex',
    activity: 'Cooked dinner in',
    day: '2026-07-20',
    note: 'Felt like it clicked. No phones out once.',
    answers: answers({
      chemistry: 5,
      conversation: 5,
      comfort: 5,
      fun: 5,
      seeAgain: 'Yes',
      whoPaid: 'They did',
      green: ['Great listener', 'Curious'],
    }),
  },
  {
    id: 'd5',
    personId: 'alex',
    activity: 'Gallery + drinks',
    day: '2026-07-11',
    note: 'Curious about everything. Good listener.',
    answers: answers({
      chemistry: 5,
      conversation: 5,
      comfort: 4,
      fun: 4,
      seeAgain: 'Yes',
      whoPaid: 'Split',
      green: ['Great listener', 'Curious'],
    }),
  },
  {
    id: 'd6',
    personId: 'jordan',
    activity: 'Drinks after work',
    day: '2026-07-15',
    note: 'Fun but a bit self-focused.',
    answers: answers({
      chemistry: 4,
      conversation: 3,
      comfort: 3,
      fun: 4,
      seeAgain: 'Maybe',
      whoPaid: 'I did',
      red: ['Bragging'],
    }),
  },
  {
    id: 'd7',
    personId: 'jordan',
    activity: 'Mini golf',
    day: '2026-07-05',
    note: 'Competitive in a cute way.',
    answers: answers({
      chemistry: 4,
      conversation: 4,
      comfort: 4,
      fun: 3,
      seeAgain: 'Maybe',
      whoPaid: 'Split',
    }),
  },
  {
    id: 'd8',
    personId: 'sam',
    activity: 'Coffee',
    day: '2026-07-02',
    note: 'Pleasant, no spark. On their phone.',
    answers: answers({
      chemistry: 3,
      conversation: 3,
      comfort: 3,
      fun: 3,
      seeAgain: 'No',
      whoPaid: 'Split',
      red: ['On their phone'],
    }),
  },
];

/** Score for a seed date, computed the same way a real logged date would be. */
export function seedScore(date: SeedDate): number {
  return computeScore({ answers: date.answers, questions: BUILT_IN_QUESTIONS, goal: 'open' });
}
