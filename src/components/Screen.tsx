import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import { GUTTER } from '@/theme/tokens';

type Props = {
  children: React.ReactNode;
  background?: string;
  /** extra space below the status bar; the design sits content ~12px under it */
  topExtra?: number;
  bottomExtra?: number;
  /**
   * Reserve the home-indicator inset. Tab screens set this false — the tab bar
   * sits below the scene and already clears the inset itself.
   */
  safeBottom?: boolean;
  /** apply the standard 20px screen gutter */
  gutter?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function Screen({
  children,
  background,
  topExtra = 12,
  bottomExtra = 24,
  safeBottom = true,
  gutter = false,
  style,
}: Props) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.root,
        {
          backgroundColor: background ?? colors.ground,
          paddingTop: insets.top + topExtra,
          paddingBottom: safeBottom ? Math.max(insets.bottom, bottomExtra) : bottomExtra,
          paddingHorizontal: gutter ? GUTTER : 0,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
