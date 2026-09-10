import { useSafeAreaInsets } from 'react-native-safe-area-context';

/** The floating tab capsule's height, shared with the screens that scroll under it. */
export const TAB_BAR_HEIGHT = 64;
/** breathing room between the capsule and the home indicator */
export const TAB_BAR_MARGIN = 16;

/**
 * How much of the bottom of a tab screen the floating bar covers. Scroll
 * content pads by this so the last row can clear the glass; pinned footers
 * sit above it.
 */
export function useTabBarClearance(): number {
  const insets = useSafeAreaInsets();
  return TAB_BAR_HEIGHT + Math.max(insets.bottom, TAB_BAR_MARGIN) + 12;
}
