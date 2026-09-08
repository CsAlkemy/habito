import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { Card } from '@/components/Card';
import { Sparkline } from '@/components/Charts';
import { Heatmap } from '@/components/Heatmap';
import { Screen } from '@/components/Screen';
import { useAllStats, useHistoryHabits, useStore } from '@/data/store';
import { heatmapCells } from '@/lib/stats';
import { themedStyles, useTheme } from '@/theme';
import { font, GUTTER, radius, resolveHabitColor, tracking } from '@/theme/tokens';

/**
 * The design drew three chips. Each now picks the span the grid covers: the
 * heatmap is always 12 columns wide, so a longer range means each column is a
 * longer bucket rather than a wider grid.
 */
const RANGES = [
  { id: 'weeks', label: '12 weeks', weeks: 12 },
  { id: 'half', label: '6 months', weeks: 26 },
  { id: 'year', label: 'Year', weeks: 52 },
] as const;

/** Screen 2i — progress across every habit. */
export default function Progress() {
  const { text, heatShades, colors } = useTheme();
  const styles = useStyles();
  const router = useRouter();
  const { habits, history, todayKey } = useStore();
  const allHabits = useHistoryHabits();
  const stats = useAllStats();
  const [range, setRange] = useState<(typeof RANGES)[number]>(RANGES[0]);

  // Archived habits still count toward the grid — retiring a habit should not
  // rewrite the spring it was part of.
  const cells = useMemo(
    () => heatmapCells(allHabits, history, heatShades, todayKey, range.weeks),
    [allHabits, history, heatShades, todayKey, range.weeks],
  );

  return (
    <Screen bottomExtra={0} safeBottom={false}>
      <View style={styles.header}>
        <Text style={text.screenTitle}>Progress</Text>
      </View>

      <View style={styles.segments}>
        {RANGES.map((option) => {
          const active = option.id === range.id;
          return (
            <Pressable
              key={option.id}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              onPress={() => setRange(option)}
              style={[styles.segment, active && styles.segmentActive]}
            >
              <Text style={[styles.segmentLabel, active && styles.segmentLabelActive]}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.body}>
        <Card r={radius.panel}>
          <Text style={text.sectionLabel}>Everything · last {range.label.toLowerCase()}</Text>
          <View style={styles.heatmap}>
            <Heatmap cells={cells} rowHeight={17} today={todayKey} />
          </View>
        </Card>

        {habits.length === 0 && (
          <Text style={styles.empty}>
            Your habits will show up here once you have one to track.
          </Text>
        )}

        <View style={styles.rows}>
          {habits.map((habit) => {
            const habitColor = resolveHabitColor(habit.color, colors.accent);
            return (
            <Pressable
              key={habit.id}
              accessibilityRole="button"
              accessibilityLabel={`${habit.name}, ${stats[habit.id]?.completion ?? 0} percent`}
              onPress={() => router.push(`/habit/${habit.id}`)}
              style={({ pressed }) => [styles.row, pressed && styles.pressed]}
            >
              <View style={styles.rowHead}>
                <View style={styles.rowName}>
                  <View style={[styles.dot, { backgroundColor: habitColor }]} />
                  <Text numberOfLines={1} style={styles.name}>
                    {habit.name}
                  </Text>
                </View>
                <Text style={styles.pct}>{stats[habit.id]?.completion ?? 0}%</Text>
              </View>
              <Sparkline values={stats[habit.id]?.spark ?? []} color={habitColor} />
            </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </Screen>
  );
}

const useStyles = themedStyles(({ colors }) => ({
  header: {
    paddingHorizontal: GUTTER,
  },
  segments: {
    marginTop: 16,
    marginHorizontal: GUTTER,
    backgroundColor: colors.elevated,
    borderRadius: radius.full,
    padding: 5,
    flexDirection: 'row' as const,
    gap: 8,
  },
  segment: {
    flex: 1,
    alignItems: 'center' as const,
    paddingVertical: 11,
    borderRadius: radius.full,
  },
  segmentActive: {
    backgroundColor: colors.accent,
  },
  segmentLabel: {
    fontFamily: font.medium,
    fontSize: 12.5,
    lineHeight: 14,
    color: colors.textMuted,
  },
  segmentLabelActive: {
    fontFamily: font.semibold,
    letterSpacing: tracking(0.06, 12.5),
    color: colors.accentInk,
  },
  body: {
    paddingTop: 14,
    paddingHorizontal: GUTTER,
    paddingBottom: 16,
  },
  heatmap: {
    marginTop: 14,
  },
  empty: {
    marginTop: 22,
    paddingHorizontal: 4,
    fontFamily: font.regular,
    fontSize: 13.5,
    lineHeight: 19,
    color: colors.textSub,
  },
  rows: {
    marginTop: 10,
    gap: 6,
  },
  row: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    paddingVertical: 11,
    paddingHorizontal: 16,
  },
  pressed: {
    opacity: 0.75,
  },
  rowHead: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'baseline' as const,
    gap: 10,
  },
  rowName: {
    flex: 1,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 9,
  },
  dot: {
    width: 9,
    height: 9,
    borderRadius: 3,
  },
  name: {
    flex: 1,
    fontFamily: font.semibold,
    fontSize: 14,
    lineHeight: 17,
    color: colors.text,
  },
  pct: {
    fontFamily: font.semibold,
    fontSize: 12,
    lineHeight: 14,
    letterSpacing: tracking(0.06, 12),
    color: colors.textSub,
  },
}));
