/**
 * Repository for `Settings` — a single JSON row. Not encrypted: goal,
 * reminder toggles and privacy switches are app configuration, not the
 * sensitive payload (people, notes, ratings) the encryption in `crypto.ts`
 * exists to protect.
 */
import { DEFAULT_SETTINGS, type Settings } from '../core/model';
import { getDb } from './db';

export async function getSettings(): Promise<Settings> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ json: string }>('SELECT json FROM settings WHERE id = 1;');
  if (!row) {
    await db.runAsync('INSERT INTO settings (id, json) VALUES (1, ?);', JSON.stringify(DEFAULT_SETTINGS));
    return DEFAULT_SETTINGS;
  }
  return { ...DEFAULT_SETTINGS, ...(JSON.parse(row.json) as Partial<Settings>) };
}

export async function updateSettings(patch: Partial<Settings>): Promise<Settings> {
  const current = await getSettings();
  const next: Settings = {
    ...current,
    ...patch,
    privacy: { ...current.privacy, ...patch.privacy },
    reminders: { ...current.reminders, ...patch.reminders },
  };
  const db = await getDb();
  await db.runAsync('UPDATE settings SET json = ? WHERE id = 1;', JSON.stringify(next));
  return next;
}
