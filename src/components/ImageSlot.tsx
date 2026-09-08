import { Image, Text, View, type ImageSourcePropType } from 'react-native';
import { themedStyles } from '@/theme';
import { font } from '@/theme/tokens';

type Props = {
  /** drop a render in here and the placeholder disappears */
  source?: ImageSourcePropType;
  placeholder: string;
  width: number;
  height: number;
  radius?: number;
};

/**
 * Stand-in for the design's `<image-slot>`, which is a drag-and-drop target on
 * the canvas. Until real art is supplied it draws the same dashed frame.
 */
export function ImageSlot({ source, placeholder, width, height, radius = 24 }: Props) {
  const styles = useStyles();
  if (source) {
    return (
      <Image
        source={source}
        accessibilityIgnoresInvertColors
        style={{ width, height, borderRadius: radius }}
        resizeMode="contain"
      />
    );
  }

  return (
    <View style={[styles.empty, { width, height, borderRadius: radius }]}>
      <Text style={styles.label}>{placeholder}</Text>
    </View>
  );
}

const useStyles = themedStyles(({ colors }) => ({
  empty: {
    borderWidth: 1.5,
    borderStyle: 'dashed' as const,
    borderColor: colors.dashed,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingHorizontal: 24,
  },
  label: {
    fontFamily: font.medium,
    fontSize: 13,
    lineHeight: 19,
    color: colors.textDim,
    textAlign: 'center' as const,
  },
}));
