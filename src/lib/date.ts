import type { Schedule } from '@/data/types';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "Friday 14 Aug" — the design sets this in tracked caps. */
export function shortDate(d = new Date()): string {
  return `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

/** "Friday, 14 August" — lock screen. */
export function longDate(d = new Date()): string {
  const month = d.toLocaleString('en-GB', { month: 'long' });
  return `${DAYS[d.getDay()]}, ${d.getDate()} ${month}`;
}

/** "7:04" */
export function clockTime(d = new Date()): string {
  return `${d.getHours() % 12 || 12}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function greeting(d = new Date()): string {
  const h = d.getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

// ---------------------------------------------------------------------------
// Day keys
//
// Every entry is filed under a local calendar day, never a timestamp. A streak
// is something a person counts on a wall calendar, so it has to survive travel,
// DST, and the user checking in at 00:05. Formatting by hand rather than via
// toISOString(), which would silently shift the day for anyone east of UTC.
// ---------------------------------------------------------------------------

/** 'YYYY-MM-DD' in the device's local calendar. */
export function dayKey(d = new Date()): string {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

/** Parse a day key back to local midnight. */
export function fromDayKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Shift a day key by whole days. Handles month, year and DST boundaries. */
export function addDays(key: string, delta: number): string {
  const d = fromDayKey(key);
  d.setDate(d.getDate() + delta);
  return dayKey(d);
}

/** Whole days from `a` to `b`, positive when `b` is later. */
export function daysBetween(a: string, b: string): number {
  const MS = 24 * 60 * 60 * 1000;
  // Round rather than floor: a DST change makes one of these 23 or 25 hours.
  return Math.round((fromDayKey(b).getTime() - fromDayKey(a).getTime()) / MS);
}

/** Day keys from `from` to `to` inclusive, oldest first. */
export function dayRange(from: string, to: string): string[] {
  const out: string[] = [];
  for (let key = from; daysBetween(key, to) >= 0; key = addDays(key, 1)) out.push(key);
  return out;
}

/** The last `count` day keys ending at `end` inclusive, oldest first. */
export function lastDays(count: number, end = dayKey()): string[] {
  return dayRange(addDays(end, -(count - 1)), end);
}

/** Monday of the week containing `key`. The design's recap weeks start Monday. */
export function weekStart(key: string): string {
  const d = fromDayKey(key);
  // getDay() is 0 for Sunday, so Sunday belongs to the week that began 6 days ago.
  return addDays(key, -((d.getDay() + 6) % 7));
}

// ---------------------------------------------------------------------------
// Cadence
// ---------------------------------------------------------------------------

/**
 * Was this habit due on that day? Completion divides by scheduled days, not
 * calendar days — otherwise a weekdays-only habit is marked down every Saturday
 * for doing exactly what it was asked to do.
 */
export function isScheduled(schedule: Schedule, key: string): boolean {
  if (schedule === 'daily') return true;
  const weekday = fromDayKey(key).getDay();
  if (schedule === 'weekdays') return weekday >= 1 && weekday <= 5;
  // 'some' is three days a week, and the design lets the user pick which by
  // simply showing up. Treat every day as an opportunity but never a debt.
  return true;
}

/** "Every day" — prose for the UI, derived rather than stored. */
export function scheduleLabel(schedule: Schedule): string {
  if (schedule === 'weekdays') return 'Weekdays only';
  if (schedule === 'some') return 'A few times a week';
  return 'Every day';
}

/** The milestone ladder the design's copy refers to: day 7, then 21, then 30. */
export const MILESTONE_LADDER = [7, 21, 30, 100];

export function milestoneFor(streak: number): number | null {
  return MILESTONE_LADDER.includes(streak) ? streak : null;
}

/** Days remaining until the next rung, or null once the ladder is exhausted. */
export function nextMilestone(streak: number): number | null {
  return MILESTONE_LADDER.find((m) => m > streak) ?? null;
}
