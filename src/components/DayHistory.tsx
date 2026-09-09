import { Text, View } from 'react-native';
import type { Habit, History } from '@/data/types';
import { daysBetween, fromDayKey, isScheduled, shortDate } from '@/lib/date';
import { themedStyles, useTheme } from '@/theme';
import { font, radius, resolveHabitColor } from '@/theme/tokens';

type Props = {
  /** 'YYYY-MM-DD' — the tapped heatmap cell */
  day: string;
  /** the habits the surrounding heatmap aggregates */
  habits: Habit[];
  history: History;
};

/** What one entry says about one day, in words. */
function entryLabel(habit: Habit, history: History, day: string): string {
  const entry = history[habit.id]?.[day];
  const counted = habit.kind === 'count' && habit.target;
  if (entry?.status === 'done') {
    return counted ? `Done · ${entry.value}/${habit.target}` : 'Done';
  }
  if (entry?.status === 'skipped') {
    return entry.skipReason ? `Skipped · ${entry.skipReason.toLowerCase()}` : 'Skipped';
  }
  if (counted && entry && entry.value > 0) {
    return `${entry.value} of ${habit.target} ${habit.unit ?? ''}`.trim();
  }
  return 'Not logged';
}

/**
 * The read-out for one tapped heatmap day, shown in a bottom sheet: every habit that was due,
 * and what its entry says. Past entries are facts, so this is read-only —
 * editing history would quietly rewrite streaks the user already banked.
 */
export function DayHistory({ day, habits, history }: Props) {
  const { colors, text } = useTheme();
  const styles = useStyles();

  const due = habits.filter(
    (h) => isScheduled(h.schedule, day) && daysBetween(h.createdAt, day) >= 0,
  );

  return (
    <View style={styles.panel}>
      <Text style={text.label}>{shortDate(fromDayKey(day))}</Text>
      {due.length === 0 ? (
        <Text style={styles.emptyText}>Nothing was due this day.</Text>
      ) : (
        due.map((habit, index) => {
          const label = entryLabel(habit, history, day);
          const logged = label !== 'Not logged';
          return (
            <View key={habit.id} style={[styles.row, index === 0 && styles.rowFirst]}>
              {habit.icon ? (
                <Text allowFontScaling={false} style={styles.icon}>
                  {habit.icon}
                </Text>
              ) : (
                <View
                  style={[styles.dot, { backgroundColor: resolveHabitColor(habit.color, colors.accent) }]}
                />
              )}
              <Text numberOfLines={1} style={styles.name}>
                {habit.name}
              </Text>
              <Text style={[styles.status, !logged && styles.statusDim]}>{label}</Text>
            </View>
          );
        })
      )}
    </View>
  );
}

const useStyles = themedStyles(({ colors }) => ({
  panel: {
    paddingTop: 2,
  },
  emptyText: {
    marginTop: 8,
    fontFamily: font.regular,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSub,
  },
  row: {
    marginTop: 8,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 9,
  },
  rowFirst: {
    marginTop: 10,
  },
  icon: {
    fontSize: 14,
    lineHeight: 17,
  },
  dot: {
    width: 9,
    height: 9,
    borderRadius: radius.full,
  },
  name: {
    flex: 1,
    fontFamily: font.medium,
    fontSize: 13.5,
    lineHeight: 18,
    color: colors.text,
  },
  status: {
    fontFamily: font.medium,
    fontSize: 12.5,
    lineHeight: 17,
    color: colors.textSecondary,
  },
  statusDim: {
    color: colors.textDim,
  },
}));
