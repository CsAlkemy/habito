import { isRunningInExpoGo } from 'expo';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import type { SQLiteDatabase } from 'expo-sqlite';
import { NOTIFICATION_DEFS, RECAP_NOTIFICATION, reminderSoundDef } from '@/data/catalog';
import { loadHabits, loadSettings } from '@/db/repo';

/**
 * All notification scheduling lives here.
 *
 * The scheduling model is deliberately stateless: rather than tracking which
 * habit owns which notification id, `syncReminders` cancels everything and
 * rebuilds the schedule from the database. A handful of notifications is cheap
 * to re-register, and it removes the whole class of bug where an edited or
 * archived habit keeps firing because its id was never cleaned up.
 *
 * Expo Go on Android is excluded: since SDK 53, merely importing
 * expo-notifications there throws (its push-token auto-registration side
 * effect refuses to run), even though this app only schedules local
 * notifications. The require below keeps the module out of that environment
 * entirely — the app runs with reminders silently off, and a development
 * build or installed APK gets the real behavior. Expo Go on iOS still
 * supports local notifications.
 */

const supported = Platform.OS !== 'web' && !(Platform.OS === 'android' && isRunningInExpoGo());

const Notifications = supported
  ? (require('expo-notifications') as typeof import('expo-notifications'))
  : null;

Notifications?.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function ensurePermissions(): Promise<boolean> {
  if (!Notifications) return false;
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  const asked = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowBadge: false, allowSound: true },
  });
  return asked.granted;
}

/** The channel the config plugin registers as default; plays the system tone. */
const DEFAULT_CHANNEL = 'reminders';

/**
 * The custom tones are baked into the native project by the expo-notifications
 * config plugin, which Expo Go never runs — asking it for 'chime.wav' logs
 * "Custom sound not found" and falls back anyway. Resolve the choice to the
 * system sound there so the schedule stays quiet; a development build or an
 * installed binary has the files and plays the chosen tone.
 */
export const CUSTOM_SOUNDS_AVAILABLE = Platform.OS !== 'web' && !isRunningInExpoGo();

function effectiveSound(id: string | undefined) {
  const chosen = reminderSoundDef(id);
  return CUSTOM_SOUNDS_AVAILABLE ? chosen : reminderSoundDef('default');
}

/**
 * Android fixes a channel's sound at creation, so each tone gets a channel of
 * its own rather than trying to update one. Old channels linger in the system
 * settings, but a handful of them is harmless.
 */
function reminderChannelId(sound: ReturnType<typeof reminderSoundDef>): string {
  return sound.file ? `reminders-${sound.id}` : DEFAULT_CHANNEL;
}

async function ensureAndroidChannels(
  sound: ReturnType<typeof reminderSoundDef>,
): Promise<void> {
  if (!Notifications || Platform.OS !== 'android') return;
  const base = {
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 200],
    lightColor: '#72d7f0',
  };
  // The default channel always exists: the weekly recap uses it.
  await Notifications.setNotificationChannelAsync(DEFAULT_CHANNEL, {
    ...base,
    name: 'Habit reminders',
  });
  if (sound.file) {
    await Notifications.setNotificationChannelAsync(reminderChannelId(sound), {
      ...base,
      name: `Habit reminders · ${sound.name}`,
      sound: sound.file,
    });
  }
}

/** 'HH:MM' -> {hour, minute}, or null when the string is not a valid time. */
function parseTime(value: string | undefined): { hour: number; minute: number } | null {
  if (!value) return null;
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return null;
  return { hour, minute };
}

/**
 * A habit's reminder field holds one 'HH:MM', or several comma-separated for
 * count habits ("08:00,12:30,18:00"). Invalid segments and duplicates are
 * dropped rather than failing the whole habit.
 */
function parseReminderTimes(value: string | undefined): { hour: number; minute: number }[] {
  const seen = new Set<string>();
  const times: { hour: number; minute: number }[] = [];
  for (const part of value?.split(',') ?? []) {
    const at = parseTime(part);
    if (!at) continue;
    const key = `${at.hour}:${at.minute}`;
    if (seen.has(key)) continue;
    seen.add(key);
    times.push(at);
  }
  return times;
}

/**
 * Route notification taps to the surface they describe: a habit reminder opens
 * that habit's check-in sheet, the weekly recap opens the recap. `enabled`
 * should stay false until the store has hydrated — routing to a habit the
 * store has not loaded yet would bounce straight back off the guard redirect.
 */
export function useNotificationDeepLinks(enabled: boolean): void {
  const router = useRouter();
  useEffect(() => {
    if (!Notifications || !enabled) return;

    const open = (data: unknown) => {
      const { habitId, route } = (data ?? {}) as { habitId?: string; route?: string };
      if (habitId) router.push(`/check-in/${habitId}`);
      else if (route) router.push(route as never);
    };

    // The tap that cold-started the app fired before this listener existed.
    Notifications.getLastNotificationResponseAsync()
      .then((response) => response && open(response.notification.request.content.data))
      .catch(() => {});

    const sub = Notifications.addNotificationResponseReceivedListener((response) =>
      open(response.notification.request.content.data),
    );
    return () => sub.remove();
  }, [enabled, router]);
}

/**
 * Rebuild the entire notification schedule from the database. Safe to call
 * after any mutation — adding, editing or archiving a habit, or flipping a
 * toggle on the You screen.
 */
export async function syncReminders(db: SQLiteDatabase): Promise<void> {
  if (!Notifications) return;

  await Notifications.cancelAllScheduledNotificationsAsync();

  const settings = await loadSettings(db);
  const on = (id: string) => {
    const def = NOTIFICATION_DEFS.find((d) => d.id === id);
    return (settings[`notify.${id}`] ?? (def?.defaultOn ? '1' : '0')) === '1';
  };

  const wantsReminders = on('reminders');
  const wantsRecap = on('recap');
  if (!wantsReminders && !wantsRecap) return;

  if (!(await ensurePermissions())) return;
  const sound = effectiveSound(settings.reminderSound);
  await ensureAndroidChannels(sound);

  if (wantsReminders) {
    const channelId = reminderChannelId(sound);
    for (const habit of await loadHabits(db)) {
      for (const at of parseReminderTimes(habit.reminder)) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: habit.name,
            body: habit.goal ?? 'Time to check in.',
            data: { habitId: habit.id },
            // iOS reads the tone here; Android 8+ reads it from the channel.
            sound: sound.file ?? 'default',
            ...(Platform.OS === 'android' ? { channelId } : {}),
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DAILY,
            hour: at.hour,
            minute: at.minute,
            ...(Platform.OS === 'android' ? { channelId } : {}),
          },
        });
      }
    }
  }

  if (wantsRecap) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Your week in review',
        body: 'See how the last seven days went.',
        data: { route: '/recap' },
        ...(Platform.OS === 'android' ? { channelId: DEFAULT_CHANNEL } : {}),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
        weekday: RECAP_NOTIFICATION.weekday,
        hour: RECAP_NOTIFICATION.hour,
        minute: RECAP_NOTIFICATION.minute,
      },
    });
  }
}
