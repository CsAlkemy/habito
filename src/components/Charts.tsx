import { useState } from 'react';
import { type LayoutChangeEvent, Text, View } from 'react-native';
import Svg, { Circle, Defs, Line, LinearGradient, Path, Stop } from 'react-native-svg';
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

type LineChartProps = {
  /** 0–100 per point, oldest first; null gaps break the line */
  points: readonly (number | null)[];
  /** sparse axis labels, keyed by point index */
  labels: readonly { index: number; text: string }[];
  /** plot height in px, excluding labels */
  height: number;
  color: string;
};

const LINE_PAD = 5;
const AXIS_WIDTH = 24;

/**
 * Path through the points, curved with horizontal control handles so the line
 * eases between values without ever swinging above 100 or below 0.
 */
function smoothPath(pts: { x: number; y: number }[]): string {
  return pts
    .map((p, i) => {
      if (i === 0) return `M ${p.x} ${p.y}`;
      const prev = pts[i - 1];
      const mid = (prev.x + p.x) / 2;
      return `C ${mid} ${prev.y} ${mid} ${p.y} ${p.x} ${p.y}`;
    })
    .join(' ');
}

/** The completion trend line on the Progress screen. */
export function LineChart({ points, labels, height, color }: LineChartProps) {
  const { colors } = useTheme();
  const styles = useStyles();
  const [width, setWidth] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  const plotWidth = Math.max(0, width - AXIS_WIDTH);
  const n = points.length;
  const x = (i: number) => (n <= 1 ? plotWidth / 2 : (i / (n - 1)) * plotWidth);
  const y = (pct: number) => LINE_PAD + (1 - pct / 100) * (height - LINE_PAD * 2);

  // Runs of consecutive logged points; each becomes its own curve so a gap in
  // the data reads as a gap, not as a slope across it.
  const runs: { x: number; y: number }[][] = [];
  points.forEach((pct, i) => {
    if (pct === null) {
      if (runs.length && runs[runs.length - 1].length) runs.push([]);
      return;
    }
    if (!runs.length) runs.push([]);
    runs[runs.length - 1].push({ x: x(i), y: y(pct) });
  });
  const segments = runs.filter((run) => run.length > 0);
  const last = segments.length ? segments[segments.length - 1].slice(-1)[0] : null;
  const gradientId = `trend-${color.replace(/[^a-zA-Z0-9]/g, '')}`;

  return (
    <View>
      <View onLayout={onLayout} style={{ height }}>
        {width > 0 && (
          <Svg width={width} height={height}>
            <Defs>
              <LinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={color} stopOpacity={0.28} />
                <Stop offset="1" stopColor={color} stopOpacity={0} />
              </LinearGradient>
            </Defs>
            {[0, 50, 100].map((pct) => (
              <Line
                key={pct}
                x1={0}
                x2={plotWidth}
                y1={y(pct)}
                y2={y(pct)}
                stroke={colors.divider}
                strokeWidth={1}
                strokeDasharray={pct === 0 ? undefined : '3 4'}
              />
            ))}
            {segments.map((run, i) =>
              run.length === 1 ? (
                <Circle key={i} cx={run[0].x} cy={run[0].y} r={3} fill={color} />
              ) : (
                <Path
                  key={`area-${i}`}
                  d={`${smoothPath(run)} L ${run[run.length - 1].x} ${y(0)} L ${run[0].x} ${y(0)} Z`}
                  fill={`url(#${gradientId})`}
                />
              ),
            )}
            {segments.map(
              (run, i) =>
                run.length > 1 && (
                  <Path
                    key={`line-${i}`}
                    d={smoothPath(run)}
                    stroke={color}
                    strokeWidth={2.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                  />
                ),
            )}
            {last && (
              <Circle cx={last.x} cy={last.y} r={4.5} fill={color} stroke={colors.surface} strokeWidth={2} />
            )}
          </Svg>
        )}
        {[100, 50, 0].map((pct) => (
          <Text key={pct} style={[styles.axisLabel, { top: y(pct) - 6 }]}>
            {pct}
          </Text>
        ))}
        {segments.length === 0 && (
          <View pointerEvents="none" style={styles.lineEmpty}>
            <Text style={styles.lineEmptyText}>Nothing logged in this range yet.</Text>
          </View>
        )}
      </View>
      <View style={[styles.lineLabels, { width: plotWidth }]}>
        {labels.map(({ index, text }) => (
          <Text
            key={`${index}-${text}`}
            style={[
              styles.lineLabel,
              { left: x(index) },
              // Keep the first label from hanging off the left edge.
              index === 0 && styles.lineLabelStart,
            ]}
          >
            {text}
          </Text>
        ))}
      </View>
    </View>
  );
}

const useStyles = themedStyles(({ colors }) => ({
  axisLabel: {
    position: 'absolute' as const,
    right: 0,
    width: AXIS_WIDTH - 6,
    textAlign: 'right' as const,
    fontFamily: font.medium,
    fontSize: 8.5,
    lineHeight: 12,
    color: colors.textSub,
  },
  lineEmpty: {
    position: 'absolute' as const,
    top: 0,
    right: AXIS_WIDTH,
    bottom: 0,
    left: 0,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  lineEmptyText: {
    fontFamily: font.regular,
    fontSize: 12.5,
    lineHeight: 16,
    color: colors.textSub,
  },
  lineLabels: {
    marginTop: 8,
    height: 12,
    position: 'relative' as const,
  },
  lineLabel: {
    position: 'absolute' as const,
    fontFamily: font.medium,
    fontSize: 9.5,
    lineHeight: 11,
    letterSpacing: tracking(0.06, 9.5),
    color: colors.textSub,
    transform: [{ translateX: '-50%' }],
  },
  lineLabelStart: {
    transform: [{ translateX: 0 }],
  },
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
