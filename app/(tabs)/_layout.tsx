import { BlurView } from 'expo-blur';
import { Tabs, type BottomTabBarProps } from 'expo-router/js-tabs';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AccentTile } from '@/components/AccentTile';
import { ProgressIcon, TodayIcon, YouIcon } from '@/components/Icons';
import { themedStyles, useTheme } from '@/theme';
import { alpha } from '@/theme/color';
import { GUTTER, radius } from '@/theme/tokens';

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
 * The tab bar floats as a glass capsule in the spirit of Apple's Liquid Glass:
 * a blurred, translucent material with a bright rim and a hairline top
 * highlight, the active tab filled by the accent gradient. Android's BlurView
 * needs a BlurTargetView wrapping the whole scene, so it gets a near-opaque
 * translucent fallback instead of a real blur.
 */
function TabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { colors, dark } = useTheme();
  const styles = useStyles();

  const row = (
    <View style={styles.row}>
      {state.routes.map((route, index) => {
        if (!isTabName(route.name)) return null;

        const focused = state.index === index;
        const Icon = ICONS[route.name];
        const tint = focused ? colors.accentInk : colors.textDim;

        const body = (
          <View style={styles.tabInner}>
            <Icon color={tint} />
            <Text style={[styles.tabLabel, { color: tint }]}>{LABELS[route.name]}</Text>
          </View>
        );

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
            {focused ? (
              <AccentTile r={radius.full} flat>
                {body}
              </AccentTile>
            ) : (
              body
            )}
          </Pressable>
        );
      })}
    </View>
  );

  return (
    <View style={[styles.shell, { marginBottom: Math.max(insets.bottom, 16) }]}>
      <View style={styles.clip}>
        {Platform.OS !== 'android' && (
          <BlurView
            intensity={dark ? 40 : 55}
            tint={dark ? 'dark' : 'light'}
            style={StyleSheet.absoluteFill}
          />
        )}
        <View pointerEvents="none" style={styles.wash} />
        <View pointerEvents="none" style={styles.topHighlight} />
        {row}
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

const useStyles = themedStyles(({ colors, dark, chromeShadow, text }) => ({
  shell: {
    marginTop: 12,
    marginHorizontal: GUTTER,
    borderRadius: radius.full,
    ...chromeShadow,
  },
  clip: {
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
  topHighlight: {
    position: 'absolute' as const,
    top: 0,
    left: 12,
    right: 12,
    height: 1,
    backgroundColor: dark ? 'rgba(255, 255, 255, 0.22)' : 'rgba(255, 255, 255, 0.95)',
  },
  row: {
    padding: 8,
    flexDirection: 'row' as const,
    gap: 6,
  },
  tab: {
    flex: 1,
  },
  tabInner: {
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 5,
    paddingVertical: 11,
    borderRadius: radius.full,
  },
  tabLabel: {
    ...text.tab,
  },
}));
