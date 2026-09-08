import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AccentTile } from '@/components/AccentTile';
import { ProgressRing } from '@/components/ProgressRing';
import { RadialBackdrop } from '@/components/RadialBackdrop';
import { Screen } from '@/components/Screen';
import { useAllStats, useStore, useTodayProgress } from '@/data/store';
import { clockTime, longDate, nextMilestone } from '@/lib/date';
import { ThemeScope, themedStyles, useTheme } from '@/theme';
import { font, radius, tracking } from '@/theme/tokens';

const GLASS = 'rgba(255, 255, 255, 0.13)';
const GLASS_BORDER = 'rgba(255, 255, 255, 0.16)';

/**
 * Screen 2j — a preview of surfaces the OS owns, not screens the app renders:
 * a reminder notification, a Live Activity and two home-screen widgets. Shipping
 * the real things needs native work outside React Native — expo-notifications
 * for the reminder, ActivityKit for the Live Activity, WidgetKit / Glance for
 * the widgets. This screen is the visual reference for building them.
 *
 * A lock screen is the phone's, not the app's, so the preview is pinned dark
 * regardless of the app theme — the glass literals above depend on it.
 */
export default function LockScreen() {
  return (
    <ThemeScope scheme="dark">
      <LockScreenPreview />
    </ThemeScope>
  );
}

function LockScreenPreview() {
  const router = useRouter();
  const { habits, today } = useStore();
  const stats = useAllStats();
  const { done, total, ratio } = useTodayProgress();
  const { colors } = useTheme();
  const styles = useStyles();

  const remaining = habits.filter((h) => today[h.id]?.status !== 'done');
  const streakHabit =
    habits.find((h) => nextMilestone(stats[h.id]?.streak ?? 0) !== null) ?? habits[0];
  const streak = streakHabit ? (stats[streakHabit.id]?.streak ?? 0) : 0;
  const streakTarget = streakHabit ? nextMilestone(streak) : null;

  return (
    <Screen background={colors.groundDeep} topExtra={34} bottomExtra={36} style={styles.screen}>
      <RadialBackdrop
        stops={['#1F6E82', '#123844', colors.groundDeep]}
        cx="0.7"
        cy="1"
        rx="1.3"
        ry="0.7"
        midpoint={0.45}
      />

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Close preview"
        onPress={() => router.back()}
        style={styles.clock}
      >
        <Text style={styles.date}>{longDate()}</Text>
        <Text style={styles.time}>{clockTime()}</Text>
      </Pressable>

      {/* Live Activity */}
      <View style={[styles.glass, styles.liveActivity]}>
        <View style={styles.glassHead}>
          <Text style={[styles.glassLabel, { color: colors.accentTintText }]}>Milestone · Live</Text>
          <Text style={styles.glassTime}>now</Text>
        </View>
        <View style={styles.liveBody}>
          <ProgressRing
            size={42}
            strokeWidth={4.5}
            ratio={ratio}
            label={`${done}/${total}`}
            labelSize={11}
            trackColor="rgba(255, 255, 255, 0.22)"
          />
          <View style={styles.liveText}>
            <Text style={styles.liveTitle}>
              {remaining.length} habit{remaining.length === 1 ? '' : 's'} left today
            </Text>
            <Text numberOfLines={1} style={styles.liveSub}>
              {remaining.map((h) => h.name).join(' · ') || 'All done'}
            </Text>
          </View>
          <View style={styles.logPill}>
            <Text style={styles.logLabel}>Log</Text>
          </View>
        </View>
      </View>

      {/* Reminder notification */}
      {streakHabit && (
        <View style={[styles.glass, styles.notification]}>
          <View style={styles.glassHead}>
            <Text style={styles.glassLabel}>Milestone</Text>
            <Text style={styles.glassTime}>{streakHabit.reminder ?? '7:00'}</Text>
          </View>
          <Text style={styles.notificationTitle}>
            {streakHabit.name} — today&rsquo;s the one that makes it a week
          </Text>
          <Text style={styles.notificationBody}>
            Day {streak} of {streakTarget ?? streak}. Hold to log it from here.
          </Text>
          <View style={styles.notificationActions}>
            <View style={[styles.notificationAction, styles.actionStrong]}>
              <Text style={styles.actionLabel}>Done</Text>
            </View>
            <View style={[styles.notificationAction, styles.actionWeak]}>
              <Text style={styles.actionLabel}>Snooze 1h</Text>
            </View>
          </View>
        </View>
      )}

      <View style={styles.spacer} />

      {/* Home-screen widgets */}
      <View style={styles.widgets}>
        <View style={styles.listWidget}>
          <View style={styles.widgetHead}>
            <Text style={styles.widgetLabel}>Today</Text>
            <Text style={styles.widgetCount}>
              {done}/{total}
            </Text>
          </View>
          <View style={styles.widgetRows}>
            {habits.slice(0, 4).map((habit) => {
              const complete = today[habit.id]?.status === 'done';
              return (
                <View key={habit.id} style={styles.widgetRow}>
                  <View
                    style={[
                      styles.widgetTile,
                      complete
                        ? { backgroundColor: colors.accent }
                        : { borderWidth: 1.5, borderColor: colors.ring },
                    ]}
                  />
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.widgetName,
                      { color: complete ? colors.textDim : colors.text },
                    ]}
                  >
                    {habit.name}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        {streakHabit && (
          <AccentTile r={radius.panel} style={styles.streakWidget} flat>
            <View style={styles.streakInner}>
              <Text style={styles.streakNumber}>{streak}</Text>
              <View>
                <Text style={styles.streakLabel}>Day streak</Text>
                <Text style={styles.streakHabit}>{streakHabit.name}</Text>
              </View>
            </View>
          </AccentTile>
        )}
      </View>
    </Screen>
  );
}

const useStyles = themedStyles(({ colors }) => ({
  screen: {
    paddingHorizontal: 14,
  },
  clock: {
    alignItems: 'center' as const,
    paddingTop: 22,
  },
  date: {
    fontFamily: font.regular,
    fontSize: 19,
    lineHeight: 22,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  time: {
    marginTop: 2,
    fontFamily: font.extraLight,
    fontSize: 78,
    lineHeight: 84,
    letterSpacing: -1.56,
    color: colors.white,
  },
  glass: {
    backgroundColor: GLASS,
    borderRadius: radius.button,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: GLASS_BORDER,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  liveActivity: {
    marginTop: 24,
  },
  notification: {
    marginTop: 10,
  },
  glassHead: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
  },
  glassLabel: {
    fontFamily: font.semibold,
    fontSize: 10.5,
    lineHeight: 13,
    letterSpacing: tracking(0.16, 10.5),
    color: 'rgba(255, 255, 255, 0.8)',
    textTransform: 'uppercase' as const,
  },
  glassTime: {
    fontFamily: font.medium,
    fontSize: 11,
    lineHeight: 13,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  liveBody: {
    marginTop: 11,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 12,
  },
  liveText: {
    flex: 1,
  },
  liveTitle: {
    fontFamily: font.semibold,
    fontSize: 15,
    lineHeight: 19,
    color: colors.white,
  },
  liveSub: {
    marginTop: 3,
    fontFamily: font.regular,
    fontSize: 12.5,
    lineHeight: 16,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  logPill: {
    borderRadius: radius.full,
    backgroundColor: colors.accent,
    paddingVertical: 9,
    paddingHorizontal: 15,
  },
  logLabel: {
    fontFamily: font.semibold,
    fontSize: 12.5,
    lineHeight: 14,
    letterSpacing: tracking(0.06, 12.5),
    color: colors.accentInk,
    textTransform: 'uppercase' as const,
  },
  notificationTitle: {
    marginTop: 9,
    fontFamily: font.semibold,
    fontSize: 15,
    lineHeight: 20,
    color: colors.white,
  },
  notificationBody: {
    marginTop: 5,
    fontFamily: font.regular,
    fontSize: 13.5,
    lineHeight: 19,
    color: 'rgba(255, 255, 255, 0.75)',
  },
  notificationActions: {
    marginTop: 12,
    flexDirection: 'row' as const,
    gap: 8,
  },
  notificationAction: {
    flex: 1,
    alignItems: 'center' as const,
    paddingVertical: 11,
    borderRadius: radius.sm,
  },
  actionStrong: {
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
  },
  actionWeak: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  actionLabel: {
    fontFamily: font.semibold,
    fontSize: 13,
    lineHeight: 15,
    letterSpacing: tracking(0.06, 13),
    color: colors.white,
    textTransform: 'uppercase' as const,
  },
  spacer: {
    flex: 1,
    minHeight: 16,
  },
  widgets: {
    flexDirection: 'row' as const,
    alignItems: 'flex-end' as const,
    gap: 10,
  },
  listWidget: {
    width: 166,
    height: 166,
    borderRadius: radius.chrome,
    backgroundColor: colors.elevated,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: 15,
  },
  widgetHead: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
  },
  widgetLabel: {
    fontFamily: font.semibold,
    fontSize: 10,
    lineHeight: 12,
    letterSpacing: tracking(0.14, 10),
    color: colors.accent,
    textTransform: 'uppercase' as const,
  },
  widgetCount: {
    fontFamily: font.semibold,
    fontSize: 10.5,
    lineHeight: 12,
    color: colors.textSub,
  },
  widgetRows: {
    marginTop: 12,
    gap: 10,
  },
  widgetRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 9,
  },
  widgetTile: {
    width: 17,
    height: 17,
    borderRadius: 6,
  },
  widgetName: {
    flex: 1,
    fontFamily: font.medium,
    fontSize: 12.5,
    lineHeight: 15,
  },
  streakWidget: {
    flex: 1,
    height: 76,
  },
  streakInner: {
    flex: 1,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 11,
    padding: 14,
  },
  streakNumber: {
    fontFamily: font.semibold,
    fontSize: 30,
    lineHeight: 32,
    color: colors.accentInk,
  },
  streakLabel: {
    fontFamily: font.semibold,
    fontSize: 12,
    lineHeight: 16,
    color: colors.accentInk,
    textTransform: 'uppercase' as const,
  },
  streakHabit: {
    fontFamily: font.medium,
    fontSize: 12,
    lineHeight: 16,
    color: colors.accentInkMuted,
  },
}));
