import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Modal, Pressable, View, useWindowDimensions } from 'react-native';
import type { DimensionValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { themedStyles } from '@/theme';
import { radius } from '@/theme/tokens';

type Props = {
  visible: boolean;
  onDismiss: () => void;
  /** how much of the screen the sheet may take; content beyond that scrolls */
  maxHeight?: DimensionValue;
  children: React.ReactNode;
};

/**
 * A bottom drawer over the current screen. The Modal itself never animates:
 * its built-in slide snaps the backdrop in and out, which reads as a flicker.
 * Instead the modal mounts instantly and transparent, and we drive the scrim
 * fade and the sheet's spring ourselves.
 */
export function BottomSheet({ visible, onDismiss, maxHeight = '70%', children }: Props) {
  const insets = useSafeAreaInsets();
  const { height: screenHeight } = useWindowDimensions();
  const styles = useStyles();

  const [mounted, setMounted] = useState(visible);
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setMounted(true);
      Animated.spring(progress, {
        toValue: 1,
        damping: 26,
        stiffness: 260,
        mass: 1,
        overshootClamping: true,
        useNativeDriver: true,
      }).start();
      return;
    }
    Animated.timing(progress, {
      toValue: 0,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) setMounted(false);
    });
  }, [visible, progress]);

  const translateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [screenHeight, 0],
  });

  return (
    <Modal
      visible={mounted}
      transparent
      animationType="none"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onDismiss}
    >
      <View style={styles.root}>
        <Animated.View style={[styles.backdrop, { opacity: progress }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Dismiss"
            style={styles.backdropTap}
            onPress={onDismiss}
          />
        </Animated.View>

        <Animated.View
          style={[
            styles.sheet,
            {
              maxHeight,
              paddingBottom: Math.max(insets.bottom, 20) + 4,
              transform: [{ translateY }],
            },
          ]}
        >
          <View style={styles.grabber} />
          {children}
        </Animated.View>
      </View>
    </Modal>
  );
}

const useStyles = themedStyles(({ colors, dark, sheetShadow }) => ({
  root: {
    flex: 1,
    justifyContent: 'flex-end' as const,
  },
  backdrop: {
    position: 'absolute' as const,
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: dark ? 'rgba(0, 0, 0, 0.6)' : 'rgba(20, 20, 23, 0.4)',
  },
  backdropTap: {
    flex: 1,
  },
  sheet: {
    backgroundColor: colors.elevated,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    // A hairline where the sheet meets the scrim keeps the curve crisp on
    // light grounds, where the sheet and the dimmed page are close in tone.
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: dark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.9)',
    // Pull the side borders off-screen so only the curve shows them.
    marginHorizontal: -1,
    paddingTop: 12,
    paddingHorizontal: 23,
    ...sheetShadow,
  },
  grabber: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.dashed,
    alignSelf: 'center' as const,
    marginBottom: 20,
  },
}));
