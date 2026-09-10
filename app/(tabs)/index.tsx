import { useRouter } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { AccentTile } from '@/components/AccentTile';
import { DashedButton } from '@/components/Button';
import { HabitRow } from '@/components/HabitRow';
import { ProgressRing } from '@/components/ProgressRing';
import { Screen } from '@/components/Screen';
import { useAllStats, useStore, useTodayProgress } from '@/data/store';
import type { Habit, HabitStats } from '@/data/types';
import { greeting, nextMilestone, shortDate } from '@/lib/date';
import { useTabBarClearance } from '@/lib/tabBar';
import { themedStyles, useTheme } from '@/theme';
import { font, GUTTER, radius } from '@/theme/tokens';

/** The habit closest to its next milestone rung — the banner's subject. */
function upcomingMilestone(habits: Habit[], stats: Record<string, HabitStats>) {
  let best: { habit: Habit; target: number; daysAway: number } | null = null;
  for (const habit of habits) {
    const streak = stats[habit.id]?.streak ?? 0;
    const target = nextMilestone(streak);
    if (target === null) continue;
    const daysAway = target - streak;
    if (!best || daysAway < best.daysAway) best = { habit, target, daysAway };
  }
  return best;
}

/** Screen 2b — Today. */
export default function Today() {
  const { text } = useTheme();
  const styles = useStyles();
  const router = useRouter();
  const { habits, today, profileName } = useStore();
  const stats = useAllStats();
  const { done, total, ratio } = useTodayProgress();
  const upcoming = upcomingMilestone(habits, stats);
  const clearance = useTabBarClearance();

  return (
    <Screen bottomExtra={clearance} safeBottom={false}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={text.eyebrow}>{shortDate()}</Text>
          <Text style={[text.screenTitle, styles.greeting]}>
            {greeting()},{'\n'}
            {profileName}
          </Text>
        </View>
        <ProgressRing size={58} strokeWidth={6} ratio={ratio} label={`${done}/${total}`} />
      </View>

      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      >
        {habits.length === 0 && (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Nothing to track yet</Text>
            <Text style={styles.emptyBody}>
              Add one habit — something small enough that a bad day can&rsquo;t stop it.
            </Text>
          </View>
        )}

        {habits.map((habit) => (
          <HabitRow
            key={habit.id}
            habit={habit}
            entry={today[habit.id] ?? { status: 'open', value: 0 }}
            streak={stats[habit.id]?.streak ?? 0}
            onPress={() => router.push(`/check-in/${habit.id}`)}
            onLongPress={() => router.push(`/skip/${habit.id}`)}
          />
        ))}
        <DashedButton label="+ Add a habit" onPress={() => router.push('/habit/new')} />
      </ScrollView>

      {upcoming && (
        <Pressable
          accessibilityRole="button"
          // Without this the big numeral runs into the sentence and a screen
          // reader announces "76 days to your 7-day milestone".
          accessibilityLabel={
            `${upcoming.daysAway === 1 ? 'One day' : `${upcoming.daysAway} days`} ` +
            `to your ${upcoming.target}-day milestone for ${upcoming.habit.name}`
          }
          onPress={() => router.push(`/habit/${upcoming.habit.id}`)}
          style={({ pressed }) => [styles.bannerWrap, pressed && styles.pressed]}
        >
          <AccentTile r={radius.button}>
            <View style={styles.banner}>
              <Text style={styles.bannerNumber}>{upcoming.target}</Text>
              <View style={styles.bannerText}>
                <Text style={styles.bannerTitle}>
                  {upcoming.daysAway === 1 ? 'One day' : `${upcoming.daysAway} days`} to your{' '}
                  {upcoming.target}-day milestone
                </Text>
                <Text style={styles.bannerSub}>{upcoming.habit.name} · keep going</Text>
              </View>
            </View>
          </AccentTile>
        </Pressable>
      )}
    </Screen>
  );
}

const useStyles = themedStyles(({ colors }) => ({
  header: {
    paddingHorizontal: GUTTER,
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'flex-start' as const,
  },
  headerText: {
    flex: 1,
  },
  greeting: {
    marginTop: 10,
  },
  list: {
    marginTop: 20,
  },
  listContent: {
    paddingHorizontal: GUTTER,
    paddingBottom: 8,
    gap: 8,
  },
  empty: {
    paddingTop: 28,
    paddingBottom: 20,
    paddingHorizontal: 4,
  },
  emptyTitle: {
    fontFamily: font.semibold,
    fontSize: 16,
    lineHeight: 20,
    color: colors.text,
  },
  emptyBody: {
    marginTop: 7,
    fontFamily: font.regular,
    fontSize: 13.5,
    lineHeight: 19,
    color: colors.textSub,
  },
  bannerWrap: {
    marginTop: 8,
    marginHorizontal: GUTTER,
  },
  pressed: {
    opacity: 0.85,
  },
  banner: {
    paddingVertical: 16,
    paddingHorizontal: 18,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 14,
  },
  bannerNumber: {
    fontFamily: font.semibold,
    fontSize: 30,
    lineHeight: 32,
    color: colors.accentInk,
  },
  bannerText: {
    flex: 1,
  },
  bannerTitle: {
    fontFamily: font.semibold,
    fontSize: 13.5,
    lineHeight: 18,
    color: colors.accentInk,
  },
  bannerSub: {
    marginTop: 3,
    fontFamily: font.regular,
    fontSize: 12.5,
    lineHeight: 16,
    color: colors.accentInkMuted,
  },
}));
