import { Pressable, Text, View } from 'react-native';
import { Check } from './Icons';
import type { Entry, Habit } from '@/data/types';
import { habitSubtitle, streakLabel } from '@/lib/format';
import { themedStyles, useTheme } from '@/theme';
import { alpha, mix } from '@/theme/color';
import { font, radius, resolveHabitColor, tracking } from '@/theme/tokens';

type Props = {
  habit: Habit;
  entry: Entry;
  /** derived, not stored — see `src/lib/stats.ts` */
  streak: number;
  onPress?: () => void;
  onLongPress?: () => void;
};

export function HabitRow({ habit, entry, streak, onPress, onLongPress }: Props) {
  const { colors, text, dark } = useTheme();
  const styles = useStyles();
  const done = entry.status === 'done';
  const skipped = entry.status === 'skipped';

  // The row doubles as a progress bar, filled with the habit's own colour:
  // full when done, proportional for a counted habit mid-way.
  const habitColor = resolveHabitColor(habit.color, colors.accent);
  const target = habit.kind === 'count' ? habit.target : undefined;
  const ratio = done ? 1 : target ? Math.min(1, entry.value / target) : 0;

  // A light edge on every card; once there is progress it picks up the
  // habit's colour so the fill reads as deliberate rather than a smudge.
  const borderColor =
    ratio > 0
      ? alpha(habitColor, dark ? 0.45 : 0.55)
      : dark
        ? 'rgba(255, 255, 255, 0.08)'
        : colors.border;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${habit.name}, ${habitSubtitle(habit, entry)}`}
      onPress={onPress}
      onLongPress={onLongPress}
      style={({ pressed }) => [styles.row, { borderColor }, pressed && styles.pressed]}
    >
      {ratio > 0 && (
        // Proportioned with flex rather than a % width: Yoga resolves the
        // percentage of an absolute child against the content box, which left
        // a 100% fill short of the row's right edge by its padding.
        <View pointerEvents="none" style={styles.fillTrack}>
          <View
            style={[{ flex: ratio, backgroundColor: alpha(habitColor, dark ? 0.2 : 0.22) }]}
          />
          <View style={{ flex: 1 - ratio }} />
        </View>
      )}
      <View
        style={[
          styles.tile,
          done
            ? { backgroundColor: habitColor }
            : { borderWidth: 1.5, borderColor: skipped ? colors.dashed : colors.ring },
        ]}
      >
        {done && <Check color={mix(22, '#000000', habitColor)} width={14} />}
        {!done && skipped && <View style={styles.skipDash} />}
        {!done && !skipped && habit.icon && (
          <Text allowFontScaling={false} style={styles.tileIcon}>
            {habit.icon}
          </Text>
        )}
      </View>

      <View style={styles.body}>
        <Text
          numberOfLines={1}
          style={[text.cardTitle, (done || skipped) && { color: colors.textSub }]}
        >
          {habit.name}
        </Text>
        <Text numberOfLines={1} style={[text.cardSub, styles.sub]}>
          {habitSubtitle(habit, entry)}
        </Text>
      </View>

      <Text style={styles.streak}>{streakLabel(streak)}</Text>
    </Pressable>
  );
}

const useStyles = themedStyles(({ colors }) => ({
  row: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    paddingVertical: 14,
    paddingHorizontal: 15,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 13,
    overflow: 'hidden' as const,
    borderWidth: 1,
  },
  fillTrack: {
    position: 'absolute' as const,
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    flexDirection: 'row' as const,
  },
  pressed: {
    opacity: 0.75,
  },
  tile: {
    width: 36,
    height: 36,
    borderRadius: radius.tile,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  tileIcon: {
    fontSize: 18,
    lineHeight: 22,
  },
  skipDash: {
    width: 12,
    height: 1.5,
    borderRadius: 1,
    backgroundColor: colors.textDim,
  },
  body: {
    flex: 1,
    minWidth: 0,
  },
  sub: {
    marginTop: 3,
  },
  streak: {
    fontFamily: font.semibold,
    fontSize: 12,
    lineHeight: 14,
    letterSpacing: tracking(0.06, 12),
    color: colors.textDim,
  },
}));
