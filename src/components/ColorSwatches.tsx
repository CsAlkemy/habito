import { Pressable, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { themedStyles, useTheme } from '@/theme';
import { ACCENT_FOLLOW, ACCENT_OPTIONS, resolveHabitColor } from '@/theme/tokens';

/**
 * The habit colour row from screen 2e. The first choice follows the app accent
 * (stored as a sentinel, so re-theming re-tints the habit); the rest are
 * literal hexes that stay put.
 */

type Props = {
  value: string;
  onChange: (next: string) => void;
  style?: StyleProp<ViewStyle>;
};

export function ColorSwatches({ value, onChange, style }: Props) {
  const { colors } = useTheme();
  const styles = useStyles();

  const swatches = [
    ACCENT_FOLLOW,
    ...ACCENT_OPTIONS.filter((option) => option !== colors.accent),
    '#9A9AA2',
  ];

  return (
    <View style={[styles.swatches, style]}>
      {swatches.map((swatch) => {
        const selected = swatch === value;
        const shown = resolveHabitColor(swatch, colors.accent);
        return (
          <Pressable
            key={swatch}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            accessibilityLabel={
              swatch === ACCENT_FOLLOW ? 'Colour: match the app accent' : `Colour ${swatch}`
            }
            onPress={() => onChange(swatch)}
            style={[styles.swatchRing, selected && { borderColor: shown, borderWidth: 1.5 }]}
          >
            <View style={[styles.swatch, { backgroundColor: shown }]} />
          </Pressable>
        );
      })}
    </View>
  );
}

const useStyles = themedStyles(() => ({
  swatches: {
    flexDirection: 'row' as const,
    gap: 7,
  },
  swatchRing: {
    padding: 2,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  swatch: {
    width: 20,
    height: 20,
    borderRadius: 999,
  },
}));
