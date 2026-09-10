import { BlurTargetView, BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Tabs, type BottomTabBarProps } from 'expo-router/js-tabs';
import { useEffect, useRef, useState } from 'react';
import { Animated, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import type { RefObject } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ProgressIcon, TodayIcon, YouIcon } from '@/components/Icons';
import { themedStyles, useTheme } from '@/theme';
import { alpha } from '@/theme/color';
import { TAB_BAR_HEIGHT, TAB_BAR_MARGIN } from '@/lib/tabBar';
import { font, GUTTER, radius } from '@/theme/tokens';

const ICONS = {
  index: TodayIcon,
  progress: ProgressIcon,
  you: YouIcon,
} as const;

const LABELS = {
  index: 'Today',
  progress: 'Progress',
  you: 'You',
} as const;

type TabName = keyof typeof ICONS;

function isTabName(name: string): name is TabName {
  return name in ICONS;
}

type BlurTarget = RefObject<View | null>;

/**
 * Real blur needs Android 12's RenderNode API; expo-blur falls back to a plain
 * translucent view below that, which over scrolling content reads as a smear.
 * Those devices get the near-opaque wash instead.
 */
const ANDROID_CAN_BLUR = Platform.OS === 'android' && Number(Platform.Version) >= 31;
const HAS_BLUR = Platform.OS !== 'android' || ANDROID_CAN_BLUR;

/**
 * iOS gets Apple's thinnest material — heavy blur, barely any tint, the
 * Control Centre look. Android and web emulate every tint with a flat colour
 * over the blur, and their stand-in for the light material is three-quarters
 * opaque, so they use the tints whose overlays are actually thin.
 */
const GLASS_TINT = {
  light: Platform.OS === 'ios' ? 'systemUltraThinMaterialLight' : 'default',
  dark: 'systemUltraThinMaterialDark',
} as const;

/**
 * One piece of glass: blur, a thin translucent wash, a sheen that brightens
 * the upper half, a bright rim and a top hairline highlight, clipped to a
 * capsule. The bar floats over the scrolling screen, so there is real content
 * behind it to blur. iOS blurs whatever is behind it for free; Android has to
 * be told what to blur, so the tab layout wraps the whole scene in a
 * BlurTargetView and hands the ref down here.
 */
function Glass({
  children,
  style,
  blurTarget,
}: {
  children: React.ReactNode;
  style?: object;
  blurTarget: BlurTarget;
}) {
  const { dark } = useTheme();
  const styles = useStyles();
  return (
    <View style={[styles.glass, style]}>
      {HAS_BLUR && (
        <BlurView
          intensity={Platform.OS === 'ios' ? 80 : 60}
          tint={GLASS_TINT[dark ? 'dark' : 'light']}
          blurMethod="dimezisBlurViewSdk31Plus"
          blurTarget={blurTarget}
          style={StyleSheet.absoluteFill}
        />
      )}
      <View pointerEvents="none" style={styles.wash} />
      <LinearGradient
        pointerEvents="none"
        colors={
          dark
            ? ['rgba(255, 255, 255, 0.07)', 'rgba(255, 255, 255, 0.015)', 'rgba(255, 255, 255, 0)']
            : ['rgba(255, 255, 255, 0.26)', 'rgba(255, 255, 255, 0.04)', 'rgba(255, 255, 255, 0)']
        }
        locations={[0, 0.45, 1]}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        pointerEvents="none"
        // a faint shade gathering at the bottom edge reads as thickness
        colors={['rgba(0, 0, 0, 0)', dark ? 'rgba(0, 0, 0, 0.18)' : 'rgba(0, 0, 0, 0.08)']}
        locations={[0.6, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View pointerEvents="none" style={styles.topLine} />
      {children}
    </View>
  );
}

/**
 * A tab's icon and label, drawn twice — dim and bright — and crossfaded, so
 * the selection change eases instead of snapping. SVG stroke colours cannot be
 * animated directly without a worklet library, so two layers it is.
 */
function TabFace({ name, focus }: { name: TabName; focus: Animated.Value }) {
  const { colors } = useTheme();
  const styles = useStyles();
  const Icon = ICONS[name];
  const fade = focus.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });
  return (
    <View style={styles.face}>
      <Animated.View style={[styles.faceLayer, { opacity: fade }]}>
        <Icon color={colors.textDim} size={23} />
        <Text style={[styles.tabLabel, { color: colors.textDim }]}>{LABELS[name]}</Text>
      </Animated.View>
      <Animated.View style={[styles.faceLayer, { opacity: focus }]}>
        <Icon color={colors.text} size={23} />
        <Text style={[styles.tabLabel, { color: colors.text }]}>{LABELS[name]}</Text>
      </Animated.View>
    </View>
  );
}

/**
 * Liquid-glass navigation: a floating capsule of tabs — each an icon over its
 * label — where the active tab sits in a lighter glass pill, plus a detached
 * round glass button for the app's one primary action, adding a habit.
 *
 * The pill is a single view that springs between slots rather than one per
 * tab toggled on and off, which is what makes the change feel physical.
 */
function TabBar({ state, navigation, blurTarget }: BottomTabBarProps & { blurTarget: BlurTarget }) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const styles = useStyles();

  const tabs = state.routes.filter((route) => isTabName(route.name));
  const activeTab = Math.max(0, tabs.findIndex((route) => route.key === state.routes[state.index]?.key));

  const [slotWidth, setSlotWidth] = useState(0);
  const position = useRef(new Animated.Value(activeTab)).current;
  const focus = useRef(tabs.map((_, i) => new Animated.Value(i === activeTab ? 1 : 0))).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(position, {
        toValue: activeTab,
        damping: 22,
        stiffness: 240,
        mass: 0.8,
        useNativeDriver: true,
      }),
      ...focus.map((value, i) =>
        Animated.timing(value, {
          toValue: i === activeTab ? 1 : 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ),
    ]).start();
  }, [activeTab, position, focus]);

  const pillX = Animated.multiply(position, slotWidth + TAB_GAP);

  return (
    <View style={[styles.shell, { bottom: Math.max(insets.bottom, TAB_BAR_MARGIN) }]}>
      <View style={[styles.shadow, styles.flex]}>
        <Glass style={styles.flex} blurTarget={blurTarget}>
          <View
            style={styles.row}
            onLayout={(event) => {
              const inner = event.nativeEvent.layout.width - ROW_PADDING * 2;
              setSlotWidth((inner - TAB_GAP * (tabs.length - 1)) / tabs.length);
            }}
          >
            {slotWidth > 0 && (
              <Animated.View
                pointerEvents="none"
                style={[styles.pill, { width: slotWidth, transform: [{ translateX: pillX }] }]}
              />
            )}
            {tabs.map((route, index) => {
              if (!isTabName(route.name)) return null;
              const focused = index === activeTab;
              const onPress = () => {
                const event = navigation.emit({
                  type: 'tabPress',
                  target: route.key,
                  canPreventDefault: true,
                });
                if (!focused && !event.defaultPrevented) {
                  navigation.navigate(route.name);
                }
              };
              return (
                <Pressable
                  key={route.key}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: focused }}
                  accessibilityLabel={LABELS[route.name]}
                  onPress={onPress}
                  style={({ pressed }) => [styles.tab, pressed && !focused && styles.tabPressed]}
                >
                  <TabFace name={route.name} focus={focus[index]} />
                </Pressable>
              );
            })}
          </View>
        </Glass>
      </View>

      <View style={styles.shadow}>
        <Glass blurTarget={blurTarget}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Add a habit"
            onPress={() => router.push('/habit/new')}
            style={({ pressed }) => [styles.plus, pressed && styles.pressed]}
          >
            <Text style={styles.plusGlyph}>+</Text>
          </Pressable>
        </Glass>
      </View>
    </View>
  );
}

export default function TabsLayout() {
  const { colors } = useTheme();
  // What Android's BlurView samples from. A plain View everywhere else.
  const blurTarget = useRef<View | null>(null);
  return (
    <BlurTargetView ref={blurTarget} style={styles.fill}>
      <Tabs
        tabBar={(props) => <TabBar {...props} blurTarget={blurTarget} />}
        screenOptions={{
          headerShown: false,
          sceneStyle: { backgroundColor: colors.ground },
        }}
      >
        <Tabs.Screen name="index" options={{ title: 'Today' }} />
        <Tabs.Screen name="progress" options={{ title: 'Progress' }} />
        <Tabs.Screen name="you" options={{ title: 'You' }} />
      </Tabs>
    </BlurTargetView>
  );
}

const BAR_HEIGHT = TAB_BAR_HEIGHT;
const ROW_PADDING = 5;
const TAB_GAP = 4;
/** the selection pill fills the bar minus its padding, so this is its true radius */
const PILL_RADIUS = (BAR_HEIGHT - ROW_PADDING * 2) / 2;

const styles = StyleSheet.create({
  fill: { flex: 1 },
});

const useStyles = themedStyles(({ colors, dark, chromeShadow }) => ({
  /** floats over the scene so the screen scrolls under the glass */
  shell: {
    position: 'absolute' as const,
    left: GUTTER,
    right: GUTTER,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 10,
  },
  flex: {
    flex: 1,
  },
  shadow: {
    borderRadius: radius.full,
    ...chromeShadow,
  },
  glass: {
    borderRadius: radius.full,
    overflow: 'hidden' as const,
    borderWidth: 1,
    // the crisp bright rim that sells the glass
    borderColor: dark ? 'rgba(255, 255, 255, 0.30)' : 'rgba(255, 255, 255, 0.95)',
  },
  /** no wash where there is blur — the material is the tint; near-opaque where blur is unavailable */
  wash: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: HAS_BLUR ? 'transparent' : alpha(colors.elevated, dark ? 0.94 : 0.92),
  },
  /** the specular hairline along the top edge */
  topLine: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: dark ? 'rgba(255, 255, 255, 0.28)' : 'rgba(255, 255, 255, 1)',
  },
  row: {
    height: BAR_HEIGHT,
    padding: ROW_PADDING,
    flexDirection: 'row' as const,
    gap: TAB_GAP,
  },
  tab: {
    flex: 1,
  },
  tabPressed: {
    opacity: 0.6,
  },
  face: {
    flex: 1,
  },
  faceLayer: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 4,
  },
  /** the lighter glass pill that carries the selection */
  pill: {
    position: 'absolute' as const,
    top: ROW_PADDING,
    bottom: ROW_PADDING,
    left: ROW_PADDING,
    // A concrete radius, not the 999 shorthand: Android clamps an oversized
    // radius per corner and, with a sub-pixel border, paints a rectangle.
    borderRadius: PILL_RADIUS,
    // a lighter pane of the same glass, not a solid sticker: the rim carries it
    backgroundColor: dark ? 'rgba(255, 255, 255, 0.14)' : 'rgba(255, 255, 255, 0.55)',
    borderWidth: Platform.OS === 'android' ? 1 : StyleSheet.hairlineWidth,
    borderColor: dark ? 'rgba(255, 255, 255, 0.30)' : 'rgba(255, 255, 255, 0.95)',
  },
  tabLabel: {
    fontFamily: font.medium,
    fontSize: 10.5,
    lineHeight: 12,
  },
  plus: {
    width: BAR_HEIGHT,
    height: BAR_HEIGHT,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  plusGlyph: {
    fontFamily: font.light,
    fontSize: 30,
    lineHeight: 34,
    color: colors.text,
  },
  pressed: {
    opacity: 0.7,
  },
}));
