import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { themedStyles, useTheme } from '@/theme';
import { font } from '@/theme/tokens';

type Props = {
  size: number;
  strokeWidth: number;
  /** 0–1 */
  ratio: number;
  label: string;
  labelSize?: number;
  trackColor?: string;
  color?: string;
};

export function ProgressRing({
  size,
  strokeWidth,
  ratio,
  label,
  labelSize = 13,
  trackColor,
  color,
}: Props) {
  const { colors } = useTheme();
  const styles = useStyles();
  trackColor = trackColor ?? colors.surface;
  color = color ?? colors.accent;
  const r = (size - strokeWidth) / 2 - 1;
  const circumference = 2 * Math.PI * r;
  const clamped = Math.min(1, Math.max(0, ratio));

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={trackColor}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - clamped)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <View style={styles.center}>
          <Text style={[styles.label, { fontSize: labelSize, lineHeight: labelSize + 2 }]}>
            {label}
          </Text>
        </View>
      </View>
    </View>
  );
}

const useStyles = themedStyles(({ colors }) => ({
  center: {
    flex: 1,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  label: {
    fontFamily: font.semibold,
    color: colors.text,
  },
}));
