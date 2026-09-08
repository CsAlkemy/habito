import { StyleSheet, View } from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';

type Props = {
  /** stop colours from centre outward */
  stops: readonly [string, string, string];
  /** centre position and radii as fractions of the box */
  cx?: string;
  cy?: string;
  rx?: string;
  ry?: string;
  midpoint?: number;
};

/**
 * CSS radial gradients have no expo-linear-gradient equivalent, so the
 * milestone and lock-screen grounds are drawn with SVG instead.
 */
export function RadialBackdrop({
  stops,
  cx = '0.5',
  cy = '0.42',
  rx = '1.2',
  ry = '0.8',
  midpoint = 0.58,
}: Props) {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width="100%" height="100%">
        <Defs>
          <RadialGradient id="backdrop" cx={cx} cy={cy} rx={rx} ry={ry} gradientUnits="objectBoundingBox">
            <Stop offset="0" stopColor={stops[0]} />
            <Stop offset={String(midpoint)} stopColor={stops[1]} />
            <Stop offset="1" stopColor={stops[2]} />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#backdrop)" />
      </Svg>
    </View>
  );
}
