import { type SQLiteDatabase, useSQLiteContext } from 'expo-sqlite';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AppState } from 'react-native';
import { BADGE_DEFS, NOTIFICATION_DEFS } from './catalog';
import type {
  Badge,
  Entry,
  Habit,
  HabitStats,
  History,
  NotificationSetting,
  NotificationSettingId,
} from './types';
import { addDays, dayKey, milestoneFor } from '@/lib/date';
import { earnedBadgeIds, habitStats, levelFor, totalXp } from '@/lib/stats';
import { syncReminders } from '@/lib/notify';
import { writeWidgetSnapshot } from '@/lib/widget';
import { DEFAULT_ACCENT, type ThemeMode } from '@/theme/tokens';
import type { HabitEdit } from '@/db/repo';
import { buildBackup, parseBackup } from '@/lib/backup';
import {
  archiveHabit as dbArchive,
  eraseAll as dbErase,
  importBackup,
  insertHabit,
  loadAllEntries,
  loadAllHabits,
  loadHabits,
  loadHistory,
  loadSettings,
  reorderHabits,
  saveEntry,
  saveSetting,
  updateHabit as dbUpdate,
} from '@/db/repo';

/**
 * SQLite is the source of truth; this provider is a write-through cache in
 * front of it. Reading a year of entries into memory at boot costs a few
 * thousand rows at most, and buys every screen a synchronous read — which is
 * why the hooks below kept their original signatures through the migration off
 * `useState`-only storage.
 */

/** How much history the statistics need. Older rows stay on disk, unread. */
const HISTORY_WINDOW_DAYS = 400;

const KEY_ONBOARDED = 'onboarded';
const KEY_NAME = 'profileName';
const KEY_NOTIFICATION = (id: string) => `notify.${id}`;
const KEY_THEME_MODE = 'themeMode';
const KEY_ACCENT = 'accent';

const THEME_MODES: ThemeMode[] = ['system', 'dark', 'light'];

export const emptyEntry: Entry = { status: 'open', value: 0 };

type State = {
  /** live habits, in display order */
  habits: Habit[];
  /** today's entry per habit, keyed by habit id */
  today: Record<string, Entry>;
  /** habitId -> day -> entry, for everything derived */
  history: History;
  notifications: NotificationSetting[];
  onboarded: boolean;
  profileName: string;
  /** appearance: follow the OS, or force one scheme */
  themeMode: ThemeMode;
  /** the accent colour everything tinted derives from */
  accent: string;
  /** today's local day key; recomputed when the app returns to the foreground */
  todayKey: string;
  /** false until the first read from SQLite completes */
  hydrated: boolean;
};

export type NewHabit = Omit<Habit, 'createdAt' | 'archivedAt' | 'sortOrder'>;

type Actions = {
  setValue: (habitId: string, value: number) => void;
  /** Relative change, resolved against the latest state rather than the render's. */
  bumpValue: (habitId: string, delta: number) => void;
  /** Returns the milestone reached, if this completion hit one. */
  markDone: (habitId: string) => number | null;
  reopen: (habitId: string) => void;
  skip: (habitId: string, reason?: string, note?: string) => void;
  addHabit: (habit: NewHabit) => void;
  editHabit: (id: string, edit: HabitEdit) => void;
  archiveHabit: (id: string) => void;
  /** Swap a habit with its neighbour in display order. */
  moveHabit: (id: string, delta: -1 | 1) => void;
  /** The whole database as a JSON document — see `lib/backup.ts`. */
  exportData: () => Promise<string>;
  /** Merge a Habito export back in. Resolves to what was imported. */
  importData: (json: string) => Promise<{ habits: number; entries: number }>;
  toggleNotification: (id: NotificationSettingId) => void;
  setThemeMode: (mode: ThemeMode) => void;
  setAccent: (accent: string) => void;
  completeOnboarding: (name: string, first: NewHabit) => void;
  eraseAll: () => void;
};

const StoreContext = createContext<(State & Actions) | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const db = useSQLiteContext();

  const [habits, setHabits] = useState<Habit[]>([]);
  const [allHabits, setAllHabits] = useState<Habit[]>([]);
  const [history, setHistory] = useState<History>({});
  const [enabled, setEnabled] = useState<Record<string, boolean>>({});
  const [onboarded, setOnboarded] = useState(false);
  const [profileName, setProfileName] = useState('');
  const [themeMode, setThemeModeState] = useState<ThemeMode>('system');
  const [accent, setAccentState] = useState(DEFAULT_ACCENT);
  const [todayKey, setTodayKey] = useState(dayKey);
  const [hydrated, setHydrated] = useState(false);

  /**
   * Actions read through these rather than through the render's closure. Four
   * taps on the check-in stepper land in one React batch, and a closure would
   * make all four compute from the same stale count.
   */
  const habitsRef = useRef(habits);
  const historyRef = useRef(history);
  const dayRef = useRef(todayKey);
  habitsRef.current = habits;
  historyRef.current = history;
  dayRef.current = todayKey;

  // -- hydrate ---------------------------------------------------------------

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const since = addDays(dayKey(), -HISTORY_WINDOW_DAYS);
      const [live, all, loaded, settings] = await Promise.all([
        loadHabits(db),
        loadAllHabits(db),
        loadHistory(db, since),
        loadSettings(db),
      ]);
      if (cancelled) return;
      setHabits(live);
      setAllHabits(all);
      setHistory(loaded);
      setOnboarded(settings[KEY_ONBOARDED] === '1');
      setProfileName(settings[KEY_NAME] ?? '');
      const storedMode = settings[KEY_THEME_MODE] as ThemeMode | undefined;
      if (storedMode && THEME_MODES.includes(storedMode)) setThemeModeState(storedMode);
      if (settings[KEY_ACCENT]) setAccentState(settings[KEY_ACCENT]);
      setEnabled(
        Object.fromEntries(
          NOTIFICATION_DEFS.map((def) => [
            def.id,
            (settings[KEY_NOTIFICATION(def.id)] ?? (def.defaultOn ? '1' : '0')) === '1',
          ]),
        ),
      );
      setHydrated(true);
    })().catch((err) => {
      console.error('[habito] hydrate failed', err);
      // Fail open rather than wedging on a blank screen: an empty store still
      // lets the user through onboarding and writes will retry against the DB.
      setHydrated(true);
    });
    return () => {
      cancelled = true;
    };
  }, [db]);

  // -- day rollover ----------------------------------------------------------

  useEffect(() => {
    const check = () => {
      const now = dayKey();
      if (now !== dayRef.current) setTodayKey(now);
    };
    const sub = AppState.addEventListener('change', (s) => s === 'active' && check());
    // Also cover an app left open across midnight.
    const timer = setInterval(check, 60_000);
    return () => {
      sub.remove();
      clearInterval(timer);
    };
  }, []);

  // -- writes ----------------------------------------------------------------

  const persistEntry = useCallback(
    (habitId: string, entry: Entry) => {
      const day = dayRef.current;
      saveEntry(db, habitId, day, entry).catch((err) =>
        console.error('[habito] saveEntry failed', err),
      );
    },
    [db],
  );

  /** Apply a change to today's entry, updating memory and disk together. */
  const patch = useCallback(
    (habitId: string, next: (prev: Entry) => Entry) => {
      setHistory((prev) => {
        const day = dayRef.current;
        const current = prev[habitId]?.[day] ?? emptyEntry;
        const entry = next(current);
        persistEntry(habitId, entry);
        const updated: History = { ...prev, [habitId]: { ...prev[habitId], [day]: entry } };
        historyRef.current = updated;
        return updated;
      });
    },
    [persistEntry],
  );

  const setValue = useCallback(
    (habitId: string, value: number) => {
      const habit = habitsRef.current.find((h) => h.id === habitId);
      const cap = habit?.target ?? Number.MAX_SAFE_INTEGER;
      patch(habitId, (prev) => ({ ...prev, value: Math.min(cap, Math.max(0, value)) }));
    },
    [patch],
  );

  const bumpValue = useCallback(
    (habitId: string, delta: number) => {
      const habit = habitsRef.current.find((h) => h.id === habitId);
      const cap = habit?.target ?? Number.MAX_SAFE_INTEGER;
      patch(habitId, (prev) => ({
        ...prev,
        value: Math.min(cap, Math.max(0, prev.value + delta)),
      }));
    },
    [patch],
  );

  const markDone = useCallback<Actions['markDone']>(
    (habitId) => {
      const habit = habitsRef.current.find((h) => h.id === habitId);
      if (!habit) return null;
      const day = dayRef.current;
      const wasDone = historyRef.current[habitId]?.[day]?.status === 'done';

      patch(habitId, (prev) => ({
        ...prev,
        status: 'done',
        value: habit.target ?? Math.max(1, prev.value),
        doneAt: new Date().toISOString(),
        skipReason: undefined,
        skipNote: undefined,
      }));
      if (wasDone) return null;

      // The streak is derived, so read it back from the history we just wrote
      // rather than incrementing a counter that could drift from the entries.
      const streak = habitStats(habit, historyRef.current, day).streak;
      return milestoneFor(streak);
    },
    [patch],
  );

  const reopen = useCallback(
    (habitId: string) =>
      patch(habitId, (prev) => ({ ...prev, status: 'open', doneAt: undefined })),
    [patch],
  );

  /**
   * A skip pauses the streak rather than ending it — that promise is made
   * explicitly on screen 2d, and `currentStreak` honours it by stepping over
   * skipped days.
   */
  const skip = useCallback<Actions['skip']>(
    (habitId, reason, note) =>
      patch(habitId, (prev) => ({
        ...prev,
        status: 'skipped',
        skipReason: reason,
        skipNote: note,
      })),
    [patch],
  );

  const addHabit = useCallback<Actions['addHabit']>(
    (input) => {
      const habit: Habit = {
        ...input,
        createdAt: dayRef.current,
        sortOrder: habitsRef.current.length,
      };
      setHabits((prev) => [...prev, habit]);
      setAllHabits((prev) => [...prev, habit]);
      insertHabit(db, habit)
        .then(() => syncReminders(db))
        .catch((err) => console.error('[habito] insertHabit failed', err));
    },
    [db],
  );

  const editHabit = useCallback<Actions['editHabit']>(
    (id, edit) => {
      const apply = (h: Habit) => (h.id === id ? { ...h, ...edit } : h);
      setHabits((prev) => prev.map(apply));
      setAllHabits((prev) => prev.map(apply));
      dbUpdate(db, id, edit)
        .then(() => syncReminders(db))
        .catch((err) => console.error('[habito] updateHabit failed', err));
    },
    [db],
  );

  const archiveHabit = useCallback<Actions['archiveHabit']>(
    (id) => {
      const when = new Date().toISOString();
      setHabits((prev) => prev.filter((h) => h.id !== id));
      setAllHabits((prev) => prev.map((h) => (h.id === id ? { ...h, archivedAt: when } : h)));
      dbArchive(db, id, when)
        .then(() => syncReminders(db))
        .catch((err) => console.error('[habito] archiveHabit failed', err));
    },
    [db],
  );

  const toggleNotification = useCallback<Actions['toggleNotification']>(
    (id) => {
      setEnabled((prev) => {
        const next = { ...prev, [id]: !prev[id] };
        saveSetting(db, KEY_NOTIFICATION(id), next[id] ? '1' : '0')
          .then(() => syncReminders(db))
          .catch((err) => console.error('[habito] toggleNotification failed', err));
        return next;
      });
    },
    [db],
  );

  const moveHabit = useCallback<Actions['moveHabit']>(
    (id, delta) => {
      setHabits((prev) => {
        const index = prev.findIndex((h) => h.id === id);
        const target = index + delta;
        if (index < 0 || target < 0 || target >= prev.length) return prev;
        const next = [...prev];
        [next[index], next[target]] = [next[target], next[index]];
        const ordered = next.map((h, i) => ({ ...h, sortOrder: i }));
        reorderHabits(db, ordered.map((h) => h.id)).catch((err) =>
          console.error('[habito] reorderHabits failed', err),
        );
        return ordered;
      });
    },
    [db],
  );

  /** Re-read everything after a bulk change the patch path never sees. */
  const reload = useCallback(async () => {
    const since = addDays(dayKey(), -HISTORY_WINDOW_DAYS);
    const [live, all, loaded] = await Promise.all([
      loadHabits(db),
      loadAllHabits(db),
      loadHistory(db, since),
    ]);
    setHabits(live);
    setAllHabits(all);
    setHistory(loaded);
    historyRef.current = loaded;
  }, [db]);

  const exportData = useCallback<Actions['exportData']>(async () => {
    const [all, entries] = await Promise.all([loadAllHabits(db), loadAllEntries(db)]);
    return buildBackup(all, entries);
  }, [db]);

  const importData = useCallback<Actions['importData']>(
    async (json) => {
      const known = (await loadAllHabits(db)).map((h) => h.id);
      const { habits: importedHabits, entries } = parseBackup(json, known);
      await importBackup(db, importedHabits, entries);
      await reload();
      await syncReminders(db);
      return { habits: importedHabits.length, entries: entries.length };
    },
    [db, reload],
  );

  const setThemeMode = useCallback<Actions['setThemeMode']>(
    (mode) => {
      setThemeModeState(mode);
      saveSetting(db, KEY_THEME_MODE, mode).catch((err) =>
        console.error('[habito] setThemeMode failed', err),
      );
    },
    [db],
  );

  const setAccent = useCallback<Actions['setAccent']>(
    (next) => {
      setAccentState(next);
      saveSetting(db, KEY_ACCENT, next).catch((err) =>
        console.error('[habito] setAccent failed', err),
      );
    },
    [db],
  );

  const completeOnboarding = useCallback<Actions['completeOnboarding']>(
    (name, first) => {
      setProfileName(name);
      setOnboarded(true);
      addHabit(first);
      Promise.all([saveSetting(db, KEY_NAME, name), saveSetting(db, KEY_ONBOARDED, '1')]).catch(
        (err) => console.error('[habito] completeOnboarding failed', err),
      );
    },
    [db, addHabit],
  );

  const eraseAll = useCallback<Actions['eraseAll']>(() => {
    setHabits([]);
    setAllHabits([]);
    setHistory({});
    setOnboarded(false);
    setProfileName('');
    setThemeModeState('system');
    setAccentState(DEFAULT_ACCENT);
    dbErase(db)
      .then(() => syncReminders(db))
      .catch((err) => console.error('[habito] eraseAll failed', err));
  }, [db]);

  // -- derived ---------------------------------------------------------------

  const today = useMemo(() => {
    const out: Record<string, Entry> = {};
    for (const habit of habits) out[habit.id] = history[habit.id]?.[todayKey] ?? emptyEntry;
    return out;
  }, [habits, history, todayKey]);

  const notifications = useMemo<NotificationSetting[]>(
    () => NOTIFICATION_DEFS.map((def) => ({ ...def, enabled: enabled[def.id] ?? def.defaultOn })),
    [enabled],
  );

  // Keep the widget's snapshot current. One call site, so adding the App Group
  // writer later is a change to `writeWidgetSnapshot` and nothing else.
  useEffect(() => {
    if (!hydrated) return;
    writeWidgetSnapshot(db, habits, history, todayKey);
  }, [db, hydrated, habits, history, todayKey]);

  const value = useMemo(
    () => ({
      habits,
      today,
      history,
      notifications,
      onboarded,
      profileName,
      themeMode,
      accent,
      todayKey,
      hydrated,
      setValue,
      bumpValue,
      markDone,
      reopen,
      skip,
      addHabit,
      editHabit,
      archiveHabit,
      moveHabit,
      exportData,
      importData,
      toggleNotification,
      setThemeMode,
      setAccent,
      completeOnboarding,
      eraseAll,
    }),
    [
      habits,
      today,
      history,
      notifications,
      onboarded,
      profileName,
      themeMode,
      accent,
      todayKey,
      hydrated,
      setValue,
      bumpValue,
      markDone,
      reopen,
      skip,
      addHabit,
      editHabit,
      archiveHabit,
      moveHabit,
      exportData,
      importData,
      toggleNotification,
      setThemeMode,
      setAccent,
      completeOnboarding,
      eraseAll,
    ],
  );

  // `allHabits` is only needed by the stats hooks below; hang it off the same
  // context rather than a second provider.
  return (
    <StoreContext.Provider value={value}>
      <AllHabitsContext.Provider value={allHabits}>{children}</AllHabitsContext.Provider>
    </StoreContext.Provider>
  );
}

const AllHabitsContext = createContext<Habit[]>([]);

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside <StoreProvider>');
  return ctx;
}

export function useHabit(id: string | undefined) {
  const { habits, today } = useStore();
  const habit = habits.find((h) => h.id === id);
  return { habit, entry: (id ? today[id] : undefined) ?? emptyEntry };
}

/** Header ring on the Today screen: how much of today is closed out. */
export function useTodayProgress() {
  const { habits, today } = useStore();
  const total = habits.length;
  const done = habits.filter((h) => today[h.id]?.status === 'done').length;
  return { done, total, ratio: total === 0 ? 0 : done / total };
}

/** Derived figures for one habit. Recomputed only when its history changes. */
export function useStats(habit: Habit | undefined): HabitStats {
  const { history, todayKey } = useStore();
  return useMemo(
    () =>
      habit
        ? habitStats(habit, history, todayKey)
        : { streak: 0, bestStreak: 0, completion: 0, spark: [], totalDone: 0 },
    [habit, history, todayKey],
  );
}

/** Stats for every live habit, keyed by id. */
export function useAllStats(): Record<string, HabitStats> {
  const { habits, history, todayKey } = useStore();
  return useMemo(
    () => Object.fromEntries(habits.map((h) => [h.id, habitStats(h, history, todayKey)])),
    [habits, history, todayKey],
  );
}

/**
 * Statistics read across archived habits too, so a heatmap of last spring still
 * shows work the user has since retired.
 */
export function useHistoryHabits(): Habit[] {
  return useContext(AllHabitsContext);
}

export function useProfile() {
  const { profileName, history, todayKey } = useStore();
  const all = useHistoryHabits();
  return useMemo(() => {
    const xp = totalXp(all, history, todayKey);
    const level = levelFor(xp);
    const earned = earnedBadgeIds(all, history, todayKey);
    const badges: Badge[] = BADGE_DEFS.map((def) => ({ ...def, earned: earned.has(def.id) }));
    return { name: profileName, xp, level, badges };
  }, [profileName, all, history, todayKey]);
}

export type { SQLiteDatabase };
