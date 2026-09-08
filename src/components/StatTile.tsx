import { Text, View } from 'react-native';
import { AccentTile } from './AccentTile';
import { themedStyles, useTheme } from '@/theme';
import { radius } from '@/theme/tokens';

type Props = {
  value: string;
  /** small trailing unit rendered at a reduced size, e.g. the % on "81%" */
  suffix?: string;
  label: string;
  /** the design's highlighted tile — gradient ground, dark ink */
  accent?: boolean;
  /** 38 on the habit detail, 30 in the weekly recap */
  size?: number;
  /** tint the numeral without switching the whole tile to the gradient */
  valueColor?: string;
};

export function StatTile({ value, suffix, label, accent, size = 38, valueColor }: Props) {
  const { text, colors } = useTheme();
  const styles = useStyles();
  const body = (
    <>
      <Text
        style={[
          text.stat,
          { fontSize: size, lineHeight: size + 2 },
          accent && { color: colors.accentInk },
          valueColor ? { color: valueColor } : null,
        ]}
      >
        {value}
        {suffix ? (
          <Text style={{ fontSize: size * 0.45, lineHeight: size + 2 }}>{suffix}</Text>
        ) : null}
      </Text>
      {/*
        Two lines, and the tracked caps let go of their letter-spacing when the
        tile is narrow — three across at 375pt is enough to break "COMPLETION"
        mid-word otherwise.
      */}
      <Text
        numberOfLines={2}
        adjustsFontSizeToFit
        minimumFontScale={0.85}
        style={[text.statLabel, styles.label, accent && { color: colors.accentInk }]}
      >
        {label}
      </Text>
    </>
  );

  if (accent) {
    return (
      <AccentTile r={radius.card} style={styles.tile}>
        <View style={styles.pad}>{body}</View>
      </AccentTile>
    );
  }

  return <View style={[styles.tile, styles.plain, styles.pad]}>{body}</View>;
}

const useStyles = themedStyles(({ colors }) => ({
  tile: {
    flex: 1,
  },
  plain: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
  },
  pad: {
    padding: 15,
  },
  label: {
    marginTop: 5,
  },
}));
