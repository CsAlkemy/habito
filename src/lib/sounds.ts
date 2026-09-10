import type { ReminderSoundId } from '@/data/types';

/**
 * Bundled copies of the reminder tones, for the preview in the sound picker.
 * The notification itself plays the copy the expo-notifications config plugin
 * writes into the native project (the `sounds` list in app.json); these are
 * the same files, loaded through Metro so the picker can play them in-app.
 */
export const SOUND_ASSETS: Record<Exclude<ReminderSoundId, 'default'>, number> = {
  chime: require('../../assets/sounds/chime.wav'),
  bloom: require('../../assets/sounds/bloom.wav'),
  drop: require('../../assets/sounds/drop.wav'),
  pulse: require('../../assets/sounds/pulse.wav'),
};
