import { Pressable, Text, type StyleProp, type ViewStyle } from 'react-native';
import { themedStyles, useTheme } from '@/theme';
import { font, radius } from '@/theme/tokens';

type Variant = 'primary' | 'secondary';

type Props = {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  /** secondary buttons in the design hug their label instead of filling */
  fill?: boolean;
  /** dims the button and stops the press — used while a form is incomplete */
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  fill = true,
  disabled = false,
  style,
}: Props) {
  const { text } = useTheme();
  const styles = useStyles();
  const primary = variant === 'primary';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        primary ? styles.primary : styles.secondary,
        fill && styles.fill,
        pressed && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
    >
      <Text style={[text.button, primary ? styles.primaryLabel : styles.secondaryLabel]}>
        {label}
      </Text>
    </Pressable>
  );
}

/** The bordered "+ Add a habit" affordance on the Today screen. */
export function DashedButton({ label, onPress }: { label: string; onPress?: () => void }) {
  const styles = useStyles();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.dashed, pressed && styles.pressed]}
    >
      <Text style={styles.dashedLabel}>{label}</Text>
    </Pressable>
  );
}

/** Muted plain-text actions: Back, Cancel, Edit, Share this. */
export function TextAction({
  label,
  onPress,
  style,
  labelStyle,
}: {
  label: string;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  labelStyle?: StyleProp<import('react-native').TextStyle>;
}) {
  const { text } = useTheme();
  const styles = useStyles();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [pressed && styles.pressed, style]}
    >
      <Text style={[text.navAction, labelStyle]}>{label}</Text>
    </Pressable>
  );
}

const useStyles = themedStyles(({ colors, dark }) => ({
  base: {
    borderRadius: radius.button,
    paddingVertical: 19,
    paddingHorizontal: 22,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  fill: {
    flex: 1,
  },
  primary: {
    // the design's "white" primary: highest-contrast fill on the ground
    backgroundColor: dark ? colors.white : colors.text,
  },
  secondary: {
    backgroundColor: colors.surface,
  },
  primaryLabel: {
    color: colors.ground,
  },
  secondaryLabel: {
    color: colors.textSecondary,
  },
  pressed: {
    opacity: 0.72,
  },
  disabled: {
    opacity: 0.35,
  },
  dashed: {
    borderWidth: 1.5,
    borderStyle: 'dashed' as const,
    borderColor: colors.dashed,
    borderRadius: radius.card,
    padding: 15,
    alignItems: 'center' as const,
  },
  dashedLabel: {
    fontFamily: font.medium,
    fontSize: 14,
    lineHeight: 17,
    color: colors.textSub,
  },
}));
