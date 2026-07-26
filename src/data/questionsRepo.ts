/**
 * Repository for the question schema (docs/01-analysis.md §11.4 — custom
 * questions is a v2 feature flag, not a v1 schema change). Seeds the eight
 * built-ins on first run; `upsert` already supports non-built-in rows so
 * enabling custom questions later needs no migration.
 */
import { BUILT_IN_QUESTIONS, type Question, type QuestionKind } from '../core/model';
import { getDb } from './db';

type QuestionRow = {
  id: string;
  kind: string;
  label: string;
  hint: string | null;
  sub: string;
  enabled: number;
  order_num: number;
  weight: number;
  options_json: string | null;
  polarity: string | null;
  built_in: number;
};

function fromRow(row: QuestionRow): Question {
  return {
    id: row.id,
    kind: row.kind as QuestionKind,
    label: row.label,
    hint: row.hint ?? undefined,
    sub: row.sub,
    enabled: row.enabled === 1,
    order: row.order_num,
    weight: row.weight,
    options: row.options_json ? (JSON.parse(row.options_json) as string[]) : undefined,
    polarity: (row.polarity as 'green' | 'red' | null) ?? undefined,
    builtIn: row.built_in === 1,
  };
}

async function insert(q: Question): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO questions (id, kind, label, hint, sub, enabled, order_num, weight, options_json, polarity, built_in)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    q.id,
    q.kind,
    q.label,
    q.hint ?? null,
    q.sub,
    q.enabled ? 1 : 0,
    q.order,
    q.weight,
    q.options ? JSON.stringify(q.options) : null,
    q.polarity ?? null,
    q.builtIn ? 1 : 0
  );
}

/** Idempotent — inserts the built-in questions only if the table is empty. */
export async function seedQuestionsIfEmpty(): Promise<void> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) as n FROM questions;');
  if ((row?.n ?? 0) > 0) return;
  for (const q of BUILT_IN_QUESTIONS) {
    await insert(q);
  }
}

export async function listQuestions(): Promise<Question[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<QuestionRow>('SELECT * FROM questions ORDER BY order_num ASC;');
  return rows.map(fromRow);
}

export async function setQuestionEnabled(id: string, enabled: boolean): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE questions SET enabled = ? WHERE id = ?;', enabled ? 1 : 0, id);
}

/** Insert-or-replace, for future custom questions (`builtIn: false`). */
export async function upsertQuestion(q: Question): Promise<void> {
  const db = await getDb();
  const existing = await db.getFirstAsync<{ id: string }>('SELECT id FROM questions WHERE id = ?;', q.id);
  if (existing) {
    await db.runAsync(
      `UPDATE questions SET kind=?, label=?, hint=?, sub=?, enabled=?, order_num=?, weight=?, options_json=?, polarity=?
       WHERE id = ?;`,
      q.kind,
      q.label,
      q.hint ?? null,
      q.sub,
      q.enabled ? 1 : 0,
      q.order,
      q.weight,
      q.options ? JSON.stringify(q.options) : null,
      q.polarity ?? null,
      q.id
    );
  } else {
    await insert(q);
  }
}
