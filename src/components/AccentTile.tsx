import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '@/theme';
import { radius } from '@/theme/tokens';

type Props = {
  children: React.ReactNode;
  /** corner radius; the design varies this per surface */
  r?: number;
  style?: StyleProp<ViewStyle>;
  /** drop the coloured glow for tiles that sit inside another shadowed card */
  flat?: boolean;
};

/**
 * The accent surface: a flat fill of the user's chosen accent with a coloured
 * drop glow and a 1px white inner highlight along the top edge. React Native
 * has no portable inset shadow, so the highlight is drawn as a real hairline.
 */
export function AccentTile({ children, r = radius.card, style, flat = false }: Props) {
  const { colors, accentGlow } = useTheme();
  return (
    <View
      style={[
        { borderRadius: r, backgroundColor: colors.accent },
        !flat && accentGlow,
        style,
      ]}
    >
      <View style={[styles.fill, { borderRadius: r }]}>
        <View pointerEvents="none" style={[styles.highlight, { borderTopLeftRadius: r, borderTopRightRadius: r }]} />
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    overflow: 'hidden',
    // fills the parent when it has a fixed height; a no-op when it doesn't
    flexGrow: 1,
  },
  highlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.45)',
  },
});
