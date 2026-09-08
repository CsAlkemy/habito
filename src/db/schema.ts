import type { SQLiteDatabase } from 'expo-sqlite';

export const DATABASE_NAME = 'habito.db';

/**
 * Bump this and add a branch below for every shipped schema change. SQLite's
 * own `user_version` pragma tracks where a given install has got to, so an
 * upgrade never re-runs a migration it has already applied.
 */
const LATEST_VERSION = 2;

export async function migrate(db: SQLiteDatabase): Promise<void> {
  // WAL keeps reads from blocking the write that happens on every check-in.
  await db.execAsync('PRAGMA journal_mode = WAL;');
  await db.execAsync('PRAGMA foreign_keys = ON;');

  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const version = row?.user_version ?? 0;
  if (version >= LATEST_VERSION) return;

  if (version < 1) {
    await db.execAsync(`
      CREATE TABLE habits (
        id             TEXT PRIMARY KEY NOT NULL,
        name           TEXT NOT NULL,
        kind           TEXT NOT NULL CHECK (kind IN ('count','streak','custom')),
        color          TEXT NOT NULL,
        unit           TEXT,
        target         INTEGER,
        goal           TEXT,
        schedule       TEXT NOT NULL DEFAULT 'daily'
                       CHECK (schedule IN ('daily','weekdays','some')),
        reminder       TEXT,
        milestone_noun TEXT,
        created_at     TEXT NOT NULL,
        archived_at    TEXT,
        sort_order     INTEGER NOT NULL DEFAULT 0
      );

      CREATE TABLE entries (
        habit_id    TEXT NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
        day         TEXT NOT NULL,
        status      TEXT NOT NULL CHECK (status IN ('open','done','skipped')),
        value       INTEGER NOT NULL DEFAULT 0,
        done_at     TEXT,
        skip_reason TEXT,
        skip_note   TEXT,
        PRIMARY KEY (habit_id, day)
      );

      CREATE INDEX entries_by_day ON entries (day);

      CREATE TABLE settings (
        key   TEXT PRIMARY KEY NOT NULL,
        value TEXT NOT NULL
      );
    `);
  }

  if (version < 2) {
    // '#72d7f0' was the hard-coded default colour before accents were
    // selectable; those habits were never an explicit choice, so they now
    // follow the app accent (the 'accent' sentinel — see theme/tokens.ts).
    await db.execAsync(`UPDATE habits SET color = 'accent' WHERE color = '#72d7f0'`);
  }

  await db.execAsync(`PRAGMA user_version = ${LATEST_VERSION}`);
}
