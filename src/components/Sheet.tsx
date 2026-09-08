import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Screen } from './Screen';
import { useStore } from '@/data/store';
import { greeting, shortDate } from '@/lib/date';
import { themedStyles, useTheme } from '@/theme';
import { GUTTER, radius } from '@/theme/tokens';

/**
 * Screens 2c and 2d: the Today header dimmed to 30%, everything pushed down,
 * and a rounded panel anchored to the bottom edge.
 */
export function SheetScreen({
  children,
  onDismiss,
}: {
  children: React.ReactNode;
  onDismiss: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { profileName } = useStore();
  const { text, colors } = useTheme();
  const styles = useStyles();

  return (
    <Screen background={colors.groundDeep} bottomExtra={0} safeBottom={false} style={styles.screen}>
      <View style={styles.header} pointerEvents="none">
        <Text style={text.eyebrow}>{shortDate()}</Text>
        <Text style={[text.screenTitle, styles.greeting]}>
          {greeting()}, {profileName}
        </Text>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Dismiss"
        style={styles.backdrop}
        onPress={onDismiss}
      />

      <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 24) + 16 }]}>
        <View style={styles.grabber} />
        <ScrollView
          bounces={false}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.sheetContent}
        >
          {children}
        </ScrollView>
      </View>
    </Screen>
  );
}

const useStyles = themedStyles(({ colors, sheetShadow }) => ({
  screen: {
    justifyContent: 'flex-end' as const,
  },
  header: {
    paddingHorizontal: GUTTER,
    opacity: 0.3,
  },
  greeting: {
    marginTop: 10,
  },
  backdrop: {
    flex: 1,
    minHeight: 24,
  },
  sheet: {
    backgroundColor: colors.elevated,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    paddingTop: 14,
    paddingHorizontal: 22,
    ...sheetShadow,
  },
  grabber: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.dashed,
    alignSelf: 'center' as const,
    marginBottom: 22,
  },
  sheetContent: {
    paddingBottom: 4,
  },
}));
