import { Pressable, View } from 'react-native';
import { themedStyles, useTheme } from '@/theme';

type Props = {
  value: boolean;
  onChange?: (next: boolean) => void;
  label?: string;
};

/**
 * The design draws its own switch rather than using the platform control —
 * 46×27 track, 21px knob, 3px inset.
 */
export function Toggle({ value, onChange, label }: Props) {
  const { colors } = useTheme();
  const styles = useStyles();
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      accessibilityLabel={label}
      hitSlop={8}
      onPress={() => onChange?.(!value)}
      style={[styles.track, { backgroundColor: value ? colors.accent : colors.ring }]}
    >
      <View style={[styles.knob, { left: value ? 22 : 3 }]} />
    </Pressable>
  );
}

const useStyles = themedStyles(({ colors }) => ({
  track: {
    width: 46,
    height: 27,
    borderRadius: 14,
  },
  knob: {
    position: 'absolute' as const,
    top: 3,
    width: 21,
    height: 21,
    borderRadius: 999,
    backgroundColor: colors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.45,
    shadowRadius: 3,
    elevation: 2,
  },
}));
