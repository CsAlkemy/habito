import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { ColorPicker, HUE_STOPS } from './ColorPicker';
import { themedStyles, useTheme } from '@/theme';
import { ACCENT_FOLLOW, ACCENT_OPTIONS, resolveHabitColor } from '@/theme/tokens';

/**
 * The habit colour row from screen 2e. The first choice follows the app accent
 * (stored as a sentinel, so re-theming re-tints the habit); the rest are
 * literal hexes that stay put. The last swatch opens the free picker, and
 * shows whatever custom colour it produced.
 */

type Props = {
  value: string;
  onChange: (next: string) => void;
  style?: StyleProp<ViewStyle>;
};

export function ColorSwatches({ value, onChange, style }: Props) {
  const { colors } = useTheme();
  const styles = useStyles();
  const [picking, setPicking] = useState(false);

  const swatches = [
    ACCENT_FOLLOW,
    ...ACCENT_OPTIONS.filter((option) => option !== colors.accent),
    '#9A9AA2',
  ];
  const custom = swatches.includes(value) ? null : value;

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

      <Pressable
        accessibilityRole="button"
        accessibilityState={{ selected: custom !== null }}
        accessibilityLabel={custom ? `Custom colour ${custom}, tap to change` : 'Custom colour'}
        onPress={() => setPicking(true)}
        style={[styles.swatchRing, custom !== null && { borderColor: custom, borderWidth: 1.5 }]}
      >
        {custom ? (
          <View style={[styles.swatch, { backgroundColor: custom }]} />
        ) : (
          <LinearGradient
            colors={HUE_STOPS}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.swatch}
          />
        )}
      </Pressable>

      <ColorPicker
        visible={picking}
        title="Habit colour"
        value={resolveHabitColor(value, colors.accent)}
        onChange={onChange}
        onDismiss={() => setPicking(false)}
      />
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
