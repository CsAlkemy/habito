import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Modal,
  Pressable,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { Check } from './Icons';
import type { Habit } from '@/data/types';
import { nextMilestone } from '@/lib/date';
import { themedStyles, useTheme } from '@/theme';
import { alpha, mix } from '@/theme/color';
import { font, radius, resolveHabitColor, tracking } from '@/theme/tokens';

type Props = {
  habit: Habit;
  /** the streak *after* this completion */
  streak: number;
  /** true when this was the last open habit of the day */
  allDone: boolean;
  /** fired once, after the overlay has faded out or been tapped away */
  onFinish: () => void;
};

/** How long the moment lingers before it clears itself. */
const HOLD_MS = 1700;
const EXIT_MS = 220;
const CONFETTI_MS = 1300;
const PIECES = 22;

/**
 * Cycled by streak length so the words change day to day without a random
 * pick that could repeat twice in a row.
 */
const PRAISE = [
  'Nice one',
  'Done and dusted',
  'Showed up again',
  "That's the way",
  'Look at you go',
  'Another one down',
  'Kept the promise',
];

function headline(streak: number, allDone: boolean): string {
  if (allDone) return "That's everything";
  if (streak === 1) return 'Day one';
  return PRAISE[streak % PRAISE.length];
}

function subline(habit: Habit, streak: number, allDone: boolean): string {
  if (allDone) return 'Every habit closed out for today';
  if (streak === 1) return `${habit.name} · the hardest day is behind you`;
  return `${habit.name} · ${streak} days in a row`;
}

function milestoneLine(streak: number): string | null {
  const target = nextMilestone(streak);
  if (target === null) return null;
  const away = target - streak;
  return away === 1 ? `One more day to your ${target}-day milestone` : `${away} days to your ${target}-day milestone`;
}

type Piece = {
  dx: number;
  dy: number;
  spin: number;
  size: number;
  round: boolean;
  color: string;
  delay: number;
};

/**
 * A pseudo-random scatter. Seeded so every render of one celebration lays the
 * pieces out identically; a fresh mount reseeds from the clock.
 */
function scatter(seed: number, palette: string[]): Piece[] {
  let s = seed >>> 0 || 1;
  const rand = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
  return Array.from({ length: PIECES }, (_, i) => {
    // Bias the burst upward: gravity brings the pieces back down past the
    // card. Distances are long enough that most clear the card's edge.
    const angle = -Math.PI / 2 + (rand() - 0.5) * Math.PI * 1.6;
    const distance = 130 + rand() * 150;
    return {
      dx: Math.cos(angle) * distance,
      dy: Math.sin(angle) * distance,
      spin: (rand() - 0.5) * 900,
      size: 7 + rand() * 6,
      round: rand() > 0.55,
      color: palette[i % palette.length],
      delay: rand() * 120,
    };
  });
}

/**
 * The small moment after marking a habit done: a card springs in with the
 * habit's colour, a burst of confetti in matching tones, a line of praise, and
 * it clears itself. Tap anywhere to move on sooner.
 *
 * Mounted fresh for each completion; the parent renders it conditionally.
 */
export function Celebration({ habit, streak, allDone, onFinish }: Props) {
  const { colors, dark } = useTheme();
  const styles = useStyles();
  const { width, height } = useWindowDimensions();

  const habitColor = resolveHabitColor(habit.color, colors.accent);
  const palette = useMemo(
    () => [
      habitColor,
      colors.accent,
      mix(45, habitColor, '#ffffff'),
      dark ? '#ffffff' : colors.text,
      mix(35, colors.accent, habitColor),
    ],
    [habitColor, colors.accent, colors.text, dark],
  );
  const pieces = useMemo(() => scatter(Date.now(), palette), [palette]);

  const [reduceMotion, setReduceMotion] = useState<boolean | null>(null);
  const scrim = useRef(new Animated.Value(0)).current;
  const card = useRef(new Animated.Value(0)).current;
  const burst = useRef(new Animated.Value(0)).current;
  const finished = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** the tap-to-dismiss path shares the effect's exit animation */
  const finishRef = useRef<() => void>(() => {});
  // Read through a ref so a parent re-render with a new callback identity
  // does not restart the animation or the auto-dismiss timer.
  const onFinishRef = useRef(onFinish);
  onFinishRef.current = onFinish;

  useEffect(() => {
    let live = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((on) => live && setReduceMotion(on))
      .catch(() => live && setReduceMotion(false));
    return () => {
      live = false;
    };
  }, []);

  useEffect(() => {
    if (reduceMotion === null) return;

    const finish = () => {
      if (finished.current) return;
      finished.current = true;
      Animated.parallel([
        Animated.timing(scrim, {
          toValue: 0,
          duration: EXIT_MS,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(card, {
          toValue: 0,
          duration: EXIT_MS,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start(() => onFinishRef.current());
    };
    finishRef.current = finish;

    Animated.timing(scrim, {
      toValue: 1,
      duration: 180,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();

    if (reduceMotion) {
      Animated.timing(card, { toValue: 1, duration: 180, useNativeDriver: true }).start();
    } else {
      Animated.spring(card, {
        toValue: 1,
        damping: 14,
        stiffness: 220,
        mass: 0.9,
        useNativeDriver: true,
      }).start();
      Animated.timing(burst, {
        toValue: 1,
        duration: CONFETTI_MS,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    }

    timer.current = setTimeout(finish, HOLD_MS);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [reduceMotion, scrim, card, burst]);

  const cardScale = card.interpolate({ inputRange: [0, 1], outputRange: [0.82, 1] });
  const cardOpacity = card.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, 1, 1] });
  const tileScale = card.interpolate({ inputRange: [0, 0.6, 1], outputRange: [0.4, 1.12, 1] });

  const milestone = milestoneLine(streak);

  return (
    <Modal
      transparent
      visible
      animationType="none"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={() => finishRef.current()}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Continue"
        style={styles.root}
        onPress={() => finishRef.current()}
      >
        <Animated.View style={[styles.scrim, { opacity: scrim }]} />

        {/* The card first, the burst after it: pieces fly out over the card. */}

        <Animated.View
          accessibilityLiveRegion="polite"
          accessibilityRole="alert"
          style={[
            styles.card,
            { maxWidth: Math.min(width - 48, 340), opacity: cardOpacity, transform: [{ scale: cardScale }] },
          ]}
        >
          <Animated.View
            style={[
              styles.tile,
              { backgroundColor: habitColor, shadowColor: habitColor, transform: [{ scale: tileScale }] },
            ]}
          >
            <Check color={mix(22, '#000000', habitColor)} width={26} />
          </Animated.View>

          <Text style={styles.eyebrow}>{allDone ? 'Day complete' : 'Marked done'}</Text>
          <Text style={styles.headline}>{headline(streak, allDone)}</Text>
          <Text style={styles.sub}>{subline(habit, streak, allDone)}</Text>

          {milestone && (
            <View style={[styles.chip, { backgroundColor: alpha(habitColor, dark ? 0.16 : 0.18) }]}>
              <Text style={[styles.chipLabel, { color: dark ? mix(30, habitColor, '#ffffff') : mix(45, habitColor, '#000000') }]}>
                {milestone}
              </Text>
            </View>
          )}
        </Animated.View>

        {!reduceMotion && (
          <View pointerEvents="none" style={styles.burstOrigin}>
            {pieces.map((piece, i) => {
              // Each piece runs on the shared clock with its own head start,
              // so the burst reads as a puff rather than a single frame.
              const start = piece.delay / CONFETTI_MS;
              const t = burst.interpolate({
                inputRange: [0, start, 1],
                outputRange: [0, 0, 1],
              });
              const translateX = t.interpolate({ inputRange: [0, 1], outputRange: [0, piece.dx] });
              const translateY = t.interpolate({
                inputRange: [0, 0.55, 1],
                outputRange: [0, piece.dy * 0.85, piece.dy + 120],
              });
              const rotate = t.interpolate({
                inputRange: [0, 1],
                outputRange: ['0deg', `${piece.spin}deg`],
              });
              const opacity = t.interpolate({
                inputRange: [0, 0.05, 0.7, 1],
                outputRange: [0, 1, 1, 0],
              });
              const scale = t.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0.3, 1, 0.85] });
              return (
                <Animated.View
                  key={i}
                  style={{
                    position: 'absolute',
                    width: piece.size,
                    height: piece.round ? piece.size : piece.size * 1.7,
                    borderRadius: piece.round ? piece.size / 2 : 2,
                    backgroundColor: piece.color,
                    opacity,
                    transform: [{ translateX }, { translateY }, { rotate }, { scale }],
                  }}
                />
              );
            })}
          </View>
        )}

        {/* keeps the layout centred whatever the device height */}
        <View style={{ height: height * 0.04 }} />
      </Pressable>
    </Modal>
  );
}

const useStyles = themedStyles(({ colors, dark }) => ({
  root: {
    flex: 1,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  scrim: {
    position: 'absolute' as const,
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: dark ? 'rgba(0, 0, 0, 0.62)' : 'rgba(20, 20, 23, 0.42)',
  },
  burstOrigin: {
    position: 'absolute' as const,
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  card: {
    alignSelf: 'center' as const,
    alignItems: 'center' as const,
    backgroundColor: colors.elevated,
    borderRadius: radius.panel,
    paddingTop: 28,
    paddingBottom: 26,
    paddingHorizontal: 26,
    borderWidth: 1,
    borderColor: dark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.9)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: dark ? 0.6 : 0.18,
    shadowRadius: 32,
    elevation: 20,
  },
  tile: {
    width: 64,
    height: 64,
    borderRadius: radius.card,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: dark ? 0.45 : 0.3,
    shadowRadius: 18,
    elevation: 8,
  },
  eyebrow: {
    marginTop: 20,
    fontFamily: font.semibold,
    fontSize: 11,
    lineHeight: 13,
    letterSpacing: tracking(0.16, 11),
    color: colors.textDim,
    textTransform: 'uppercase' as const,
  },
  headline: {
    marginTop: 8,
    fontFamily: font.semibold,
    fontSize: 26,
    lineHeight: 30,
    letterSpacing: -0.2,
    color: colors.text,
    textAlign: 'center' as const,
    textTransform: 'uppercase' as const,
  },
  sub: {
    marginTop: 8,
    fontFamily: font.regular,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textMuted,
    textAlign: 'center' as const,
  },
  chip: {
    marginTop: 16,
    borderRadius: radius.full,
    paddingVertical: 9,
    paddingHorizontal: 14,
  },
  chipLabel: {
    fontFamily: font.semibold,
    fontSize: 11.5,
    lineHeight: 14,
    letterSpacing: tracking(0.06, 11.5),
    textTransform: 'uppercase' as const,
  },
}));
