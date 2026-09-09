import type { DatedEntry, EntryStatus, Habit, MilestoneKind, Schedule } from '@/data/types';

/**
 * Export / import of everything the user owns. The format is deliberately
 * boring — one JSON document, versioned, human-readable — because its whole
 * job is to outlive this codebase: a backup that can only be read by the app
 * that wrote it is barely a backup.
 *
 * Parsing is defensive field-by-field rather than trusting the file: imports
 * come from the user's file system, and a truncated or hand-edited file
 * should fail with a message, not corrupt the database.
 */

export const BACKUP_VERSION = 1;

export type Backup = {
  app: 'habito';
  version: typeof BACKUP_VERSION;
  exportedAt: string;
  habits: Habit[];
  entries: DatedEntry[];
};

export function buildBackup(habits: Habit[], entries: DatedEntry[]): string {
  const backup: Backup = {
    app: 'habito',
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    habits,
    entries,
  };
  return JSON.stringify(backup, null, 2);
}

const KINDS: MilestoneKind[] = ['count', 'streak', 'custom'];
const SCHEDULES: Schedule[] = ['daily', 'weekdays', 'some'];
const STATUSES: EntryStatus[] = ['open', 'done', 'skipped'];
const DAY = /^\d{4}-\d{2}-\d{2}$/;

const str = (v: unknown): v is string => typeof v === 'string' && v.length > 0;
const optStr = (v: unknown): string | undefined => (typeof v === 'string' ? v : undefined);

function toHabit(raw: unknown): Habit | null {
  const h = raw as Record<string, unknown>;
  if (!h || !str(h.id) || !str(h.name)) return null;
  if (!KINDS.includes(h.kind as MilestoneKind)) return null;
  if (!SCHEDULES.includes(h.schedule as Schedule)) return null;
  if (!str(h.createdAt) || !DAY.test(h.createdAt)) return null;
  return {
    id: h.id,
    name: h.name,
    kind: h.kind as MilestoneKind,
    color: str(h.color) ? h.color : 'accent',
    icon: optStr(h.icon),
    unit: optStr(h.unit),
    target: typeof h.target === 'number' ? h.target : undefined,
    goal: optStr(h.goal),
    schedule: h.schedule as Schedule,
    reminder: optStr(h.reminder),
    milestoneNoun: optStr(h.milestoneNoun),
    createdAt: h.createdAt,
    archivedAt: optStr(h.archivedAt),
    sortOrder: typeof h.sortOrder === 'number' ? h.sortOrder : 0,
  };
}

function toEntry(raw: unknown, habitIds: Set<string>): DatedEntry | null {
  const e = raw as Record<string, unknown>;
  if (!e || !str(e.habitId) || !habitIds.has(e.habitId)) return null;
  if (!str(e.day) || !DAY.test(e.day)) return null;
  if (!STATUSES.includes(e.status as EntryStatus)) return null;
  return {
    habitId: e.habitId,
    day: e.day,
    status: e.status as EntryStatus,
    value: typeof e.value === 'number' && Number.isFinite(e.value) ? Math.max(0, e.value) : 0,
    doneAt: optStr(e.doneAt),
    skipReason: optStr(e.skipReason),
    skipNote: optStr(e.skipNote),
  };
}

/** Throws with a user-showable message when the file is not a usable export. */
export function parseBackup(json: string, knownHabitIds: string[] = []): {
  habits: Habit[];
  entries: DatedEntry[];
} {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    throw new Error('That file is not valid JSON.');
  }
  const doc = raw as Record<string, unknown>;
  if (doc?.app !== 'habito' || typeof doc.version !== 'number') {
    throw new Error('That file is not a Habito export.');
  }
  if (doc.version > BACKUP_VERSION) {
    throw new Error('This export came from a newer version of Habito.');
  }
  if (!Array.isArray(doc.habits) || !Array.isArray(doc.entries)) {
    throw new Error('The export is missing its data.');
  }

  const habits = doc.habits.map(toHabit).filter((h): h is Habit => h !== null);
  // Entries may reference habits from this file or ones already on the device.
  const ids = new Set([...habits.map((h) => h.id), ...knownHabitIds]);
  const entries = doc.entries
    .map((e) => toEntry(e, ids))
    .filter((e): e is DatedEntry => e !== null);

  if (habits.length === 0 && entries.length === 0) {
    throw new Error('The export holds no usable habits or check-ins.');
  }
  return { habits, entries };
}
