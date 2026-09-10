import { StyleSheet, Text, View } from 'react-native';
import { AccentTile } from './AccentTile';
import { Check } from './Icons';
import { ProgressRing } from './ProgressRing';
import { useAllStats, useStore } from '@/data/store';
import { nextMilestone } from '@/lib/date';
import { type WidgetConfig, widgetHabits } from '@/lib/widget';
import { themedStyles, useTheme } from '@/theme';
import { alpha, mix } from '@/theme/color';
import { font, radius, resolveHabitColor, tracking } from '@/theme/tokens';

/** iOS widget footprints on a 6.1" phone, close enough for a preview. */
export const WIDGET_SMALL = 166;
export const WIDGET_MEDIUM = { width: 342, height: 158 };

type Props = {
  config: WidgetConfig;
};

/**
 * Draws the home-screen widget the user designed, from live store data. Used
 * by the editor (as its preview) and the lock-screen mock-up, so both show the
 * same thing. The widget itself is an OS surface — see `src/lib/widget.ts`.
 */
export function WidgetPreview({ config }: Props) {
  const { habits, today, history, todayKey } = useStore();
  const stats = useAllStats();
  const shown = widgetHabits(config, habits, history, todayKey);
  const due = habits.length;
  const done = habits.filter((h) => today[h.id]?.status === 'done').length;

  if (config.style === 'streak') {
    return (
      <StreakCard
        config={config}
        habit={shown[0]}
        streak={shown[0] ? (stats[shown[0].id]?.streak ?? 0) : 0}
        done={done}
        total={due}
      />
    );
  }
  if (config.style === 'ring') {
    return <RingWidget config={config} done={done} total={due} />;
  }
  return (
    <ListWidget
      config={config}
      habits={shown}
      doneIds={new Set(habits.filter((h) => today[h.id]?.status === 'done').map((h) => h.id))}
      done={done}
      total={due}
    />
  );
}

function Header({ config, done, total }: { config: WidgetConfig; done: number; total: number }) {
  const { colors } = useTheme();
  const styles = useStyles();
  return (
    <View style={styles.head}>
      <Text
        numberOfLines={1}
        style={[styles.label, { color: config.tint === 'accent' ? colors.accent : colors.textSub }]}
      >
        {config.label}
      </Text>
      {config.showCount && (
        <Text style={styles.count}>
          {done}/{total}
        </Text>
      )}
    </View>
  );
}

function ListWidget({
  config,
  habits,
  doneIds,
  done,
  total,
}: {
  config: WidgetConfig;
  habits: ReturnType<typeof widgetHabits>;
  doneIds: Set<string>;
  done: number;
  total: number;
}) {
  const { colors } = useTheme();
  const styles = useStyles();
  return (
    <View style={styles.small}>
      <Header config={config} done={done} total={total} />
      <View style={styles.rows}>
        {habits.length === 0 && <Text style={styles.empty}>No habits yet</Text>}
        {habits.map((habit) => {
          const complete = doneIds.has(habit.id);
          const tone =
            config.tint === 'accent' ? resolveHabitColor(habit.color, colors.accent) : colors.text;
          return (
            <View key={habit.id} style={styles.row}>
              <View
                style={[
                  styles.tile,
                  complete
                    ? { backgroundColor: tone }
                    : { borderWidth: 1.5, borderColor: colors.ring },
                ]}
              >
                {complete && <Check color={mix(22, '#000000', tone)} width={9} />}
              </View>
              <Text
                numberOfLines={1}
                style={[styles.name, { color: complete ? colors.textDim : colors.text }]}
              >
                {habit.icon ? `${habit.icon} ` : ''}
                {habit.name}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function RingWidget({
  config,
  done,
  total,
}: {
  config: WidgetConfig;
  done: number;
  total: number;
}) {
  const { colors } = useTheme();
  const styles = useStyles();
  const left = total - done;
  return (
    <View style={styles.small}>
      <Header config={config} done={done} total={total} />
      <View style={styles.ringBody}>
        <ProgressRing
          size={84}
          strokeWidth={8}
          ratio={total === 0 ? 0 : done / total}
          label={total === 0 ? '—' : `${done}/${total}`}
          labelSize={15}
          trackColor={alpha(colors.text, 0.12)}
          color={config.tint === 'accent' ? colors.accent : colors.text}
        />
      </View>
      <Text numberOfLines={1} style={styles.foot}>
        {total === 0
          ? 'Nothing to track yet'
          : left === 0
            ? 'All done today'
            : `${left} left today`}
      </Text>
    </View>
  );
}

function StreakCard({
  config,
  habit,
  streak,
  done,
  total,
}: {
  config: WidgetConfig;
  habit: ReturnType<typeof widgetHabits>[number] | undefined;
  streak: number;
  done: number;
  total: number;
}) {
  const { colors } = useTheme();
  const styles = useStyles();
  const accent = config.tint === 'accent';
  const ink = accent ? colors.accentInk : colors.text;
  const inkMuted = accent ? colors.accentInkMuted : colors.textSub;
  const target = nextMilestone(streak);
  const progress = target ? Math.min(1, streak / target) : 1;

  const body = (
    <View style={styles.streakInner}>
      <View style={styles.streakNumberWrap}>
        <Text style={[styles.streakNumber, { color: ink }]}>{streak}</Text>
        <Text style={[styles.streakLabel, { color: inkMuted }]}>Day streak</Text>
      </View>
      <View style={styles.streakText}>
        {config.showCount && (
          <Text style={[styles.streakCount, { color: inkMuted }]}>
            {done}/{total} today
          </Text>
        )}
        <Text numberOfLines={1} style={[styles.streakHabit, { color: ink }]}>
          {habit ? `${habit.icon ? `${habit.icon} ` : ''}${habit.name}` : 'No habits yet'}
        </Text>
        <Text numberOfLines={2} style={[styles.streakSub, { color: inkMuted }]}>
          {!habit
            ? 'Add one to start a run'
            : target === null
              ? 'Every milestone reached'
              : target - streak === 1
                ? `One day to your ${target}-day milestone`
                : `${target - streak} days to your ${target}-day milestone`}
        </Text>
        <View style={[styles.streakTrack, { backgroundColor: alpha(ink, accent ? 0.22 : 0.12) }]}>
          <View
            style={[
              styles.streakFill,
              { flex: progress, backgroundColor: accent ? ink : colors.accent },
            ]}
          />
          <View style={{ flex: 1 - progress }} />
        </View>
      </View>
    </View>
  );

  if (accent) {
    return (
      <AccentTile r={radius.chrome} style={styles.medium} flat>
        {body}
      </AccentTile>
    );
  }
  return <View style={[styles.medium, styles.neutral]}>{body}</View>;
}

const useStyles = themedStyles(({ colors }) => ({
  small: {
    width: WIDGET_SMALL,
    height: WIDGET_SMALL,
    borderRadius: radius.chrome,
    backgroundColor: colors.elevated,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: 15,
  },
  medium: {
    width: WIDGET_MEDIUM.width,
    height: WIDGET_MEDIUM.height,
    borderRadius: radius.chrome,
  },
  neutral: {
    backgroundColor: colors.elevated,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  head: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    gap: 8,
  },
  label: {
    flex: 1,
    fontFamily: font.semibold,
    fontSize: 10,
    lineHeight: 12,
    letterSpacing: tracking(0.14, 10),
    textTransform: 'uppercase' as const,
  },
  count: {
    fontFamily: font.semibold,
    fontSize: 10.5,
    lineHeight: 12,
    color: colors.textSub,
  },
  rows: {
    marginTop: 12,
    gap: 10,
  },
  row: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 9,
  },
  tile: {
    width: 17,
    height: 17,
    borderRadius: 6,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  name: {
    flex: 1,
    fontFamily: font.medium,
    fontSize: 12.5,
    lineHeight: 15,
  },
  empty: {
    fontFamily: font.regular,
    fontSize: 12,
    lineHeight: 15,
    color: colors.textDim,
  },
  ringBody: {
    flex: 1,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  foot: {
    fontFamily: font.medium,
    fontSize: 11.5,
    lineHeight: 14,
    color: colors.textSub,
    textAlign: 'center' as const,
  },
  streakInner: {
    flex: 1,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 16,
    paddingVertical: 16,
    paddingHorizontal: 18,
  },
  streakNumberWrap: {
    alignItems: 'center' as const,
    minWidth: 84,
  },
  streakNumber: {
    fontFamily: font.semibold,
    fontSize: 56,
    lineHeight: 58,
    letterSpacing: -1.2,
  },
  streakLabel: {
    marginTop: 2,
    fontFamily: font.semibold,
    fontSize: 10.5,
    lineHeight: 13,
    letterSpacing: tracking(0.14, 10.5),
    textTransform: 'uppercase' as const,
  },
  streakText: {
    flex: 1,
    minWidth: 0,
  },
  streakCount: {
    fontFamily: font.semibold,
    fontSize: 10.5,
    lineHeight: 13,
    letterSpacing: tracking(0.1, 10.5),
    textTransform: 'uppercase' as const,
    marginBottom: 4,
  },
  streakHabit: {
    fontFamily: font.semibold,
    fontSize: 16,
    lineHeight: 20,
  },
  streakSub: {
    marginTop: 3,
    fontFamily: font.regular,
    fontSize: 12.5,
    lineHeight: 16,
  },
  streakTrack: {
    marginTop: 10,
    height: 6,
    borderRadius: 3,
    flexDirection: 'row' as const,
    overflow: 'hidden' as const,
  },
  streakFill: {
    borderRadius: 3,
  },
}));
