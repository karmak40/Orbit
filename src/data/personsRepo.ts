/**
 * Repository for `Person`. Encrypts `name`/`note` on write, decrypts on read —
 * everything above this layer (`core/`, `ui/`, screens) only ever sees plain
 * `Person` objects from `src/core/model.ts`.
 */
import type { Person, StatusId } from '../core/model';
import { decryptField, decryptOptional, encryptField, encryptOptional } from './crypto';
import { getDb } from './db';

type PersonRow = {
  id: string;
  name_enc: string;
  source: string | null;
  status: string;
  note_enc: string;
  created_at: string;
  updated_at: string;
};

async function fromRow(row: PersonRow): Promise<Person> {
  const [name, note] = await Promise.all([decryptField(row.name_enc), decryptOptional(row.note_enc)]);
  return {
    id: row.id,
    name,
    source: row.source,
    status: row.status as StatusId,
    note,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listPersons(): Promise<Person[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<PersonRow>('SELECT * FROM persons ORDER BY created_at ASC;');
  return Promise.all(rows.map(fromRow));
}

export async function getPerson(id: string): Promise<Person | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<PersonRow>('SELECT * FROM persons WHERE id = ?;', id);
  return row ? fromRow(row) : null;
}

export type NewPerson = {
  id: string;
  name: string;
  source: string | null;
  status: StatusId;
  note?: string;
};

export async function createPerson(input: NewPerson): Promise<Person> {
  const db = await getDb();
  const now = new Date().toISOString();
  const [nameEnc, noteEnc] = await Promise.all([
    encryptField(input.name),
    encryptOptional(input.note ?? ''),
  ]);
  await db.runAsync(
    `INSERT INTO persons (id, name_enc, source, status, note_enc, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?);`,
    input.id,
    nameEnc,
    input.source,
    input.status,
    noteEnc,
    now,
    now
  );
  return { id: input.id, name: input.name, source: input.source, status: input.status, note: input.note ?? '', createdAt: now, updatedAt: now };
}

export type PersonPatch = Partial<Pick<Person, 'name' | 'source' | 'status' | 'note'>>;

export async function updatePerson(id: string, patch: PersonPatch): Promise<void> {
  const db = await getDb();
  const now = new Date().toISOString();
  const sets: string[] = [];
  const params: (string | null)[] = [];

  if (patch.name !== undefined) {
    sets.push('name_enc = ?');
    params.push(await encryptField(patch.name));
  }
  if (patch.source !== undefined) {
    sets.push('source = ?');
    params.push(patch.source);
  }
  if (patch.status !== undefined) {
    sets.push('status = ?');
    params.push(patch.status);
  }
  if (patch.note !== undefined) {
    sets.push('note_enc = ?');
    params.push(await encryptOptional(patch.note));
  }
  if (sets.length === 0) return;

  sets.push('updated_at = ?');
  params.push(now);
  params.push(id);
  await db.runAsync(`UPDATE persons SET ${sets.join(', ')} WHERE id = ?;`, ...params);
}

/** Deletes the person and, via `ON DELETE CASCADE`, every date logged with them. */
export async function deletePerson(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM persons WHERE id = ?;', id);
}
