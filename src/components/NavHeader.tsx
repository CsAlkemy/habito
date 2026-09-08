import { Text, View, type StyleProp, type TextStyle } from 'react-native';
import { TextAction } from './Button';
import { themedStyles, useTheme } from '@/theme';

type Action = { label: string; onPress?: () => void; emphasis?: 'accent' | 'muted' };

type Props = {
  left?: Action;
  title: string;
  right?: Action;
};

/** The three-column header used by New habit (2e) and Habit detail (2f). */
export function NavHeader({ left, title, right }: Props) {
  const { text, colors } = useTheme();
  const styles = useStyles();
  const emphasis = (action: Action): StyleProp<TextStyle> =>
    action.emphasis === 'accent'
      ? { color: colors.accentText, fontFamily: 'Outfit_600SemiBold' }
      : undefined;
  return (
    <View style={styles.row}>
      <View style={styles.side}>
        {left && <TextAction label={left.label} onPress={left.onPress} labelStyle={emphasis(left)} />}
      </View>
      <Text style={text.navTitle}>{title}</Text>
      <View style={[styles.side, styles.right]}>
        {right && (
          <TextAction label={right.label} onPress={right.onPress} labelStyle={emphasis(right)} />
        )}
      </View>
    </View>
  );
}

const useStyles = themedStyles(() => ({
  row: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
  },
  side: {
    minWidth: 56,
  },
  right: {
    alignItems: 'flex-end' as const,
  },
}));
