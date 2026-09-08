import { StyleSheet } from 'react-native';
import { font, tracking, type ThemeColors } from './tokens';

/**
 * The type ramp from the design. CSS unitless line-heights are resolved to
 * absolute values here because React Native has no relative `lineHeight`.
 * Colours come from the active theme, so the ramp is built per-theme by the
 * ThemeProvider and read as `useTheme().text`.
 */
export function makeText(colors: ThemeColors) {
  return StyleSheet.create({
    /** small tracked accent caps that head most screens */
    eyebrow: {
      fontFamily: font.semibold,
      fontSize: 11,
      lineHeight: 13,
      letterSpacing: tracking(0.16, 11),
      color: colors.accentText,
      textTransform: 'uppercase',
    },
    /** the same, in grey, above a form group */
    label: {
      fontFamily: font.semibold,
      fontSize: 10.5,
      lineHeight: 13,
      letterSpacing: tracking(0.16, 10.5),
      color: colors.textDim,
      textTransform: 'uppercase',
    },
    /** panel heading inside a card ("LAST 12 WEEKS") */
    sectionLabel: {
      fontFamily: font.semibold,
      fontSize: 12,
      lineHeight: 14,
      letterSpacing: tracking(0.12, 12),
      color: colors.text,
      textTransform: 'uppercase',
    },
    screenTitle: {
      fontFamily: font.semibold,
      fontSize: 27,
      lineHeight: 29,
      letterSpacing: -0.14,
      color: colors.text,
      textTransform: 'uppercase',
    },
    screenTitleLg: {
      fontFamily: font.semibold,
      fontSize: 31,
      lineHeight: 34,
      letterSpacing: -0.31,
      color: colors.text,
      textTransform: 'uppercase',
    },
    screenTitleSm: {
      fontFamily: font.semibold,
      fontSize: 26,
      lineHeight: 29,
      color: colors.text,
      textTransform: 'uppercase',
    },
    sheetTitle: {
      fontFamily: font.semibold,
      fontSize: 25,
      lineHeight: 28,
      color: colors.text,
      textTransform: 'uppercase',
    },
    body: {
      fontFamily: font.regular,
      fontSize: 15,
      lineHeight: 23,
      color: colors.textMuted,
    },
    bodySm: {
      fontFamily: font.regular,
      fontSize: 14,
      lineHeight: 21,
      color: colors.textMuted,
    },
    cardTitle: {
      fontFamily: font.semibold,
      fontSize: 15,
      lineHeight: 20,
      color: colors.text,
    },
    cardTitleLg: {
      fontFamily: font.semibold,
      fontSize: 15.5,
      lineHeight: 20,
      color: colors.text,
    },
    cardSub: {
      fontFamily: font.regular,
      fontSize: 12.5,
      lineHeight: 17,
      color: colors.textSub,
    },
    cardSubLg: {
      fontFamily: font.regular,
      fontSize: 13,
      lineHeight: 17,
      color: colors.textSub,
    },
    /** big numerals on stat tiles */
    stat: {
      fontFamily: font.semibold,
      fontSize: 38,
      lineHeight: 40,
      color: colors.text,
    },
    statLabel: {
      fontFamily: font.semibold,
      fontSize: 10,
      lineHeight: 13,
      letterSpacing: tracking(0.12, 10),
      color: colors.textSub,
      textTransform: 'uppercase',
    },
    button: {
      fontFamily: font.semibold,
      fontSize: 15,
      lineHeight: 17,
      letterSpacing: tracking(0.08, 15),
      textTransform: 'uppercase',
    },
    tab: {
      fontFamily: font.semibold,
      fontSize: 9.5,
      lineHeight: 11,
      letterSpacing: tracking(0.14, 9.5),
      textTransform: 'uppercase',
    },
    /** plain-sentence nav affordances: Back / Cancel / Edit / Save */
    navAction: {
      fontFamily: font.medium,
      fontSize: 15,
      lineHeight: 17,
      color: colors.textMuted,
    },
    navTitle: {
      fontFamily: font.semibold,
      fontSize: 12,
      lineHeight: 14,
      letterSpacing: tracking(0.14, 12),
      color: colors.text,
      textTransform: 'uppercase',
    },
    /** the quiet caption under a sheet or form */
    caption: {
      fontFamily: font.regular,
      fontSize: 12.5,
      lineHeight: 19,
      color: colors.textDim,
    },
    note: {
      fontFamily: font.regular,
      fontSize: 13.5,
      lineHeight: 21,
      color: colors.accentTintText,
    },
  });
}

export type TextStyles = ReturnType<typeof makeText>;
