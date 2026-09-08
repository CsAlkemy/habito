import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import type { SQLiteDatabase } from 'expo-sqlite';
import { NOTIFICATION_DEFS, RECAP_NOTIFICATION } from '@/data/catalog';
import { loadHabits, loadSettings } from '@/db/repo';

/**
 * All notification scheduling lives here. Local notifications work in Expo Go
 * on both platforms, so none of this needs a development build.
 *
 * The scheduling model is deliberately stateless: rather than tracking which
 * habit owns which notification id, `syncReminders` cancels everything and
 * rebuilds the schedule from the database. A handful of notifications is cheap
 * to re-register, and it removes the whole class of bug where an edited or
 * archived habit keeps firing because its id was never cleaned up.
 */

const supported = Platform.OS !== 'web';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function ensurePermissions(): Promise<boolean> {
  if (!supported) return false;
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  const asked = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowBadge: false, allowSound: true },
  });
  return asked.granted;
}

async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('reminders', {
    name: 'Habit reminders',
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 200],
    lightColor: '#72d7f0',
  });
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
 * Route notification taps to the surface they describe: a habit reminder opens
 * that habit's check-in sheet, the weekly recap opens the recap. `enabled`
 * should stay false until the store has hydrated — routing to a habit the
 * store has not loaded yet would bounce straight back off the guard redirect.
 */
export function useNotificationDeepLinks(enabled: boolean): void {
  const router = useRouter();
  useEffect(() => {
    if (!supported || !enabled) return;

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
  if (!supported) return;

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
  await ensureAndroidChannel();

  if (wantsReminders) {
    for (const habit of await loadHabits(db)) {
      const at = parseTime(habit.reminder);
      if (!at) continue;
      await Notifications.scheduleNotificationAsync({
        content: {
          title: habit.name,
          body: habit.goal ?? 'Time to check in.',
          data: { habitId: habit.id },
          ...(Platform.OS === 'android' ? { channelId: 'reminders' } : {}),
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: at.hour,
          minute: at.minute,
        },
      });
    }
  }

  if (wantsRecap) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Your week in review',
        body: 'See how the last seven days went.',
        data: { route: '/recap' },
        ...(Platform.OS === 'android' ? { channelId: 'reminders' } : {}),
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
