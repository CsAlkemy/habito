import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { AccentTile } from '@/components/AccentTile';
import { Button, TextAction } from '@/components/Button';
import { TimeField } from '@/components/TimeField';
import { Check } from '@/components/Icons';
import { Screen } from '@/components/Screen';
import { useStore } from '@/data/store';
import type { Schedule } from '@/data/types';
import { themedStyles, useTheme } from '@/theme';
import { ACCENT_FOLLOW, font, radius } from '@/theme/tokens';

/**
 * Guided setup. The design drew step 2 of 3; the other two are what make the
 * flow honest — the app needs a name to greet the user by and a first habit to
 * open onto, and neither can be invented for them.
 */

const CADENCES: { id: Schedule; title: string; sub: string }[] = [
  { id: 'some', title: 'A few times a week', sub: 'Show up when you can' },
  { id: 'daily', title: 'Every day', sub: 'Best for building a streak' },
  { id: 'weekdays', title: 'Weekdays only', sub: 'Mon to Fri' },
];

const SUGGESTIONS = ['Morning run', 'Drink water', 'Read before bed', 'Stretch'];

const TOTAL_STEPS = 3;

export default function Onboarding() {
  const router = useRouter();
  const { completeOnboarding } = useStore();
  const { text, colors } = useTheme();
  const styles = useStyles();

  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [cadence, setCadence] = useState<Schedule>('daily');
  const [habitName, setHabitName] = useState('');
  const [reminder, setReminder] = useState('08:00');

  const trimmedName = name.trim();
  const trimmedHabit = habitName.trim();
  const canContinue =
    step === 1 ? trimmedName.length > 0 : step === 2 ? true : trimmedHabit.length > 0;

  const onContinue = () => {
    if (!canContinue) return;
    if (step < TOTAL_STEPS) {
      setStep(step + 1);
      return;
    }
    completeOnboarding(trimmedName, {
      id: `${trimmedHabit.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}`,
      name: trimmedHabit,
      kind: 'streak',
      color: ACCENT_FOLLOW,
      schedule: cadence,
      reminder: reminder || undefined,
    });
    router.replace('/(tabs)');
  };

  const onBack = () => setStep(step - 1);

  return (
    <Screen topExtra={20} style={styles.screen}>
      <View style={styles.steps}>
        {Array.from({ length: TOTAL_STEPS }, (_, i) => (
          <View
            key={i}
            style={[styles.step, { backgroundColor: i < step ? colors.accent : colors.surface }]}
          />
        ))}
      </View>

      <Text style={[text.eyebrow, styles.eyebrow]}>
        Step {step} of {TOTAL_STEPS}
      </Text>

      {step === 1 && (
        <>
          <Text style={[text.screenTitleLg, styles.title]}>What should we call you?</Text>
          <Text style={[text.body, styles.blurb]}>
            Only used to say hello. It never leaves this device.
          </Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Your name"
            placeholderTextColor={colors.textDim}
            autoFocus
            autoCapitalize="words"
            returnKeyType="next"
            onSubmitEditing={onContinue}
            style={styles.input}
          />
        </>
      )}

      {step === 2 && (
        <>
          <Text style={[text.screenTitleLg, styles.title]}>How often do you want to show up?</Text>
          <Text style={[text.body, styles.blurb]}>
            We&rsquo;ll turn this into your first habit. You can change everything later.
          </Text>
          <View style={styles.options}>
            {CADENCES.map((option) => {
              const isSelected = option.id === cadence;
              const body = (
                <View style={styles.optionInner}>
                  <View
                    style={[
                      styles.radio,
                      isSelected
                        ? styles.radioOn
                        : { borderWidth: 1.5, borderColor: colors.ringAlt },
                    ]}
                  >
                    {isSelected && <Check color={colors.accent} width={11} />}
                  </View>
                  <View style={styles.optionText}>
                    <Text style={[text.cardTitleLg, isSelected && { color: colors.accentInk }]}>
                      {option.title}
                    </Text>
                    <Text
                      style={[
                        text.cardSubLg,
                        styles.optionSub,
                        isSelected && { color: colors.accentInkMuted },
                      ]}
                    >
                      {option.sub}
                    </Text>
                  </View>
                </View>
              );

              return (
                <Pressable
                  key={option.id}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: isSelected }}
                  onPress={() => setCadence(option.id)}
                  style={({ pressed }) => pressed && styles.pressed}
                >
                  {isSelected ? (
                    <AccentTile r={radius.card}>{body}</AccentTile>
                  ) : (
                    <View style={styles.optionPlain}>{body}</View>
                  )}
                </Pressable>
              );
            })}
          </View>
        </>
      )}

      {step === 3 && (
        <>
          <Text style={[text.screenTitleLg, styles.title]}>What&rsquo;s the first one?</Text>
          <Text style={[text.body, styles.blurb]}>
            Start with something small enough that a bad day can&rsquo;t stop it.
          </Text>
          <TextInput
            value={habitName}
            onChangeText={setHabitName}
            placeholder="Name your habit"
            placeholderTextColor={colors.textDim}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={onContinue}
            style={styles.input}
          />
          <View style={styles.chips}>
            {SUGGESTIONS.map((suggestion) => (
              <Pressable
                key={suggestion}
                accessibilityRole="button"
                onPress={() => setHabitName(suggestion)}
                style={({ pressed }) => [styles.chip, pressed && styles.pressed]}
              >
                <Text style={styles.chipLabel}>{suggestion}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={[text.label, styles.fieldLabel]}>Remind me at</Text>
          <TimeField
            value={reminder}
            onChange={setReminder}
            style={styles.timeField}
            fieldStyle={styles.timeInput}
            textStyle={styles.timeValue}
          />
        </>
      )}

      <View style={styles.spacer} />

      <View style={styles.footer}>
        {step > 1 && <TextAction label="Back" onPress={onBack} style={styles.back} />}
        <Button
          label={step === TOTAL_STEPS ? 'Start' : 'Continue'}
          onPress={onContinue}
          disabled={!canContinue}
          style={styles.continue}
        />
      </View>
    </Screen>
  );
}

const useStyles = themedStyles(({ colors }) => ({
  screen: {
    paddingHorizontal: 22,
  },
  steps: {
    flexDirection: 'row' as const,
    gap: 6,
  },
  step: {
    flex: 1,
    height: 3,
    borderRadius: 2,
  },
  eyebrow: {
    marginTop: 32,
  },
  title: {
    marginTop: 14,
  },
  blurb: {
    marginTop: 12,
  },
  input: {
    marginTop: 26,
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    paddingVertical: 18,
    paddingHorizontal: 18,
    fontFamily: font.semibold,
    fontSize: 17,
    color: colors.text,
  },
  timeField: {
    marginTop: 10,
    alignSelf: 'flex-start' as const,
  },
  timeInput: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    paddingVertical: 18,
    paddingHorizontal: 18,
    minWidth: 120,
  },
  timeValue: {
    fontFamily: font.semibold,
    fontSize: 17,
    color: colors.text,
  },
  fieldLabel: {
    marginTop: 26,
  },
  chips: {
    marginTop: 12,
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 8,
  },
  chip: {
    backgroundColor: colors.surface,
    borderRadius: radius.full,
    paddingVertical: 10,
    paddingHorizontal: 15,
  },
  chipLabel: {
    fontFamily: font.medium,
    fontSize: 13,
    lineHeight: 16,
    color: colors.textSub,
  },
  options: {
    marginTop: 26,
    gap: 10,
  },
  optionPlain: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
  },
  optionInner: {
    paddingVertical: 17,
    paddingHorizontal: 18,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 14,
  },
  optionText: {
    flex: 1,
  },
  optionSub: {
    marginTop: 2,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 999,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  radioOn: {
    backgroundColor: colors.ground,
  },
  pressed: {
    opacity: 0.85,
  },
  spacer: {
    flex: 1,
    minHeight: 24,
  },
  footer: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 12,
  },
  back: {
    paddingVertical: 18,
    paddingHorizontal: 6,
  },
  continue: {
    paddingVertical: 20,
  },
}));
