import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { Card } from '@/components/Card';
import { BarChart } from '@/components/Charts';
import { DayHistory } from '@/components/DayHistory';
import { Heatmap } from '@/components/Heatmap';
import { NavHeader } from '@/components/NavHeader';
import { Screen } from '@/components/Screen';
import { StatTile } from '@/components/StatTile';
import { useHabit, useStats, useStore } from '@/data/store';
import { habitDetailLine } from '@/lib/format';
import { heatmapCells, weeklyBars } from '@/lib/stats';
import { themedStyles, useTheme } from '@/theme';
import { font, GUTTER, radius, tracking } from '@/theme/tokens';

const WEEKS_SHOWN = 12;

/** "May — Aug", the span the heatmap covers. */
function heatmapRange(): string {
  const end = new Date();
  const start = new Date(end.getTime() - WEEKS_SHOWN * 7 * 24 * 60 * 60 * 1000);
  const month = (d: Date) => d.toLocaleString('en-GB', { month: 'short' });
  return `${month(start)} — ${month(end)}`;
}

/** Screen 2f — habit detail. */
export default function HabitDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { habit } = useHabit(id);
  const { history, todayKey } = useStore();
  const stats = useStats(habit);
  const { text, heatShades } = useTheme();
  const styles = useStyles();
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const cells = useMemo(
    () => (habit ? heatmapCells([habit], history, heatShades, todayKey, WEEKS_SHOWN) : []),
    [habit, history, heatShades, todayKey],
  );
  const bars = useMemo(
    () => (habit ? weeklyBars(habit, history, todayKey) : []),
    [habit, history, todayKey],
  );

  if (!habit) return <Redirect href="/(tabs)" />;

  return (
    <Screen bottomExtra={32}>
      <View style={styles.header}>
        <NavHeader
          left={{ label: 'Back', onPress: () => router.back() }}
          title="Habit"
          right={{ label: 'Edit', onPress: () => router.push(`/habit/new?edit=${habit.id}`) }}
        />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.body}>
        <View style={styles.title}>
          <Text style={text.screenTitle}>{habit.name}</Text>
          <Text style={styles.subtitle}>{habitDetailLine(habit)}</Text>
        </View>

        <View style={styles.stats}>
          <StatTile accent value={String(stats.streak)} label="Day streak" />
          <StatTile value={String(stats.bestStreak)} label="Best streak" />
          <StatTile value={String(stats.completion)} suffix="%" label="Last 30 days" />
        </View>

        <Card r={radius.panel} style={styles.panel}>
          <View style={styles.panelHead}>
            <Text style={text.sectionLabel}>Last 12 weeks</Text>
            <Text style={styles.panelMeta}>{heatmapRange()}</Text>
          </View>
          <View style={styles.heatmap}>
            <Heatmap
              cells={cells}
              legend
              today={todayKey}
              selectedDay={selectedDay ?? undefined}
              onSelectDay={(day) => setSelectedDay((prev) => (prev === day ? null : day))}
            />
          </View>
          {selectedDay && <DayHistory day={selectedDay} habits={[habit]} history={history} />}
        </Card>

        <Card r={radius.panel} style={styles.panel}>
          <Text style={text.sectionLabel}>
            {habit.unit ? `${habit.unit} per week` : 'Check-ins per week'}
          </Text>
          <View style={styles.chart}>
            <BarChart data={bars} height={76} guideAt={64} />
          </View>
        </Card>
      </ScrollView>
    </Screen>
  );
}

const useStyles = themedStyles(({ colors }) => ({
  header: {
    paddingHorizontal: GUTTER,
  },
  body: {
    paddingHorizontal: GUTTER,
    paddingBottom: 24,
  },
  title: {
    paddingTop: 18,
  },
  subtitle: {
    marginTop: 6,
    fontFamily: font.regular,
    fontSize: 13.5,
    lineHeight: 17,
    color: colors.textSub,
  },
  stats: {
    marginTop: 18,
    flexDirection: 'row' as const,
    gap: 8,
  },
  panel: {
    marginTop: 14,
  },
  panelHead: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'baseline' as const,
  },
  panelMeta: {
    fontFamily: font.medium,
    fontSize: 10.5,
    lineHeight: 13,
    letterSpacing: tracking(0.12, 10.5),
    color: colors.textSub,
    textTransform: 'uppercase' as const,
  },
  heatmap: {
    marginTop: 14,
  },
  chart: {
    marginTop: 18,
  },
}));
