import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import { Tabs, type BottomTabBarProps } from 'expo-router/js-tabs';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ProgressIcon, TodayIcon, YouIcon } from '@/components/Icons';
import { themedStyles, useTheme } from '@/theme';
import { alpha } from '@/theme/color';
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

/**
 * One piece of glass: blur (where available), a translucent wash, a bright rim
 * and a top hairline highlight, clipped to a capsule. Android's BlurView needs
 * a BlurTargetView wrapping the whole scene, so it gets a near-opaque wash.
 */
function Glass({ children, style }: { children: React.ReactNode; style?: object }) {
  const { dark } = useTheme();
  const styles = useStyles();
  return (
    <View style={[styles.glass, style]}>
      {Platform.OS !== 'android' && (
        <BlurView
          intensity={dark ? 40 : 55}
          tint={dark ? 'dark' : 'light'}
          style={StyleSheet.absoluteFill}
        />
      )}
      <View pointerEvents="none" style={styles.wash} />
      {children}
    </View>
  );
}

/**
 * Liquid-glass navigation: a floating capsule of tabs — each an icon over its
 * label — where the active tab sits in a lighter glass pill, plus a detached
 * round glass button for the app's one primary action, adding a habit.
 */
function TabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useStyles();

  return (
    <View style={[styles.shell, { marginBottom: Math.max(insets.bottom, 16) }]}>
      <View style={[styles.shadow, styles.flex]}>
        <Glass style={styles.flex}>
          <View style={styles.row}>
            {state.routes.map((route, index) => {
              if (!isTabName(route.name)) return null;

              const focused = state.index === index;
              const Icon = ICONS[route.name];
              const tint = focused ? colors.text : colors.textDim;

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
                  style={styles.tab}
                >
                  <View style={[styles.tabInner, focused && styles.tabPill]}>
                    <Icon color={tint} size={23} />
                    <Text style={[styles.tabLabel, { color: tint }]}>{LABELS[route.name]}</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </Glass>
      </View>

      <View style={styles.shadow}>
        <Glass>
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
  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: colors.ground },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Today' }} />
      <Tabs.Screen name="progress" options={{ title: 'Progress' }} />
      <Tabs.Screen name="you" options={{ title: 'You' }} />
    </Tabs>
  );
}

const BAR_HEIGHT = 64;

const useStyles = themedStyles(({ colors, dark, chromeShadow }) => ({
  shell: {
    marginTop: 12,
    marginHorizontal: GUTTER,
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
    borderWidth: StyleSheet.hairlineWidth,
    // the bright rim that sells the glass
    borderColor: dark ? 'rgba(255, 255, 255, 0.14)' : 'rgba(255, 255, 255, 0.85)',
  },
  /** translucent wash over the blur; near-opaque where blur is unavailable */
  wash: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor:
      Platform.OS === 'android'
        ? alpha(colors.elevated, dark ? 0.94 : 0.92)
        : alpha(colors.elevated, dark ? 0.55 : 0.45),
  },
  row: {
    height: BAR_HEIGHT,
    padding: 5,
    flexDirection: 'row' as const,
    gap: 4,
  },
  tab: {
    flex: 1,
  },
  tabInner: {
    flex: 1,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 4,
    borderRadius: radius.full,
  },
  /** the lighter glass pill that carries the selection */
  tabPill: {
    backgroundColor: dark ? 'rgba(255, 255, 255, 0.13)' : 'rgba(255, 255, 255, 0.9)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: dark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 1)',
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
