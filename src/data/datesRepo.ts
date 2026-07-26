/**
 * Repository for `DateLog`. `activity`, `day`, `score` and `person_id` stay
 * plaintext — they're needed for sorting/filtering and aren't the sensitive
 * payload; `note` and the full `answers` (which carry green/red flags and
 * mood) are encrypted. Data volume is small enough (docs/01-analysis.md §4)
 * that aggregation happens in `core/` over decrypted rows rather than in SQL.
 */
import type { Answers, DateLog } from '../core/model';
import { decryptField, decryptOptional, encryptField, encryptOptional } from './crypto';
import { getDb } from './db';

type DateRow = {
  id: string;
  person_id: string;
  activity: string;
  day: string;
  score: number;
  note_enc: string;
  answers_enc: string;
  created_at: string;
  updated_at: string;
};

async function fromRow(row: DateRow): Promise<DateLog> {
  const [note, answersJson] = await Promise.all([
    decryptOptional(row.note_enc),
    decryptField(row.answers_enc),
  ]);
  return {
    id: row.id,
    personId: row.person_id,
    activity: row.activity,
    day: row.day,
    score: row.score,
    note,
    answers: JSON.parse(answersJson) as Answers,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listAllDates(): Promise<DateLog[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<DateRow>('SELECT * FROM dates ORDER BY day DESC, created_at DESC;');
  return Promise.all(rows.map(fromRow));
}

export async function listDatesForPerson(personId: string): Promise<DateLog[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<DateRow>(
    'SELECT * FROM dates WHERE person_id = ? ORDER BY day DESC, created_at DESC;',
    personId
  );
  return Promise.all(rows.map(fromRow));
}

export async function getDateLog(id: string): Promise<DateLog | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<DateRow>('SELECT * FROM dates WHERE id = ?;', id);
  return row ? fromRow(row) : null;
}

export type NewDateLog = {
  id: string;
  personId: string;
  activity: string;
  day: string;
  score: number;
  note?: string;
  answers: Answers;
};

export async function createDateLog(input: NewDateLog): Promise<DateLog> {
  const db = await getDb();
  const now = new Date().toISOString();
  const [noteEnc, answersEnc] = await Promise.all([
    encryptOptional(input.note ?? ''),
    encryptField(JSON.stringify(input.answers)),
  ]);
  await db.runAsync(
    `INSERT INTO dates (id, person_id, activity, day, score, note_enc, answers_enc, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    input.id,
    input.personId,
    input.activity,
    input.day,
    input.score,
    noteEnc,
    answersEnc,
    now,
    now
  );
  return {
    id: input.id,
    personId: input.personId,
    activity: input.activity,
    day: input.day,
    score: input.score,
    note: input.note ?? '',
    answers: input.answers,
    createdAt: now,
    updatedAt: now,
  };
}

export type DateLogPatch = Partial<Pick<DateLog, 'activity' | 'day' | 'score' | 'note' | 'answers'>>;

export async function updateDateLog(id: string, patch: DateLogPatch): Promise<void> {
  const db = await getDb();
  const now = new Date().toISOString();
  const sets: string[] = [];
  const params: (string | number)[] = [];

  if (patch.activity !== undefined) {
    sets.push('activity = ?');
    params.push(patch.activity);
  }
  if (patch.day !== undefined) {
    sets.push('day = ?');
    params.push(patch.day);
  }
  if (patch.score !== undefined) {
    sets.push('score = ?');
    params.push(patch.score);
  }
  if (patch.note !== undefined) {
    sets.push('note_enc = ?');
    params.push(await encryptOptional(patch.note));
  }
  if (patch.answers !== undefined) {
    sets.push('answers_enc = ?');
    params.push(await encryptField(JSON.stringify(patch.answers)));
  }
  if (sets.length === 0) return;

  sets.push('updated_at = ?');
  params.push(now);
  params.push(id);
  await db.runAsync(`UPDATE dates SET ${sets.join(', ')} WHERE id = ?;`, ...params);
}

export async function deleteDateLog(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM dates WHERE id = ?;', id);
}
