import { mix, alpha } from './color';

/**
 * Design tokens ported from `Habit Tracker - Screens.dc.html`.
 *
 * The design doc exposes a single `accent` prop and was drawn dark-first.
 * `makeTheme` below turns that into a real theme system: every tinted colour
 * derives from the chosen accent, and every neutral has a light-scheme
 * counterpart. Components read the result through `useTheme()` — nothing
 * colour-bearing is exported statically from this file.
 */
export const DEFAULT_ACCENT = '#72d7f0';

export const ACCENT_OPTIONS = ['#72d7f0', '#89D7B7', '#F0C572', '#C9A6F0'] as const;

/**
 * Stored in `habit.color` to mean "follow the app accent" rather than a fixed
 * hex — the default for new habits, so re-theming re-tints them. Old installs
 * are migrated onto it from the previous hard-coded cyan default.
 */
export const ACCENT_FOLLOW = 'accent';

/** A habit's display colour: the sentinel resolves to the current accent. */
export function resolveHabitColor(stored: string, accent: string): string {
  return stored === ACCENT_FOLLOW ? accent : stored;
}

export type ThemeMode = 'system' | 'dark' | 'light';
export type Scheme = 'dark' | 'light';

/**
 * The design hand-picked its accent derivatives for the default cyan; the
 * computed formulas below land within a few RGB points of them, but the
 * originals are kept exact so the default theme matches the design doc.
 */
const HAND_PICKED: Record<string, { ink: string; tintText: string }> = {
  [DEFAULT_ACCENT]: { ink: '#0D2F38', tintText: '#9FE4F5' },
};

const DARK_NEUTRALS = {
  /** page ground */
  ground: '#111111',
  /** deeper ground, used behind the check-in / skip sheets */
  groundDeep: '#0A0A0A',
  /** elevated chrome: sheet body, tab bar, home-screen widget */
  elevated: '#1C1C1C',
  /** the standard card */
  surface: '#2d2d2d',
  /** empty heatmap cell */
  surfaceEmpty: '#1E1E1E',

  border: '#2d2d2d',
  divider: '#3a3a3a',
  dashed: '#3d3d3d',
  /** unchecked habit tile ring, toggle-off track */
  ring: '#4a4a4a',
  /** unselected radio */
  ringAlt: '#545454',

  text: '#ffffff',
  textChip: '#E4E4E4',
  textSecondary: '#C4C4C4',
  textMuted: '#A6A6A6',
  textSub: '#9A9A9A',
  textDim: '#8A8A8A',
  textLocked: '#5a5a5a',

  /** bar chart: past weeks */
  barDim: '#4F4F4F',

  danger: '#E06A6A',
};

/** The dark neutrals, re-picked for a light ground at matching contrast steps. */
const LIGHT_NEUTRALS: typeof DARK_NEUTRALS = {
  ground: '#EAEAEE',
  groundDeep: '#E0E0E5',
  elevated: '#F2F2F6',
  surface: '#FFFFFF',
  surfaceEmpty: '#E2E2E7',

  border: '#DDDDE3',
  divider: '#E8E8EC',
  dashed: '#C8C8D0',
  ring: '#B6B6BF',
  ringAlt: '#A8A8B2',

  text: '#141417',
  textChip: '#28282C',
  textSecondary: '#46464C',
  textMuted: '#5C5C63',
  textSub: '#6F6F76',
  textDim: '#82828A',
  textLocked: '#B0B0B8',

  barDim: '#C4C4CC',

  danger: '#C94F4F',
};

export function makeTheme(scheme: Scheme, accent: string) {
  const dark = scheme === 'dark';
  const neutrals = dark ? DARK_NEUTRALS : LIGHT_NEUTRALS;
  const picked = HAND_PICKED[accent];

  /** text and glyphs sitting on an accent surface */
  const accentInk = picked?.ink ?? mix(22, '#000000', accent);

  const colors = {
    ...neutrals,

    accent,
    /** accent used as text on the ground — darkened in light for contrast */
    accentText: dark ? accent : mix(35, accent, '#000000'),
    accentInk,
    accentInkMuted: alpha(accentInk, 0.75),
    /** the quiet informational panel ("your streak pauses here, not ends") */
    accentTint: alpha(accent, dark ? 0.12 : 0.16),
    accentTintText: dark
      ? (picked?.tintText ?? mix(30, accent, '#ffffff'))
      : mix(45, accent, '#000000'),

    /** bar chart: recent weeks */
    barMid: mix(58, neutrals.surface, accent),

    /** per-habit dots on the progress screen */
    habitColors: dark
      ? [accent, '#ffffff', '#9A9A9A', mix(58, neutrals.surface, accent), mix(55, accent, '#ffffff')]
      : [accent, '#141417', '#6F6F76', mix(58, neutrals.surface, accent), mix(45, accent, '#000000')],

    white: '#ffffff',
    black: '#000000',
  };

  /** Heatmap ramp, least → most. Matches `shades` in the design's renderVals(). */
  const heatShades = [
    colors.surfaceEmpty,
    mix(26, colors.surfaceEmpty, accent),
    mix(62, colors.surfaceEmpty, accent),
    accent,
  ] as const;

  /**
   * The accent tiles in the design carry a coloured drop glow plus a 1px inner
   * top highlight. RN has no inset shadow that renders identically on both
   * platforms, so the highlight is drawn as a real hairline by <AccentTile>.
   */
  const accentGlow = {
    shadowColor: accent,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: dark ? 0.35 : 0.25,
    shadowRadius: 18,
    elevation: 8,
  } as const;

  const chromeShadow = {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: dark ? 0.6 : 0.16,
    shadowRadius: 20,
    elevation: 16,
  } as const;

  const sheetShadow = {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -14 },
    shadowOpacity: dark ? 0.75 : 0.22,
    shadowRadius: 28,
    elevation: 24,
  } as const;

  return {
    scheme,
    dark,
    colors,
    heatShades,
    /** legend swatches under the heatmap — the same ramp */
    heatLegend: heatShades,
    accentGlow,
    chromeShadow,
    sheetShadow,
  };
}

export type Theme = ReturnType<typeof makeTheme> & {
  text: import('./text').TextStyles;
};
export type ThemeColors = ReturnType<typeof makeTheme>['colors'];

export const font = {
  extraLight: 'Outfit_200ExtraLight',
  light: 'Outfit_300Light',
  regular: 'Outfit_400Regular',
  medium: 'Outfit_500Medium',
  semibold: 'Outfit_600SemiBold',
  bold: 'Outfit_700Bold',
} as const;

/** CSS letter-spacing is in `em`; React Native wants absolute units. */
export const tracking = (em: number, fontSize: number) => em * fontSize;

export const radius = {
  tile: 12,
  sm: 14,
  md: 18,
  card: 20,
  button: 22,
  panel: 24,
  chrome: 26,
  sheet: 32,
  full: 999,
} as const;

/** Screen gutter used throughout the design. */
export const GUTTER = 20;
