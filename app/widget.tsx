import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { NavHeader } from '@/components/NavHeader';
import { RadialBackdrop } from '@/components/RadialBackdrop';
import { Screen } from '@/components/Screen';
import { Toggle } from '@/components/Toggle';
import { WidgetPreview } from '@/components/WidgetPreview';
import { useStore } from '@/data/store';
import {
  type WidgetConfig,
  type WidgetTint,
  WIDGET_LABEL_MAX,
  WIDGET_STYLES,
  widgetCapacity,
} from '@/lib/widget';
import { ThemeScope, themedStyles, useTheme } from '@/theme';
import { font, radius } from '@/theme/tokens';

const TINTS: { id: WidgetTint; label: string }[] = [
  { id: 'accent', label: 'Accent' },
  { id: 'neutral', label: 'Neutral' },
];

/**
 * The widget editor: design what the home-screen widget shows, with the result
 * drawn live at the top. Edits are a draft until Save, matching the habit form.
 * The saved config feeds the widget snapshot — see `src/lib/widget.ts`.
 */
export default function WidgetEditor() {
  const router = useRouter();
  const { habits, widgetConfig, setWidgetConfig } = useStore();
  const { text, colors } = useTheme();
  const styles = useStyles();
  const [draft, setDraft] = useState<WidgetConfig>(widgetConfig);

  const update = (patch: Partial<WidgetConfig>) => setDraft((d) => ({ ...d, ...patch }));
  const capacity = widgetCapacity(draft.style);
  const single = capacity === 1;
  const full = draft.habitIds.length >= capacity;

  const toggleHabit = (id: string) => {
    const has = draft.habitIds.includes(id);
    if (single) return update({ habitIds: has ? [] : [id] });
    if (has) return update({ habitIds: draft.habitIds.filter((h) => h !== id) });
    if (!full) update({ habitIds: [...draft.habitIds, id] });
  };

  // Switching to the streak card keeps only the first pick; switching back
  // keeps it too, so a round trip loses as little as possible.
  const setStyle = (style: WidgetConfig['style']) =>
    update({ style, habitIds: draft.habitIds.slice(0, widgetCapacity(style)) });

  const onSave = () => {
    setWidgetConfig({ ...draft, label: draft.label.trim() || 'Today' });
    router.back();
  };

  const styleName = WIDGET_STYLES.find((s) => s.id === draft.style)?.name ?? '';
  const hint = single
    ? 'Pick one. Leave it off and the card follows the habit closest to its next milestone.'
    : `Pick up to ${capacity}. Leave them all off and the widget shows the first ${capacity} from Today.`;

  return (
    <Screen gutter bottomExtra={32}>
      <NavHeader
        left={{ label: 'Cancel', onPress: () => router.back() }}
        title="Widget"
        right={{ label: 'Save', onPress: onSave, emphasis: 'accent' }}
      />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.body}>
        {/* Widgets live on the phone's home screen, so the stage is always dark. */}
        <ThemeScope scheme="dark">
          <View style={styles.stage}>
            <RadialBackdrop
              stops={['#1F6E82', '#123844', '#0A0A0A']}
              cx="0.5"
              cy="0.2"
              rx="1.1"
              ry="0.9"
              midpoint={0.5}
            />
            <WidgetPreview config={draft} />
            <Text style={styles.stageCaption}>{styleName} · updates as you edit</Text>
          </View>
        </ThemeScope>

        <Text style={[text.label, styles.groupLabel]}>Style</Text>
        <View style={styles.settings}>
          {WIDGET_STYLES.map((option, index) => {
            const selected = option.id === draft.style;
            return (
              <Pressable
                key={option.id}
                accessibilityRole="radio"
                accessibilityState={{ selected, checked: selected }}
                accessibilityLabel={`${option.name}, ${option.sub}`}
                onPress={() => setStyle(option.id)}
                style={({ pressed }) => [
                  styles.settingRow,
                  index < WIDGET_STYLES.length - 1 && styles.settingDivider,
                  pressed && styles.pressed,
                ]}
              >
                <View style={styles.settingText}>
                  <Text style={styles.settingName}>{option.name}</Text>
                  <Text style={styles.settingSub}>{option.sub}</Text>
                </View>
                <View
                  style={[
                    styles.radio,
                    selected
                      ? {
                          borderColor: colors.accent,
                          backgroundColor: colors.accent,
                        }
                      : { borderColor: colors.ringAlt },
                  ]}
                >
                  {selected && (
                    <View style={[styles.radioDot, { backgroundColor: colors.accentInk }]} />
                  )}
                </View>
              </Pressable>
            );
          })}
        </View>

        <Text style={[text.label, styles.groupLabel]}>
          Habits
          {draft.habitIds.length > 0 ? ` · ${draft.habitIds.length} of ${capacity}` : ''}
        </Text>
        {habits.length === 0 ? (
          <Text style={[text.caption, styles.hint]}>
            Add a habit first; the widget fills itself from Today.
          </Text>
        ) : (
          <>
            <View style={styles.chips}>
              {habits.map((habit) => {
                const selected = draft.habitIds.includes(habit.id);
                const blocked = !selected && !single && full;
                return (
                  <Pressable
                    key={habit.id}
                    accessibilityRole="checkbox"
                    accessibilityState={{
                      checked: selected,
                      disabled: blocked,
                    }}
                    accessibilityLabel={habit.name}
                    onPress={() => toggleHabit(habit.id)}
                    style={({ pressed }) => [
                      styles.chip,
                      selected && styles.chipSelected,
                      blocked && styles.chipBlocked,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Text style={[styles.chipLabel, selected && styles.chipLabelSelected]}>
                      {habit.icon ? `${habit.icon} ` : ''}
                      {habit.name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <Text style={[text.caption, styles.hint]}>{hint}</Text>
          </>
        )}

        <Text style={[text.label, styles.groupLabel]}>Options</Text>
        <View style={styles.settings}>
          {draft.style !== 'streak' && (
            <View style={[styles.settingRow, styles.settingDivider]}>
              <View style={styles.settingText}>
                <Text style={styles.settingName}>Label</Text>
                <Text style={styles.settingSub}>The small heading in the corner</Text>
              </View>
              <TextInput
                value={draft.label}
                onChangeText={(label) => update({ label: label.slice(0, WIDGET_LABEL_MAX) })}
                placeholder="Today"
                placeholderTextColor={colors.textDim}
                maxLength={WIDGET_LABEL_MAX}
                returnKeyType="done"
                accessibilityLabel="Widget label"
                style={styles.labelInput}
              />
            </View>
          )}
          <View style={[styles.settingRow, styles.settingDivider]}>
            <View style={styles.settingText}>
              <Text style={styles.settingName}>Show today&rsquo;s count</Text>
              <Text style={styles.settingSub}>Done out of total, top right</Text>
            </View>
            <Toggle
              value={draft.showCount}
              label="Show today's count"
              onChange={(showCount) => update({ showCount })}
            />
          </View>
          <View style={styles.settingRow}>
            <View style={styles.settingText}>
              <Text style={styles.settingName}>Tint</Text>
              <Text style={styles.settingSub}>Accent colours the ticks, ring and card</Text>
            </View>
            <View style={styles.segment}>
              {TINTS.map(({ id, label }) => {
                const selected = draft.tint === id;
                return (
                  <Pressable
                    key={id}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    accessibilityLabel={`${label} tint`}
                    onPress={() => update({ tint: id })}
                    style={[styles.segmentBtn, selected && styles.segmentBtnActive]}
                  >
                    <Text style={[styles.segmentLabel, selected && styles.segmentLabelActive]}>
                      {label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>

        <Text style={[text.caption, styles.footnote]}>
          Saved on this device and written to the widget snapshot, so the home-screen widget picks
          it up as soon as it ships.
        </Text>
      </ScrollView>
    </Screen>
  );
}

const useStyles = themedStyles(({ colors }) => ({
  body: {
    paddingBottom: 24,
  },
  stage: {
    marginTop: 14,
    borderRadius: radius.panel,
    overflow: 'hidden' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingVertical: 26,
    paddingHorizontal: 16,
    backgroundColor: '#0A0A0A',
  },
  stageCaption: {
    marginTop: 16,
    fontFamily: font.medium,
    fontSize: 11.5,
    lineHeight: 14,
    color: 'rgba(255, 255, 255, 0.55)',
  },
  groupLabel: {
    marginTop: 18,
  },
  settings: {
    marginTop: 10,
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    overflow: 'hidden' as const,
  },
  settingRow: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    gap: 12,
  },
  settingDivider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  settingText: {
    flex: 1,
  },
  settingName: {
    fontFamily: font.semibold,
    fontSize: 14,
    lineHeight: 17,
    color: colors.text,
  },
  settingSub: {
    marginTop: 3,
    fontFamily: font.regular,
    fontSize: 11.5,
    lineHeight: 15,
    color: colors.textSub,
  },
  pressed: {
    opacity: 0.75,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: radius.full,
    borderWidth: 2,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  radioDot: {
    width: 8,
    height: 8,
    borderRadius: radius.full,
  },
  chips: {
    marginTop: 10,
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 8,
  },
  chip: {
    backgroundColor: colors.surface,
    borderRadius: radius.full,
    paddingVertical: 11,
    paddingHorizontal: 15,
  },
  chipSelected: {
    backgroundColor: colors.accent,
  },
  chipBlocked: {
    opacity: 0.45,
  },
  chipLabel: {
    fontFamily: font.medium,
    fontSize: 13.5,
    lineHeight: 16,
    color: colors.textChip,
  },
  chipLabelSelected: {
    color: colors.accentInk,
  },
  hint: {
    marginTop: 10,
    paddingHorizontal: 2,
  },
  labelInput: {
    minWidth: 96,
    maxWidth: 150,
    textAlign: 'right' as const,
    fontFamily: font.medium,
    fontSize: 14,
    lineHeight: 17,
    color: colors.text,
    padding: 0,
  },
  segment: {
    flexDirection: 'row' as const,
    backgroundColor: colors.ground,
    borderRadius: radius.full,
    padding: 3,
    gap: 2,
  },
  segmentBtn: {
    paddingVertical: 6,
    paddingHorizontal: 11,
    borderRadius: radius.full,
  },
  segmentBtnActive: {
    backgroundColor: colors.accent,
  },
  segmentLabel: {
    fontFamily: font.semibold,
    fontSize: 11,
    lineHeight: 13,
    color: colors.textSub,
  },
  segmentLabelActive: {
    color: colors.accentInk,
  },
  footnote: {
    marginTop: 16,
    paddingHorizontal: 2,
  },
}));
