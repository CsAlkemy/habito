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
 * What the widget shows is the user's choice, made in the editor at
 * `app/widget.tsx` and stored as a `WidgetConfig`. The snapshot carries both
 * the config and the rows it resolves to, so the native side only has to draw.
 *
 * To finish it: `npx expo install expo-widgets @expo/ui`, describe the widget
 * in app.json, write the SwiftUI component against `WidgetSnapshot`, and
 * replace the `saveSetting` call in `writeWidgetSnapshot` with
 * `Widget.updateSnapshot(snapshot)`. iOS only; needs a development build.
 */

export type WidgetStyle = 'list' | 'ring' | 'streak';
export type WidgetTint = 'accent' | 'neutral';

export type WidgetConfig = {
  style: WidgetStyle;
  /** habits to show, in order; empty means "choose for me" */
  habitIds: string[];
  /** the small header on the list and ring widgets */
  label: string;
  /** show today's done/total in the header */
  showCount: boolean;
  tint: WidgetTint;
};

export const WIDGET_STYLES: { id: WidgetStyle; name: string; sub: string }[] = [
  { id: 'list', name: 'Today list', sub: 'Up to four habits with their ticks' },
  { id: 'ring', name: 'Progress ring', sub: 'How much of today is done' },
  {
    id: 'streak',
    name: 'Streak card',
    sub: 'One habit’s run, front and centre',
  },
];

export const MAX_WIDGET_HABITS = 4;
export const WIDGET_LABEL_MAX = 14;

export const DEFAULT_WIDGET_CONFIG: WidgetConfig = {
  style: 'list',
  habitIds: [],
  label: 'Today',
  showCount: true,
  tint: 'accent',
};

export const WIDGET_CONFIG_KEY = 'widget.config';
export const WIDGET_SNAPSHOT_KEY = 'widget.snapshot';
export const APP_GROUP = 'group.com.habito.app';

/** How many habits a style has room for. */
export function widgetCapacity(style: WidgetStyle): number {
  return style === 'streak' ? 1 : MAX_WIDGET_HABITS;
}

/**
 * Read a stored config back, field by field. Anything missing or malformed
 * falls back to the default for that field alone, so an older or hand-edited
 * value never takes the whole widget down with it.
 */
export function parseWidgetConfig(raw: string | null | undefined): WidgetConfig {
  if (!raw) return DEFAULT_WIDGET_CONFIG;
  let parsed: Partial<Record<keyof WidgetConfig, unknown>>;
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== 'object') return DEFAULT_WIDGET_CONFIG;
    parsed = value as Partial<Record<keyof WidgetConfig, unknown>>;
  } catch {
    return DEFAULT_WIDGET_CONFIG;
  }
  const style = WIDGET_STYLES.some((s) => s.id === parsed.style)
    ? (parsed.style as WidgetStyle)
    : DEFAULT_WIDGET_CONFIG.style;
  const habitIds = Array.isArray(parsed.habitIds)
    ? parsed.habitIds
        .filter((id): id is string => typeof id === 'string')
        .slice(0, MAX_WIDGET_HABITS)
    : [];
  const label =
    typeof parsed.label === 'string' && parsed.label.trim()
      ? parsed.label.trim().slice(0, WIDGET_LABEL_MAX)
      : DEFAULT_WIDGET_CONFIG.label;
  const showCount =
    typeof parsed.showCount === 'boolean' ? parsed.showCount : DEFAULT_WIDGET_CONFIG.showCount;
  const tint: WidgetTint = parsed.tint === 'neutral' ? 'neutral' : 'accent';
  return { style, habitIds, label, showCount, tint };
}

/** The habit nearest its next milestone rung, or null when none has one left. */
export function closestToMilestone(habits: Habit[], history: History, day: string): Habit | null {
  let best: Habit | null = null;
  let closest = Number.POSITIVE_INFINITY;
  for (const habit of habits) {
    const { streak } = habitStats(habit, history, day);
    const target = nextMilestone(streak);
    if (target === null) continue;
    if (target - streak < closest) {
      closest = target - streak;
      best = habit;
    }
  }
  return best;
}

/**
 * Resolve the config's selection against the live habits. Ids that no longer
 * exist (archived, deleted, imported from another device) drop out, and an
 * empty selection is filled automatically: the first habits on Today for the
 * list and ring, the habit closest to its next milestone for the streak card.
 */
export function widgetHabits(
  config: WidgetConfig,
  habits: Habit[],
  history: History,
  day: string,
): Habit[] {
  const cap = widgetCapacity(config.style);
  const chosen = config.habitIds
    .map((id) => habits.find((h) => h.id === id))
    .filter((h): h is Habit => h !== undefined)
    .slice(0, cap);
  if (chosen.length > 0) return chosen;
  if (config.style === 'streak') {
    const closest = closestToMilestone(habits, history, day);
    return closest ? [closest] : habits.slice(0, 1);
  }
  return habits.slice(0, cap);
}

export type WidgetRow = {
  id: string;
  name: string;
  /** as stored: a hex, or the 'accent' sentinel from `theme/tokens.ts` */
  color: string;
  icon?: string;
  done: boolean;
  streak: number;
  /** next milestone rung, null once the ladder is exhausted */
  target: number | null;
};

export type WidgetSnapshot = {
  day: string;
  done: number;
  total: number;
  /** the habit closest to its next milestone rung */
  headline: { name: string; streak: number; target: number } | null;
  config: WidgetConfig;
  /** the habits the widget shows, resolved from `config` */
  rows: WidgetRow[];
  updatedAt: string;
};

export function buildWidgetSnapshot(
  habits: Habit[],
  history: History,
  day: string,
  config: WidgetConfig = DEFAULT_WIDGET_CONFIG,
): WidgetSnapshot {
  const due = habits.filter((h) => isScheduled(h.schedule, day));
  const done = due.filter((h) => history[h.id]?.[day]?.status === 'done').length;

  const closest = closestToMilestone(habits, history, day);
  let headline: WidgetSnapshot['headline'] = null;
  if (closest) {
    const { streak } = habitStats(closest, history, day);
    const target = nextMilestone(streak);
    if (target !== null) headline = { name: closest.name, streak, target };
  }

  const rows = widgetHabits(config, habits, history, day).map((habit): WidgetRow => {
    const { streak } = habitStats(habit, history, day);
    return {
      id: habit.id,
      name: habit.name,
      color: habit.color,
      icon: habit.icon,
      done: history[habit.id]?.[day]?.status === 'done',
      streak,
      target: nextMilestone(streak),
    };
  });

  return {
    day,
    done,
    total: due.length,
    headline,
    config,
    rows,
    updatedAt: new Date().toISOString(),
  };
}

export function writeWidgetSnapshot(
  db: SQLiteDatabase,
  habits: Habit[],
  history: History,
  day: string,
  config: WidgetConfig,
): void {
  const snapshot = buildWidgetSnapshot(habits, history, day, config);
  saveSetting(db, WIDGET_SNAPSHOT_KEY, JSON.stringify(snapshot)).catch((err) =>
    console.error('[habito] widget snapshot failed', err),
  );
}
