import { Text, View } from 'react-native';
import { themedStyles, useTheme } from '@/theme';
import { alpha } from '@/theme/color';
import { font, tracking } from '@/theme/tokens';

export type Tone = 'low' | 'mid' | 'high';

export type Bar = { label: string; height: number; tone: Tone };

type BarChartProps = {
  data: readonly Bar[];
  /** plot height in px, excluding labels */
  height: number;
  gap?: number;
  /** flat-topped bars (weekly recap) vs. rounded tops only (habit detail) */
  rounded?: boolean;
  /** horizontal accent guide, measured in px up from the baseline */
  guideAt?: number;
};

export function BarChart({
  data,
  height,
  gap = 9,
  rounded = false,
  guideAt,
}: BarChartProps) {
  const { colors } = useTheme();
  const styles = useStyles();
  const toneColor: Record<Tone, string> = {
    low: colors.barDim,
    mid: colors.barMid,
    high: colors.accent,
  };
  return (
    <View>
      <View>
        {guideAt !== undefined && (
          <View pointerEvents="none" style={[styles.guide, { bottom: guideAt }]} />
        )}
        <View style={[styles.plot, { height, gap }]}>
          {data.map((bar, i) => (
            <View
              key={`${bar.label}-${i}`}
              style={[
                styles.bar,
                rounded ? styles.barRounded : styles.barTopRounded,
                {
                  height: `${bar.height}%`,
                  backgroundColor: toneColor[bar.tone],
                },
              ]}
            />
          ))}
        </View>
      </View>
      <View style={[styles.labels, { gap }]}>
        {data.map((bar, i) => (
          <Text key={`${bar.label}-${i}`} style={styles.label}>
            {bar.label}
          </Text>
        ))}
      </View>
    </View>
  );
}

/** The eight-bar mini chart on each progress-screen habit row. */
export function Sparkline({ values, color }: { values: readonly number[]; color: string }) {
  const styles = useStyles();
  return (
    <View style={styles.spark}>
      {values.map((v, i) => (
        <View
          key={i}
          style={[styles.sparkBar, { height: `${Math.max(v, 4)}%`, backgroundColor: color }]}
        />
      ))}
    </View>
  );
}

const useStyles = themedStyles(({ colors }) => ({
  plot: {
    flexDirection: 'row' as const,
    alignItems: 'flex-end' as const,
  },
  bar: {
    flex: 1,
  },
  barRounded: {
    borderRadius: 5,
  },
  barTopRounded: {
    borderTopLeftRadius: 5,
    borderTopRightRadius: 5,
  },
  guide: {
    position: 'absolute' as const,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: alpha(colors.accent, 0.4),
    zIndex: 1,
  },
  labels: {
    marginTop: 7,
    flexDirection: 'row' as const,
  },
  label: {
    flex: 1,
    textAlign: 'center' as const,
    fontFamily: font.medium,
    fontSize: 9.5,
    lineHeight: 11,
    letterSpacing: tracking(0.06, 9.5),
    color: colors.textSub,
  },
  spark: {
    marginTop: 9,
    height: 20,
    flexDirection: 'row' as const,
    alignItems: 'flex-end' as const,
    gap: 4,
  },
  sparkBar: {
    flex: 1,
    borderRadius: 2,
    opacity: 0.8,
  },
}));
