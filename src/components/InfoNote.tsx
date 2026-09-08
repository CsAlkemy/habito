import { Text } from 'react-native';
import { themedStyles, useTheme } from '@/theme';
import { radius } from '@/theme/tokens';

/**
 * The quiet accent-tinted panel the design uses to reassure rather than alert —
 * "your streak pauses here, not ends".
 */
export function InfoNote({ children }: { children: React.ReactNode }) {
  const { text } = useTheme();
  const styles = useStyles();
  return <Text style={[text.note, styles.note]}>{children}</Text>;
}

const useStyles = themedStyles(({ colors }) => ({
  note: {
    backgroundColor: colors.accentTint,
    borderRadius: radius.md,
    paddingVertical: 14,
    paddingHorizontal: 16,
    overflow: 'hidden' as const,
  },
}));
