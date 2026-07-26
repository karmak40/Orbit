/**
 * SQLite connection + migrations.
 *
 * A single `orbit.db` opened once and reused everywhere (`expo-sqlite`'s async
 * API is safe to share). Migrations are a flat, ordered list of SQL statements
 * keyed by target version — plenty for a pre-launch app; if this grows, split
 * each version into its own file under `migrations/`.
 */
import * as SQLite from 'expo-sqlite';

const DB_NAME = 'orbit.db';

const MIGRATIONS: readonly { version: number; statements: readonly string[] }[] = [
  {
    version: 1,
    statements: [
      `CREATE TABLE persons (
        id TEXT PRIMARY KEY NOT NULL,
        name_enc TEXT NOT NULL,
        source TEXT,
        status TEXT NOT NULL,
        note_enc TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );`,
      `CREATE TABLE dates (
        id TEXT PRIMARY KEY NOT NULL,
        person_id TEXT NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
        activity TEXT NOT NULL,
        day TEXT NOT NULL,
        score INTEGER NOT NULL,
        note_enc TEXT NOT NULL,
        answers_enc TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );`,
      `CREATE INDEX idx_dates_person ON dates(person_id);`,
      `CREATE INDEX idx_dates_day ON dates(day);`,
      `CREATE TABLE questions (
        id TEXT PRIMARY KEY NOT NULL,
        kind TEXT NOT NULL,
        label TEXT NOT NULL,
        hint TEXT,
        sub TEXT NOT NULL,
        enabled INTEGER NOT NULL,
        order_num INTEGER NOT NULL,
        weight REAL NOT NULL,
        options_json TEXT,
        polarity TEXT,
        built_in INTEGER NOT NULL
      );`,
      `CREATE TABLE settings (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        json TEXT NOT NULL
      );`,
    ],
  },
];

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

async function migrate(db: SQLite.SQLiteDatabase): Promise<void> {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version;');
  let version = row?.user_version ?? 0;

  for (const step of MIGRATIONS) {
    if (step.version <= version) continue;
    await db.withTransactionAsync(async () => {
      for (const sql of step.statements) {
        await db.execAsync(sql);
      }
      await db.execAsync(`PRAGMA user_version = ${step.version};`);
    });
    version = step.version;
  }
}

/** Opens (once) and migrates the database. Safe to call repeatedly — later calls reuse the same connection. */
export async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = await SQLite.openDatabaseAsync(DB_NAME);
      await db.execAsync('PRAGMA foreign_keys = ON;');
      await migrate(db);
      return db;
    })();
  }
  return dbPromise;
}

/** Test/dev-only: drops every table and re-runs migrations from empty. Never exposed in the UI. */
export async function resetDatabase(): Promise<void> {
  const db = await getDb();
  await db.execAsync(
    'DROP TABLE IF EXISTS dates; DROP TABLE IF EXISTS persons; DROP TABLE IF EXISTS questions; DROP TABLE IF EXISTS settings; PRAGMA user_version = 0;'
  );
  await migrate(db);
}
