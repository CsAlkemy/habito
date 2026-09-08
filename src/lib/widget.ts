import type { SQLiteDatabase } from 'expo-sqlite';
import { saveSetting } from '@/db/repo';
import type { Habit, History } from '@/data/types';
import { habitStats } from './stats';
import { isScheduled, nextMilestone } from './date';

/**
 * Home-screen widget support, prepared but not yet wired to a native target.
 *
 * The important decision is made here rather than later: a widget extension
 * runs in its own sandbox and cannot open the app's SQLite file. So the widget
 * will read a small snapshot from a shared App Group container, not the
 * database. Building the payload now — and calling it from exactly one place in
 * the store — means adding the widget is a change to `writeWidgetSnapshot`'s
 * sink and nothing else.
 *
 * To finish it later: `npx expo prebuild`, add an App Group entitlement
 * (`group.com.habito.app`) to both the app and the widget target, and replace
 * the `saveSetting` call below with a write to the shared container.
 */

export type WidgetSnapshot = {
  day: string;
  done: number;
  total: number;
  /** the habit closest to its next milestone rung */
  headline: { name: string; streak: number; target: number } | null;
  updatedAt: string;
};

export const WIDGET_SNAPSHOT_KEY = 'widget.snapshot';
export const APP_GROUP = 'group.com.habito.app';

export function buildWidgetSnapshot(
  habits: Habit[],
  history: History,
  day: string,
): WidgetSnapshot {
  const due = habits.filter((h) => isScheduled(h.schedule, day));
  const done = due.filter((h) => history[h.id]?.[day]?.status === 'done').length;

  let headline: WidgetSnapshot['headline'] = null;
  let closest = Number.POSITIVE_INFINITY;
  for (const habit of habits) {
    const { streak } = habitStats(habit, history, day);
    const target = nextMilestone(streak);
    if (target === null) continue;
    if (target - streak < closest) {
      closest = target - streak;
      headline = { name: habit.name, streak, target };
    }
  }

  return { day, done, total: due.length, headline, updatedAt: new Date().toISOString() };
}

export function writeWidgetSnapshot(
  db: SQLiteDatabase,
  habits: Habit[],
  history: History,
  day: string,
): void {
  const snapshot = buildWidgetSnapshot(habits, history, day);
  saveSetting(db, WIDGET_SNAPSHOT_KEY, JSON.stringify(snapshot)).catch((err) =>
    console.error('[habito] widget snapshot failed', err),
  );
}
