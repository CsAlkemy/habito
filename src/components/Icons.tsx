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

/** Paywall perks — the same 20-unit grid and rounded 1.6 stroke as the tabs. */
export function InfinityIcon({ color, size = 19 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <Path
        d="M10 10c-1.6-2.1-3-3.2-4.6-3.2a3.2 3.2 0 0 0 0 6.4c1.6 0 3-1.1 4.6-3.2s3-3.2 4.6-3.2a3.2 3.2 0 0 1 0 6.4c-1.6 0-3-1.1-4.6-3.2Z"
        stroke={color}
        strokeWidth={1.7}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function TrendIcon({ color, size = 19 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <Path d="M3 16.5h14" stroke={color} strokeWidth={1.6} strokeLinecap="round" />
      <Path
        d="M4 12.8 7.6 9.2l2.9 2.6 5-5.2M12.3 6.6h3.2v3.2"
        stroke={color}
        strokeWidth={1.7}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function BellIcon({ color, size = 19 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <Path
        d="M5.4 13.6V9.2a4.6 4.6 0 0 1 9.2 0v4.4l1.4 1.6H4l1.4-1.6Z"
        stroke={color}
        strokeWidth={1.6}
        strokeLinejoin="round"
      />
      <Path d="M8.3 17.4a2 2 0 0 0 3.4 0" stroke={color} strokeWidth={1.6} strokeLinecap="round" />
    </Svg>
  );
}

export function DropIcon({ color, size = 19 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <Path
        d="M10 2.8c3 3.4 4.8 6.1 4.8 8.6a4.8 4.8 0 0 1-9.6 0c0-2.5 1.8-5.2 4.8-8.6Z"
        stroke={color}
        strokeWidth={1.6}
        strokeLinejoin="round"
      />
      <Path d="M7.9 11.8a2.2 2.2 0 0 0 1.7 2" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
    </Svg>
  );
}

export function WidgetIcon({ color, size = 19 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <Rect x={3} y={3} width={6} height={6} rx={2} stroke={color} strokeWidth={1.6} />
      <Rect x={11} y={3} width={6} height={6} rx={2} stroke={color} strokeWidth={1.6} />
      <Rect x={3} y={11} width={6} height={6} rx={2} stroke={color} strokeWidth={1.6} />
      <Rect x={11} y={11} width={6} height={6} rx={2} stroke={color} strokeWidth={1.6} />
    </Svg>
  );
}
