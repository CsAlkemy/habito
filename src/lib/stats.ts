import type { Bar, Tone } from '@/components/Charts';
import type { Habit, HabitStats, History, Entry } from '@/data/types';
import {
  addDays,
  dayKey,
  dayRange,
  daysBetween,
  fromDayKey,
  isScheduled,
  lastDays,
  weekStart,
} from './date';

/**
 * Everything on the Progress, Recap, habit-detail and You screens is derived
 * here from the raw entry history. Nothing in this file touches the database or
 * React — it is all pure, so the awkward cases (a skip mid-streak, a
 * weekdays-only habit over a weekend, a habit created last Tuesday) can be
 * tested directly.
 */

const HEATMAP_WEEKS = 12;
const SPARK_WEEKS = 8;
const COMPLETION_WINDOW = 30;

const noEntries: Record<string, Entry> = {};

/**
 * How much of a day's work an entry represents, 0–1. A completion is full
 * credit; a count habit left open earns the fraction of its target it reached,
 * so saved partial progress shows in the figures instead of reading as a miss.
 * Streaks, XP and badges stay all-or-nothing — only the percentages soften.
 */
export function dayCredit(habit: Habit, entry: Entry | undefined): number {
  if (!entry || entry.status === 'skipped') return 0;
  if (entry.status === 'done') return 1;
  if (habit.kind === 'count' && habit.target) return Math.min(1, entry.value / habit.target);
  return 0;
}

/** Days a habit could have been done: scheduled, and not before it existed. */
function scheduledDays(habit: Habit, from: string, to: string): string[] {
  const start = daysBetween(habit.createdAt, from) > 0 ? from : habit.createdAt;
  if (daysBetween(start, to) < 0) return [];
  return dayRange(start, to).filter((key) => isScheduled(habit.schedule, key));
}

/**
 * The current streak.
 *
 * `skip/[id].tsx` promises the user "your streak pauses here, not ends", so a
 * skipped day is stepped over without incrementing or breaking. Today is never
 * a break either — the day is still in progress and a half-finished morning
 * should not read as a failure.
 */
export function currentStreak(habit: Habit, entries: Record<string, Entry>, today = dayKey()): number {
  let count = 0;
  let day = today;
  // The habit cannot have a streak older than itself; this also bounds the loop.
  while (daysBetween(habit.createdAt, day) >= 0) {
    if (isScheduled(habit.schedule, day)) {
      const status = entries[day]?.status;
      if (status === 'done') count += 1;
      else if (status !== 'skipped' && day !== today) break;
    }
    day = addDays(day, -1);
  }
  return count;
}

/** The longest run the habit has ever held, using the same pause rule. */
export function bestStreak(habit: Habit, entries: Record<string, Entry>, today = dayKey()): number {
  let best = 0;
  let run = 0;
  for (const day of scheduledDays(habit, habit.createdAt, today)) {
    const status = entries[day]?.status;
    if (status === 'done') {
      run += 1;
      if (run > best) best = run;
    } else if (status === 'skipped' || day === today) {
      // pause — carry the run forward untouched
    } else {
      run = 0;
    }
  }
  return best;
}

/**
 * Completion over a window, as a percentage of days the habit was actually due.
 *
 * Skipped days leave both sides of the fraction: a pause should not read as a
 * miss. Today is excluded while nothing is logged yet, so the figure does not
 * sag every morning and recover every evening — but once progress is saved,
 * today joins the window at its earned credit.
 */
export function completionPct(
  habit: Habit,
  entries: Record<string, Entry>,
  windowDays = COMPLETION_WINDOW,
  today = dayKey(),
): number {
  const days = scheduledDays(habit, addDays(today, -(windowDays - 1)), today);
  let done = 0;
  let due = 0;
  for (const day of days) {
    if (entries[day]?.status === 'skipped') continue;
    const credit = dayCredit(habit, entries[day]);
    if (credit === 0 && day === today) continue;
    due += 1;
    done += credit;
  }
  return due === 0 ? 0 : Math.round((done / due) * 100);
}

/** Eight weekly completion percentages, oldest first. */
export function sparkline(habit: Habit, entries: Record<string, Entry>, today = dayKey()): number[] {
  const thisWeek = weekStart(today);
  return Array.from({ length: SPARK_WEEKS }, (_, i) => {
    const start = addDays(thisWeek, -7 * (SPARK_WEEKS - 1 - i));
    const end = addDays(start, 6);
    const days = scheduledDays(habit, start, daysBetween(end, today) < 0 ? today : end);
    if (days.length === 0) return 0;
    const done = days.reduce((sum, d) => sum + dayCredit(habit, entries[d]), 0);
    return Math.round((done / days.length) * 100);
  });
}

export function habitStats(habit: Habit, history: History, today = dayKey()): HabitStats {
  const entries = history[habit.id] ?? noEntries;
  return {
    streak: currentStreak(habit, entries, today),
    bestStreak: bestStreak(habit, entries, today),
    completion: completionPct(habit, entries, COMPLETION_WINDOW, today),
    spark: sparkline(habit, entries, today),
    totalDone: Object.values(entries).filter((e) => e.status === 'done').length,
  };
}

// ---------------------------------------------------------------------------
// Heatmaps
// ---------------------------------------------------------------------------

/** The heatmap ramp, least → most. Comes from the active theme. */
export type HeatShades = readonly [string, string, string, string];

function shadeFor(shades: HeatShades, ratio: number): string {
  if (ratio <= 0) return shades[0];
  if (ratio < 0.5) return shades[1];
  if (ratio < 1) return shades[2];
  return shades[3];
}

/**
 * 84 colours, row-major: 12 weeks across, 7 days down, Monday on top. Cells
 * after today and before the habit existed stay at the empty shade rather than
 * being dropped, so the grid keeps its shape. The ramp is passed in because
 * this file stays pure — the theme owns the colours.
 */
export function heatmapCells(
  habits: Habit[],
  history: History,
  shades: HeatShades,
  today = dayKey(),
  weeks = HEATMAP_WEEKS,
): string[] {
  const firstWeek = addDays(weekStart(today), -7 * (weeks - 1));
  const cells: string[] = [];
  for (let row = 0; row < 7; row++) {
    for (let col = 0; col < weeks; col++) {
      const day = addDays(firstWeek, col * 7 + row);
      if (daysBetween(day, today) < 0) {
        cells.push(shades[0]);
        continue;
      }
      let due = 0;
      let done = 0;
      for (const habit of habits) {
        if (!isScheduled(habit.schedule, day)) continue;
        if (daysBetween(habit.createdAt, day) < 0) continue;
        const entry = history[habit.id]?.[day];
        if (entry?.status === 'skipped') continue;
        due += 1;
        done += dayCredit(habit, entry);
      }
      cells.push(due === 0 ? shades[0] : shadeFor(shades, done / due));
    }
  }
  return cells;
}

// ---------------------------------------------------------------------------
// Charts
// ---------------------------------------------------------------------------

function tone(pct: number): Tone {
  if (pct >= 80) return 'high';
  if (pct >= 50) return 'mid';
  return 'low';
}

/** Eight weekly bars for the habit-detail chart. */
export function weeklyBars(habit: Habit, history: History, today = dayKey()): Bar[] {
  const values = sparkline(habit, history[habit.id] ?? noEntries, today);
  const peak = Math.max(...values, 1);
  return values.map((pct, i) => ({
    label: `W${i + 1}`,
    // Bars are drawn as a percentage of the plot, so scale to the tallest week
    // rather than to 100 — otherwise a quiet two months looks like a flat line.
    height: Math.round((pct / peak) * 100),
    tone: tone(pct),
  }));
}

const WEEKDAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

/** Seven daily bars for the weekly recap. */
export function recapBars(habits: Habit[], history: History, weekStartKey: string): Bar[] {
  return WEEKDAY_LABELS.map((label, i) => {
    const day = addDays(weekStartKey, i);
    let due = 0;
    let done = 0;
    for (const habit of habits) {
      if (!isScheduled(habit.schedule, day)) continue;
      if (daysBetween(habit.createdAt, day) < 0) continue;
      const entry = history[habit.id]?.[day];
      if (entry?.status === 'skipped') continue;
      due += 1;
      done += dayCredit(habit, entry);
    }
    const pct = due === 0 ? 0 : Math.round((done / due) * 100);
    return { label, height: pct, tone: tone(pct) };
  });
}

// ---------------------------------------------------------------------------
// Weekly recap
// ---------------------------------------------------------------------------

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const LONG_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export type Recap = {
  week: string;
  headline: string;
  completion: number;
  vsLastWeek: number;
  milestones: number;
  /** false when the previous week had nothing due, so a delta would be noise */
  hasComparison: boolean;
  strongest: string | null;
  hardestDay: string | null;
  days: Bar[];
  /** false when the week has nothing in it yet */
  hasData: boolean;
};

function weekTotals(habits: Habit[], history: History, start: string) {
  let due = 0;
  let done = 0;
  // The headline counts whole completions ("showed up 4 times"); the
  // percentage also credits partial progress on count habits.
  let credit = 0;
  for (const day of dayRange(start, addDays(start, 6))) {
    for (const habit of habits) {
      if (!isScheduled(habit.schedule, day)) continue;
      if (daysBetween(habit.createdAt, day) < 0) continue;
      const entry = history[habit.id]?.[day];
      if (entry?.status === 'skipped') continue;
      due += 1;
      if (entry?.status === 'done') done += 1;
      credit += dayCredit(habit, entry);
    }
  }
  return { due, done, pct: due === 0 ? 0 : Math.round((credit / due) * 100) };
}

export function weeklyRecap(habits: Habit[], history: History, today = dayKey()): Recap {
  const start = weekStart(today);
  const end = addDays(start, 6);
  const now = weekTotals(habits, history, start);
  const prev = weekTotals(habits, history, addDays(start, -7));

  const from = fromDayKey(start);
  const to = fromDayKey(end);
  const week =
    from.getMonth() === to.getMonth()
      ? `${from.getDate()}—${to.getDate()} ${MONTHS[to.getMonth()]}`
      : `${from.getDate()} ${MONTHS[from.getMonth()]}—${to.getDate()} ${MONTHS[to.getMonth()]}`;

  // Strongest: the habit with the most completions this week.
  let strongest: string | null = null;
  let strongestDone = 0;
  for (const habit of habits) {
    const done = dayRange(start, end).filter(
      (d) => history[habit.id]?.[d]?.status === 'done',
    ).length;
    if (done > strongestDone) {
      strongestDone = done;
      const due = scheduledDays(habit, start, end).length;
      strongest = `${habit.name}, ${done} for ${due}.`;
    }
  }

  // Hardest: the day with the most misses.
  let hardestDay: string | null = null;
  let worstMisses = 0;
  dayRange(start, daysBetween(end, today) < 0 ? today : end).forEach((day, i) => {
    const misses = habits.filter(
      (h) =>
        isScheduled(h.schedule, day) &&
        daysBetween(h.createdAt, day) >= 0 &&
        (history[h.id]?.[day]?.status ?? 'open') === 'open' &&
        day !== today,
    ).length;
    if (misses > worstMisses) {
      worstMisses = misses;
      hardestDay = `${LONG_DAYS[i]}. You missed ${misses}.`;
    }
  });

  return {
    week,
    headline: `You showed up ${now.done} time${now.done === 1 ? '' : 's'} out of ${now.due}`,
    completion: now.pct,
    // A first week has nothing to be up or down against; reporting "+100" there
    // is the kind of flattering-but-meaningless number this rewrite exists to
    // get rid of.
    vsLastWeek: prev.due === 0 ? 0 : now.pct - prev.pct,
    hasComparison: prev.due > 0,
    milestones: 0,
    strongest,
    hardestDay,
    days: recapBars(habits, history, start),
    hasData: now.due > 0,
  };
}

// ---------------------------------------------------------------------------
// Badges and XP
// ---------------------------------------------------------------------------

/** Ten XP a completion, fifty a milestone rung. Simple, and honestly countable. */
export function totalXp(habits: Habit[], history: History, today = dayKey()): number {
  let xp = 0;
  for (const habit of habits) {
    const stats = habitStats(habit, history, today);
    xp += stats.totalDone * 10;
    xp += [7, 21, 30, 100].filter((rung) => stats.bestStreak >= rung).length * 50;
  }
  return xp;
}

const LEVELS = [
  { name: 'Starting', at: 0 },
  { name: 'Steady', at: 1000 },
  { name: 'Rooted', at: 3500 },
  { name: 'Anchored', at: 8000 },
] as const;

export function levelFor(xp: number) {
  let index = 0;
  for (let i = 0; i < LEVELS.length; i++) if (xp >= LEVELS[i].at) index = i;
  const current = LEVELS[index];
  const next = LEVELS[index + 1];
  if (!next) return { name: current.name, next: null, toNext: 0, progress: 1 };
  const span = next.at - current.at;
  return {
    name: current.name,
    next: next.name,
    toNext: next.at - xp,
    progress: Math.min(1, (xp - current.at) / span),
  };
}

/** Did the user complete every habit that was due on `day`? */
export function isPerfectDay(habits: Habit[], history: History, day: string): boolean {
  let due = 0;
  for (const habit of habits) {
    if (!isScheduled(habit.schedule, day)) continue;
    if (daysBetween(habit.createdAt, day) < 0) continue;
    const status = history[habit.id]?.[day]?.status;
    if (status === 'skipped') continue;
    due += 1;
    if (status !== 'done') return false;
  }
  return due > 0;
}

export function earnedBadgeIds(habits: Habit[], history: History, today = dayKey()): Set<string> {
  const earned = new Set<string>();
  const stats = habits.map((h) => habitStats(h, history, today));
  const totalDone = stats.reduce((sum, s) => sum + s.totalDone, 0);
  const best = Math.max(0, ...stats.map((s) => s.bestStreak));

  if (totalDone >= 1) earned.add('first-check-in');
  if (best >= 7) earned.add('week-one');
  if (best >= 30) earned.add('thirty-days');
  if (best >= 100) earned.add('hundred-days');
  if (lastDays(90, today).some((day) => isPerfectDay(habits, history, day))) {
    earned.add('perfect-day');
  }
  // Comeback: a run of at least three after having previously broken one.
  if (stats.some((s) => s.streak >= 3 && s.bestStreak > s.streak)) earned.add('comeback');

  return earned;
}
