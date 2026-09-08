/**
 * The design's "what counts as today's milestone" choice (screen 2e). It is
 * fixed at creation on purpose — the copy on that screen says so — which is why
 * it is modelled as a discriminating field rather than an editable setting.
 */
export type MilestoneKind = 'count' | 'streak' | 'custom';

/**
 * Canonical cadence. The design writes these as prose ("Every day"), but a
 * stored string cannot answer "was this habit due on Saturday?", which every
 * streak and completion figure depends on. Prose lives in `scheduleLabel()`.
 */
export type Schedule = 'daily' | 'weekdays' | 'some';

export type Habit = {
  id: string;
  name: string;
  kind: MilestoneKind;
  /** dot / chart colour on the progress screen */
  color: string;
  /** 'glasses', 'minutes' — count habits only */
  unit?: string;
  /** daily target — count habits only */
  target?: number;
  /** the user's own words — custom habits only */
  goal?: string;
  schedule: Schedule;
  /** 'HH:MM' local, undefined when the habit has no reminder */
  reminder?: string;
  /**
   * How the milestone screen names this habit in a sentence — "a full week of
   * morning runs". Falls back to `name` when unset.
   */
  milestoneNoun?: string;
  /** 'YYYY-MM-DD' — completion windows never start before this */
  createdAt: string;
  /** set when archived; the habit leaves the UI but its history survives */
  archivedAt?: string;
  sortOrder: number;
};

export type EntryStatus = 'open' | 'done' | 'skipped';

export type Entry = {
  status: EntryStatus;
  /** progress toward `target` for count habits */
  value: number;
  /** ISO timestamp — set when the habit was completed */
  doneAt?: string;
  skipReason?: string;
  skipNote?: string;
};

/** An entry with the day it belongs to. Keyed 'YYYY-MM-DD' in the local calendar. */
export type DatedEntry = Entry & { habitId: string; day: string };

/** habitId -> day -> entry. The shape every statistic is derived from. */
export type History = Record<string, Record<string, Entry>>;

export type BadgeId =
  | 'first-check-in'
  | 'week-one'
  | 'thirty-days'
  | 'comeback'
  | 'hundred-days'
  | 'perfect-day';

export type Badge = {
  id: BadgeId;
  glyph: string;
  name: string;
  earned: boolean;
};

export type NotificationSettingId = 'reminders' | 'recap';

export type NotificationSetting = {
  id: NotificationSettingId;
  name: string;
  sub: string;
  enabled: boolean;
};

/** Derived per-habit figures. Never stored — always computed from history. */
export type HabitStats = {
  streak: number;
  bestStreak: number;
  /** completion over the last 30 scheduled days, as a percentage */
  completion: number;
  /** eight weekly values, 0–100, for the progress-screen sparkline */
  spark: number[];
  /** total completions, all time */
  totalDone: number;
};
