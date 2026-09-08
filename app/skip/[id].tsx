import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { Button } from '@/components/Button';
import { InfoNote } from '@/components/InfoNote';
import { SheetScreen } from '@/components/Sheet';
import { SKIP_REASONS } from '@/data/catalog';
import { useHabit, useStats, useStore } from '@/data/store';
import { themedStyles, useTheme } from '@/theme';
import { font, radius } from '@/theme/tokens';

/** Screen 2d — skip, without judgement. */
export default function Skip() {
  const { text, colors } = useTheme();
  const styles = useStyles();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { habit } = useHabit(id);
  const { streak } = useStats(habit);
  const { skip } = useStore();
  const [reason, setReason] = useState<string | undefined>();
  const [note, setNote] = useState('');

  if (!habit) return <Redirect href="/(tabs)" />;

  const onSave = () => {
    skip(habit.id, reason, note.trim() || undefined);
    router.dismissAll();
  };

  return (
    <SheetScreen onDismiss={() => router.back()}>
      <Text style={text.eyebrow}>Skipping · {habit.name}</Text>
      <Text style={[text.sheetTitle, styles.title]}>What got in the way?</Text>
      <Text style={[text.bodySm, styles.blurb]}>
        Optional. It helps us suggest a better time.
      </Text>

      <View style={styles.chips}>
        {SKIP_REASONS.map((option) => {
          const selected = option === reason;
          return (
            <Pressable
              key={option}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => setReason(selected ? undefined : option)}
              style={({ pressed }) => [
                styles.chip,
                selected && styles.chipSelected,
                pressed && styles.pressed,
              ]}
            >
              <Text style={[styles.chipLabel, selected && styles.chipLabelSelected]}>
                {option}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <TextInput
        value={note}
        onChangeText={setNote}
        placeholder="Add a line…"
        placeholderTextColor={colors.textDim}
        multiline
        style={styles.note}
      />

      <Button label="Save skip" onPress={onSave} style={styles.save} />

      <View style={styles.reassurance}>
        <InfoNote>
          {streak > 0
            ? `Your ${streak}-day streak pauses here, not ends. Come back tomorrow and you're on day ${streak + 1}.`
            : "Nothing lost today. Come back tomorrow and you're on day 1."}
        </InfoNote>
      </View>
    </SheetScreen>
  );
}

const useStyles = themedStyles(({ colors }) => ({
  title: {
    marginTop: 10,
  },
  blurb: {
    marginTop: 9,
  },
  chips: {
    marginTop: 20,
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 9,
  },
  chip: {
    backgroundColor: colors.surface,
    borderRadius: radius.full,
    paddingVertical: 12,
    paddingHorizontal: 17,
  },
  chipSelected: {
    backgroundColor: colors.accent,
  },
  chipLabel: {
    fontFamily: font.medium,
    fontSize: 14,
    lineHeight: 16,
    color: colors.textChip,
  },
  chipLabelSelected: {
    color: colors.accentInk,
  },
  pressed: {
    opacity: 0.75,
  },
  note: {
    marginTop: 16,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingVertical: 16,
    paddingHorizontal: 17,
    minHeight: 54,
    fontFamily: font.regular,
    fontSize: 14.5,
    lineHeight: 20,
    color: colors.text,
    textAlignVertical: 'top' as const,
  },
  save: {
    marginTop: 20,
  },
  reassurance: {
    marginTop: 16,
  },
}));
