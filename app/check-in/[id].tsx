import * as Haptics from 'expo-haptics';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Platform, Pressable, Text, TextInput, View } from 'react-native';
import { AccentTile } from '@/components/AccentTile';
import { Button } from '@/components/Button';
import { SheetScreen } from '@/components/Sheet';
import { useHabit, useStats, useStore } from '@/data/store';
import { themedStyles, useTheme } from '@/theme';
import { font, radius, tracking } from '@/theme/tokens';

/** Screen 2c — the check-in sheet. */
export default function CheckIn() {
  const { text } = useTheme();
  const styles = useStyles();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { habit, entry } = useHabit(id);
  const { streak } = useStats(habit);
  const { setValue, bumpValue, markDone, reopen } = useStore();
  const [typing, setTyping] = useState(false);
  const [draft, setDraft] = useState('');

  // Redirect rather than navigate: calling router during render is a side
  // effect React is entitled to run twice.
  if (!habit) return <Redirect href="/(tabs)" />;

  const isCounted = habit.kind === 'count' && habit.target !== undefined;
  const target = habit.target ?? 1;
  const value = entry.value;
  const ratio = Math.min(1, target === 0 ? 0 : value / target);

  // Relative, not absolute: four quick taps land in one React batch, and
  // computing `value + delta` here would make all four read the same stale
  // count and advance the counter by one.
  const bump = (delta: number) => {
    Haptics.selectionAsync().catch(() => {});
    bumpValue(habit.id, delta);
  };

  const commitTyped = () => {
    const parsed = Number.parseInt(draft, 10);
    if (Number.isFinite(parsed)) setValue(habit.id, Math.min(target, Math.max(0, parsed)));
    setTyping(false);
  };

  // Partial report: taps already wrote the value through to the DB, so this
  // just acknowledges and closes without forcing a done/skip decision.
  const onSaveProgress = () => {
    Haptics.selectionAsync().catch(() => {});
    router.back();
  };

  const onDone = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    const milestone = markDone(habit.id);
    if (milestone !== null) {
      router.replace(`/milestone?habit=${habit.id}&count=${milestone}`);
    } else {
      router.back();
    }
  };

  return (
    <SheetScreen onDismiss={() => router.back()}>
      <Text style={text.eyebrow}>{isCounted ? 'Daily target' : "Today's milestone"}</Text>
      <Text style={[text.sheetTitle, styles.title]}>{habit.name}</Text>
      <Text style={[text.bodySm, styles.meta]}>
        {isCounted ? `${target} ${habit.unit} · ` : ''}
        {streak}-day streak
      </Text>

      {isCounted ? (
        <>
          <View style={styles.counter}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Remove one ${habit.unit}`}
              onPress={() => bump(-1)}
              style={({ pressed }) => [styles.stepper, styles.stepperMinus, pressed && styles.pressed]}
            >
              <Text style={styles.minusGlyph}>−</Text>
            </Pressable>

            <Pressable
              style={styles.readout}
              accessibilityRole="adjustable"
              accessibilityLabel={`${value} of ${target} ${habit.unit}`}
              accessibilityHint="Long press to type a number"
              onLongPress={() => {
                setDraft(String(value));
                setTyping(true);
              }}
            >
              {typing ? (
                <TextInput
                  autoFocus
                  keyboardType="number-pad"
                  value={draft}
                  onChangeText={setDraft}
                  onBlur={commitTyped}
                  onSubmitEditing={commitTyped}
                  returnKeyType="done"
                  style={styles.readoutInput}
                />
              ) : (
                <Text style={styles.readoutValue}>
                  {value}
                  <Text style={styles.readoutTarget}> / {target}</Text>
                </Text>
              )}
              <Text style={styles.readoutUnit}>{habit.unit}</Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Add one ${habit.unit}`}
              onPress={() => bump(1)}
              style={({ pressed }) => [pressed && styles.pressed]}
            >
              <AccentTile r={radius.card} style={styles.stepper}>
                <View style={styles.stepperInner}>
                  <Text style={styles.plusGlyph}>+</Text>
                </View>
              </AccentTile>
            </Pressable>
          </View>

          <View style={styles.track}>
            <View style={[styles.trackFill, { width: `${ratio * 100}%` }]} />
          </View>
        </>
      ) : habit.goal ? (
        <View style={styles.goal}>
          <Text style={styles.goalText}>{habit.goal}</Text>
        </View>
      ) : null}

      {entry.status === 'done' ? (
        // Forgiveness path: a mistaken tap should be one tap to take back.
        <View style={styles.actions}>
          <Button
            label="Undo · marked done"
            variant="secondary"
            onPress={() => {
              Haptics.selectionAsync().catch(() => {});
              reopen(habit.id);
            }}
          />
        </View>
      ) : (
        <View style={styles.actions}>
          <Button label="Mark done" onPress={onDone} />
          <Button
            label="Skip"
            variant="secondary"
            fill={false}
            onPress={() => router.replace(`/skip/${habit.id}`)}
          />
        </View>
      )}

      {isCounted && value > 0 && value < target && (
        <Button
          label={`Save progress · ${value}/${target}`}
          variant="secondary"
          onPress={onSaveProgress}
          style={styles.saveProgress}
        />
      )}

      {isCounted && (
        <Text style={[text.caption, styles.hint]}>
          {Platform.OS === 'web' ? 'Click and hold' : 'Long-press'} the counter to type a number
        </Text>
      )}
    </SheetScreen>
  );
}

const useStyles = themedStyles(({ colors }) => ({
  title: {
    marginTop: 10,
  },
  meta: {
    marginTop: 5,
  },
  counter: {
    marginTop: 26,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 16,
  },
  stepper: {
    width: 58,
    height: 58,
    borderRadius: radius.card,
  },
  stepperMinus: {
    backgroundColor: colors.surface,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  stepperInner: {
    width: 58,
    height: 58,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  minusGlyph: {
    fontFamily: font.light,
    fontSize: 28,
    lineHeight: 32,
    color: colors.textSecondary,
  },
  plusGlyph: {
    fontFamily: font.light,
    fontSize: 30,
    lineHeight: 34,
    color: colors.accentInk,
  },
  readout: {
    flex: 1,
    alignItems: 'center' as const,
  },
  readoutValue: {
    fontFamily: font.semibold,
    fontSize: 54,
    lineHeight: 56,
    letterSpacing: -1.6,
    color: colors.text,
  },
  readoutTarget: {
    fontFamily: font.regular,
    fontSize: 22,
    color: colors.textDim,
  },
  readoutInput: {
    fontFamily: font.semibold,
    fontSize: 54,
    lineHeight: 56,
    color: colors.text,
    textAlign: 'center' as const,
    minWidth: 120,
    padding: 0,
  },
  readoutUnit: {
    marginTop: 4,
    fontFamily: font.medium,
    fontSize: 11,
    lineHeight: 13,
    letterSpacing: tracking(0.16, 11),
    color: colors.textDim,
    textTransform: 'uppercase' as const,
  },
  track: {
    marginTop: 24,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.surface,
    overflow: 'hidden' as const,
  },
  trackFill: {
    height: '100%' as const,
    borderRadius: 5,
    backgroundColor: colors.accent,
  },
  goal: {
    marginTop: 22,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: 17,
  },
  goalText: {
    fontFamily: font.medium,
    fontSize: 15,
    lineHeight: 21,
    color: colors.text,
  },
  actions: {
    marginTop: 24,
    flexDirection: 'row' as const,
    gap: 10,
  },
  saveProgress: {
    marginTop: 10,
  },
  hint: {
    marginTop: 14,
    textAlign: 'center' as const,
  },
  pressed: {
    opacity: 0.75,
  },
}));
