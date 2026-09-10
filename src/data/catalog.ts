import type { BadgeId, NotificationSettingId, ReminderSoundId } from './types';

/**
 * The genuinely static half of what used to live in `seed.ts`: the things the
 * app ships with rather than the things a user accumulates. Every fabricated
 * figure that used to sit alongside these — XP totals, completion rates,
 * heatmaps — is now derived in `src/lib/stats.ts` from real entries.
 */

export const SKIP_REASONS = ['No time', 'Not feeling it', 'Travelling', 'Forgot'] as const;

// Screen 2e's colour row now derives from the chosen accent — see habit/new.tsx.

export const BADGE_DEFS: { id: BadgeId; glyph: string; name: string }[] = [
  { id: 'first-check-in', glyph: '1', name: 'First check-in' },
  { id: 'week-one', glyph: '7', name: 'Week one' },
  { id: 'thirty-days', glyph: '30', name: 'Thirty days' },
  { id: 'comeback', glyph: '↺', name: 'Comeback' },
  { id: 'hundred-days', glyph: '100', name: 'Hundred days' },
  { id: 'perfect-day', glyph: '★', name: 'Perfect day' },
];

/**
 * Two settings, both of which do something.
 *
 * The design also drew "Adaptive timing" and "Partner nudges". Neither has an
 * implementation — there is no model of when you check in, and no second user
 * to nudge you — so they are cut rather than shipped as switches that move and
 * change nothing.
 */
export const NOTIFICATION_DEFS: {
  id: NotificationSettingId;
  name: string;
  sub: string;
  defaultOn: boolean;
}[] = [
  {
    id: 'reminders',
    name: 'Habit reminders',
    sub: 'One per habit, at the time you set',
    defaultOn: true,
  },
  { id: 'recap', name: 'Weekly recap', sub: 'Sunday, 19:00', defaultOn: true },
];

/**
 * The tones a reminder can play. `file` is the base name the config plugin in
 * app.json bakes into the native project; expo-notifications wants exactly that
 * name at schedule time. `null` means the platform's own alert sound.
 */
export const REMINDER_SOUNDS: {
  id: ReminderSoundId;
  name: string;
  sub: string;
  file: string | null;
}[] = [
  { id: 'default', name: 'Default', sub: 'Your phone’s standard alert', file: null },
  { id: 'chime', name: 'Chime', sub: 'Two soft bells', file: 'chime.wav' },
  { id: 'bloom', name: 'Bloom', sub: 'A rising three-note arpeggio', file: 'bloom.wav' },
  { id: 'drop', name: 'Drop', sub: 'A gentle falling pair', file: 'drop.wav' },
  { id: 'pulse', name: 'Pulse', sub: 'Three quick taps', file: 'pulse.wav' },
];

export const DEFAULT_REMINDER_SOUND: ReminderSoundId = 'default';

/** The option for a stored id, falling back to the default for unknown values. */
export function reminderSoundDef(id: string | undefined) {
  return REMINDER_SOUNDS.find((s) => s.id === id) ?? REMINDER_SOUNDS[0];
}

/** Sunday evening, matching the copy on the recap row. */
export const RECAP_NOTIFICATION = { weekday: 1, hour: 19, minute: 0 };
