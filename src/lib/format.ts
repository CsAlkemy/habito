import type { Entry, Habit } from '@/data/types';
import { clockTime, scheduleLabel } from './date';

/** '2026-08-23T07:12:00.000Z' -> '7:12'. Entries store an instant, the UI shows a clock. */
function doneClock(entry: Entry): string {
  return entry.doneAt ? clockTime(new Date(entry.doneAt)) : '—';
}

/** "08:00,12:30" (stored) -> "08:00, 12:30" (shown). */
export function reminderLabel(reminder: string): string {
  return reminder.split(',').filter(Boolean).join(', ');
}

/** "30 min" / "8 glasses" */
export function targetLabel(habit: Habit): string {
  if (habit.kind !== 'count' || habit.target === undefined) return '';
  const unit = habit.unit === 'minutes' ? 'min' : habit.unit;
  return `${habit.target} ${unit}`;
}

/**
 * The second line of a habit row. The design writes a different sentence
 * depending on how the habit is measured and whether it is already closed out.
 */
export function habitSubtitle(habit: Habit, entry: Entry): string {
  if (entry.status === 'skipped') {
    return entry.skipReason ? `Skipped · ${entry.skipReason.toLowerCase()}` : 'Skipped today';
  }

  if (habit.kind === 'custom') return habit.goal ?? '';

  if (habit.kind === 'count' && habit.target !== undefined) {
    if (entry.status === 'done') {
      return habit.unit === 'minutes'
        ? `${habit.target} min · done at ${doneClock(entry)}`
        : `${entry.value} of ${habit.target} ${habit.unit}`;
    }
    if (habit.unit === 'minutes') {
      return habit.reminder
        ? `${habit.target} min · reminder at ${reminderLabel(habit.reminder)}`
        : `${habit.target} min`;
    }
    return `${entry.value} of ${habit.target} ${habit.unit}`;
  }

  return scheduleLabel(habit.schedule);
}

/** "30 minutes · every day · 07:00" — the habit detail subhead. */
export function habitDetailLine(habit: Habit): string {
  const parts: string[] = [];
  if (habit.kind === 'count' && habit.target !== undefined) {
    parts.push(`${habit.target} ${habit.unit}`);
  }
  if (habit.kind === 'custom' && habit.goal) parts.push(habit.goal);
  parts.push(scheduleLabel(habit.schedule).toLowerCase());
  if (habit.reminder) parts.push(reminderLabel(habit.reminder));
  return parts.join(' · ');
}

export function streakLabel(streak: number): string {
  return `${streak}d`;
}
