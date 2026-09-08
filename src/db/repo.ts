import type { SQLiteDatabase } from 'expo-sqlite';
import type { DatedEntry, Entry, Habit, History, Schedule, MilestoneKind } from '@/data/types';

/**
 * Every SQL statement in the app lives here. Screens and the store speak in
 * `Habit` / `Entry`; the row shapes and the snake_case column names stop at
 * this boundary.
 */

type HabitRow = {
  id: string;
  name: string;
  kind: MilestoneKind;
  color: string;
  unit: string | null;
  target: number | null;
  goal: string | null;
  schedule: Schedule;
  reminder: string | null;
  milestone_noun: string | null;
  created_at: string;
  archived_at: string | null;
  sort_order: number;
};

type EntryRow = {
  habit_id: string;
  day: string;
  status: Entry['status'];
  value: number;
  done_at: string | null;
  skip_reason: string | null;
  skip_note: string | null;
};

/** SQLite has no NULL/undefined distinction; the app uses undefined throughout. */
function opt<T>(value: T | null): T | undefined {
  return value === null ? undefined : value;
}

function toHabit(row: HabitRow): Habit {
  return {
    id: row.id,
    name: row.name,
    kind: row.kind,
    color: row.color,
    unit: opt(row.unit),
    target: opt(row.target),
    goal: opt(row.goal),
    schedule: row.schedule,
    reminder: opt(row.reminder),
    milestoneNoun: opt(row.milestone_noun),
    createdAt: row.created_at,
    archivedAt: opt(row.archived_at),
    sortOrder: row.sort_order,
  };
}

// ---------------------------------------------------------------------------
// Habits
// ---------------------------------------------------------------------------

/** Live habits, in display order. Archived ones stay out of the UI. */
export async function loadHabits(db: SQLiteDatabase): Promise<Habit[]> {
  const rows = await db.getAllAsync<HabitRow>(
    'SELECT * FROM habits WHERE archived_at IS NULL ORDER BY sort_order, created_at',
  );
  return rows.map(toHabit);
}

/**
 * Every habit including archived ones. Statistics read through this so that a
 * heatmap of last spring still shows the habit the user has since retired.
 */
export async function loadAllHabits(db: SQLiteDatabase): Promise<Habit[]> {
  const rows = await db.getAllAsync<HabitRow>('SELECT * FROM habits ORDER BY sort_order, created_at');
  return rows.map(toHabit);
}

export async function insertHabit(db: SQLiteDatabase, habit: Habit): Promise<void> {
  await db.runAsync(
    `INSERT INTO habits
       (id, name, kind, color, unit, target, goal, schedule, reminder,
        milestone_noun, created_at, archived_at, sort_order)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    habit.id,
    habit.name,
    habit.kind,
    habit.color,
    habit.unit ?? null,
    habit.target ?? null,
    habit.goal ?? null,
    habit.schedule,
    habit.reminder ?? null,
    habit.milestoneNoun ?? null,
    habit.createdAt,
    habit.archivedAt ?? null,
    habit.sortOrder,
  );
}

/**
 * `kind` is deliberately absent — screen 2e tells the user the milestone type
 * is fixed once saved so their history stays comparable, and the schema keeps
 * that promise.
 */
export type HabitEdit = Pick<Habit, 'name' | 'color' | 'schedule'> &
  Partial<Pick<Habit, 'unit' | 'target' | 'goal' | 'reminder'>>;

export async function updateHabit(db: SQLiteDatabase, id: string, edit: HabitEdit): Promise<void> {
  await db.runAsync(
    `UPDATE habits
        SET name = ?, color = ?, schedule = ?, unit = ?, target = ?, goal = ?, reminder = ?
      WHERE id = ?`,
    edit.name,
    edit.color,
    edit.schedule,
    edit.unit ?? null,
    edit.target ?? null,
    edit.goal ?? null,
    edit.reminder ?? null,
    id,
  );
}

/** Soft delete. The rows in `entries` survive so past figures stay truthful. */
export async function archiveHabit(db: SQLiteDatabase, id: string, when: string): Promise<void> {
  await db.runAsync('UPDATE habits SET archived_at = ? WHERE id = ?', when, id);
}

export async function reorderHabits(db: SQLiteDatabase, ids: string[]): Promise<void> {
  await db.withTransactionAsync(async () => {
    for (let i = 0; i < ids.length; i++) {
      await db.runAsync('UPDATE habits SET sort_order = ? WHERE id = ?', i, ids[i]);
    }
  });
}

// ---------------------------------------------------------------------------
// Entries
// ---------------------------------------------------------------------------

/** History from `since` onwards, nested habitId -> day -> entry. */
export async function loadHistory(db: SQLiteDatabase, since: string): Promise<History> {
  const rows = await db.getAllAsync<EntryRow>('SELECT * FROM entries WHERE day >= ?', since);
  const history: History = {};
  for (const row of rows) {
    (history[row.habit_id] ??= {})[row.day] = {
      status: row.status,
      value: row.value,
      doneAt: opt(row.done_at),
      skipReason: opt(row.skip_reason),
      skipNote: opt(row.skip_note),
    };
  }
  return history;
}

/**
 * Upsert one day's entry. Keyed on (habit_id, day), so checking in, changing
 * your mind and checking in again touches a single row rather than growing a
 * log the statistics would then have to de-duplicate.
 */
export async function saveEntry(
  db: SQLiteDatabase,
  habitId: string,
  day: string,
  entry: Entry,
): Promise<void> {
  await db.runAsync(
    `INSERT INTO entries (habit_id, day, status, value, done_at, skip_reason, skip_note)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT (habit_id, day) DO UPDATE SET
       status      = excluded.status,
       value       = excluded.value,
       done_at     = excluded.done_at,
       skip_reason = excluded.skip_reason,
       skip_note   = excluded.skip_note`,
    habitId,
    day,
    entry.status,
    entry.value,
    entry.doneAt ?? null,
    entry.skipReason ?? null,
    entry.skipNote ?? null,
  );
}

/** Every entry ever written, for export. */
export async function loadAllEntries(db: SQLiteDatabase): Promise<DatedEntry[]> {
  const rows = await db.getAllAsync<EntryRow>('SELECT * FROM entries ORDER BY day, habit_id');
  return rows.map((row) => ({
    habitId: row.habit_id,
    day: row.day,
    status: row.status,
    value: row.value,
    doneAt: opt(row.done_at),
    skipReason: opt(row.skip_reason),
    skipNote: opt(row.skip_note),
  }));
}

// ---------------------------------------------------------------------------
// Import
// ---------------------------------------------------------------------------

/**
 * Merge an export into the database: habits and entries are upserted by their
 * natural keys, so importing on top of existing data restores rather than
 * duplicates. One transaction — a half-imported backup is worse than none.
 */
export async function importBackup(
  db: SQLiteDatabase,
  habits: Habit[],
  entries: DatedEntry[],
): Promise<void> {
  await db.withTransactionAsync(async () => {
    for (const habit of habits) {
      await db.runAsync(
        `INSERT INTO habits
           (id, name, kind, color, unit, target, goal, schedule, reminder,
            milestone_noun, created_at, archived_at, sort_order)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT (id) DO UPDATE SET
           name           = excluded.name,
           color          = excluded.color,
           unit           = excluded.unit,
           target         = excluded.target,
           goal           = excluded.goal,
           schedule       = excluded.schedule,
           reminder       = excluded.reminder,
           milestone_noun = excluded.milestone_noun,
           archived_at    = excluded.archived_at,
           sort_order     = excluded.sort_order`,
        habit.id,
        habit.name,
        habit.kind,
        habit.color,
        habit.unit ?? null,
        habit.target ?? null,
        habit.goal ?? null,
        habit.schedule,
        habit.reminder ?? null,
        habit.milestoneNoun ?? null,
        habit.createdAt,
        habit.archivedAt ?? null,
        habit.sortOrder,
      );
    }
    for (const entry of entries) {
      await db.runAsync(
        `INSERT INTO entries (habit_id, day, status, value, done_at, skip_reason, skip_note)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT (habit_id, day) DO UPDATE SET
           status      = excluded.status,
           value       = excluded.value,
           done_at     = excluded.done_at,
           skip_reason = excluded.skip_reason,
           skip_note   = excluded.skip_note`,
        entry.habitId,
        entry.day,
        entry.status,
        entry.value,
        entry.doneAt ?? null,
        entry.skipReason ?? null,
        entry.skipNote ?? null,
      );
    }
  });
}

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

export async function loadSettings(db: SQLiteDatabase): Promise<Record<string, string>> {
  const rows = await db.getAllAsync<{ key: string; value: string }>('SELECT * FROM settings');
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}

export async function saveSetting(db: SQLiteDatabase, key: string, value: string): Promise<void> {
  await db.runAsync(
    `INSERT INTO settings (key, value) VALUES (?, ?)
     ON CONFLICT (key) DO UPDATE SET value = excluded.value`,
    key,
    value,
  );
}

/** Wipes user data but leaves the schema. Backs the "Erase all data" action. */
export async function eraseAll(db: SQLiteDatabase): Promise<void> {
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM entries');
    await db.runAsync('DELETE FROM habits');
    await db.runAsync('DELETE FROM settings');
  });
}
