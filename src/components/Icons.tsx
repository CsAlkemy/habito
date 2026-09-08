import Svg, { Circle, Path, Rect } from 'react-native-svg';

type IconProps = { color: string; size?: number };

export function TodayIcon({ color, size = 19 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <Rect x={2.5} y={2.5} width={15} height={15} rx={4.5} stroke={color} strokeWidth={1.6} />
      <Path
        d="M6.5 10.2 9 12.6 13.6 7.6"
        stroke={color}
        strokeWidth={1.7}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function ProgressIcon({ color, size = 19 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <Path
        d="M4 16V9.5M10 16V4M16 16v-8.5"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function YouIcon({ color, size = 19 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <Circle cx={10} cy={7} r={3.2} stroke={color} strokeWidth={1.6} />
      <Path
        d="M3.8 16.5c.9-3 3.2-4.5 6.2-4.5s5.3 1.5 6.2 4.5"
        stroke={color}
        strokeWidth={1.6}
        strokeLinecap="round"
      />
    </Svg>
  );
}

/** The tick inside a completed habit tile and the selected onboarding radio. */
export function Check({ color, width = 11 }: { color: string; width?: number }) {
  return (
    <Svg width={width} height={width * (9 / 11)} viewBox="0 0 10 8" fill="none">
      <Path
        d="M1 4.2 3.6 6.8 9 1.4"
        stroke={color}
        strokeWidth={1.9}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
