import { View, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '@/theme';
import { radius } from '@/theme/tokens';

type Props = {
  children: React.ReactNode;
  /** the design uses 20 for list cards and 24 for the larger data panels */
  r?: number;
  padding?: number;
  style?: StyleProp<ViewStyle>;
};

export function Card({ children, r = radius.card, padding = 18, style }: Props) {
  const { colors } = useTheme();
  return (
    <View
      style={[{ backgroundColor: colors.surface, borderRadius: r, padding }, style]}
    >
      {children}
    </View>
  );
}
