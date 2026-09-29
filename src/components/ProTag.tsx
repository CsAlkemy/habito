import { Text, View } from 'react-native';
import { themedStyles } from '@/theme';
import { font, radius, tracking } from '@/theme/tokens';

/** The small "PRO" pill beside an option that opens the paywall. */
export function ProTag() {
  const styles = useStyles();
  return (
    <View style={styles.tag} accessibilityElementsHidden importantForAccessibility="no">
      <Text style={styles.label}>Pro</Text>
    </View>
  );
}

const useStyles = themedStyles(({ colors }) => ({
  tag: {
    backgroundColor: colors.accentTint,
    borderRadius: radius.full,
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  label: {
    fontFamily: font.semibold,
    fontSize: 9.5,
    lineHeight: 11,
    letterSpacing: tracking(0.12, 9.5),
    color: colors.accentTintText,
    textTransform: 'uppercase' as const,
  },
}));
