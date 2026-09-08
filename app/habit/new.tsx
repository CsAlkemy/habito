import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { AccentTile } from '@/components/AccentTile';
import { NavHeader } from '@/components/NavHeader';
import { Screen } from '@/components/Screen';
import { TimeField } from '@/components/TimeField';
import { useStore } from '@/data/store';
import type { MilestoneKind, Schedule } from '@/data/types';
import { scheduleLabel } from '@/lib/date';
import { themedStyles, useTheme } from '@/theme';
import { ACCENT_FOLLOW, ACCENT_OPTIONS, font, GUTTER, radius, resolveHabitColor } from '@/theme/tokens';

const KINDS: { id: MilestoneKind; title: string; sub: string }[] = [
  {
    id: 'count',
    title: 'A number I hit each day',
    sub: '8 glasses, 30 minutes, 10,000 steps',
  },
  {
    id: 'streak',
    title: 'Days in a row, toward a milestone',
    sub: 'Reach day 7, then 21, then 30',
  },
  {
    id: 'custom',
    title: 'My own words',
    sub: "You write what today's win looks like",
  },
];

const SCHEDULES: Schedule[] = ['daily', 'weekdays', 'some'];

/**
 * Screen 2e — new habit, and the edit form behind the habit detail's "Edit".
 * Passing `?edit=<id>` reuses the whole form rather than maintaining a second
 * copy of it; the only difference is that the milestone type locks, which is
 * the promise the footnote makes.
 */
export default function NewHabit() {
  const router = useRouter();
  const { edit: editId } = useLocalSearchParams<{ edit?: string }>();
  const { habits, addHabit, editHabit, archiveHabit, moveHabit } = useStore();
  const { text, colors } = useTheme();
  const styles = useStyles();
  const existing = editId ? habits.find((h) => h.id === editId) : undefined;
  const isEdit = Boolean(existing);

  const [name, setName] = useState(existing?.name ?? '');
  const [kind, setKind] = useState<MilestoneKind>(existing?.kind ?? 'streak');
  const [goal, setGoal] = useState(existing?.goal ?? '');
  const [target, setTarget] = useState(String(existing?.target ?? 8));
  const [schedule, setSchedule] = useState<Schedule>(existing?.schedule ?? 'daily');
  const [reminder, setReminder] = useState(existing?.reminder ?? '08:00');
  const [color, setColor] = useState(existing?.color ?? ACCENT_FOLLOW);

  // First choice follows the app accent (stored as a sentinel, so re-theming
  // re-tints the habit); the rest are literal hexes that stay put.
  const swatches = [
    ACCENT_FOLLOW,
    ...ACCENT_OPTIONS.filter((option) => option !== colors.accent),
    '#9A9AA2',
  ];

  const trimmed = name.trim();
  const canSave = trimmed.length > 0;

  /** Step through the presets rather than pulling in a picker the design never drew. */
  const cycle = <T,>(list: T[], current: T, set: (next: T) => void) =>
    set(list[(list.indexOf(current) + 1) % list.length]);

  const fields = () => ({
    name: trimmed,
    color,
    schedule,
    reminder: reminder || undefined,
    ...(kind === 'count'
      ? { target: Math.max(1, Number.parseInt(target, 10) || 1), unit: 'times' }
      : {}),
    ...(kind === 'custom' ? { goal: goal.trim() } : {}),
  });

  const onSave = () => {
    if (!canSave) return;
    if (existing) {
      editHabit(existing.id, fields());
    } else {
      addHabit({
        id: `${trimmed.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}`,
        kind,
        ...fields(),
      });
    }
    router.back();
  };

  const onDelete = () => {
    if (!existing) return;
    Alert.alert(
      `Delete ${existing.name}?`,
      'It leaves your list straight away. Past check-ins stay in your history so your charts keep telling the truth.',
      [
        { text: 'Keep it', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            archiveHabit(existing.id);
            router.dismissAll();
            router.replace('/(tabs)');
          },
        },
      ],
    );
  };

  return (
    <Screen gutter bottomExtra={32}>
      <NavHeader
        left={{ label: 'Cancel', onPress: () => router.back() }}
        title={isEdit ? 'Edit habit' : 'New habit'}
        right={{ label: 'Save', onPress: canSave ? onSave : undefined, emphasis: 'accent' }}
      />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.body}>
        <View style={styles.nameCard}>
          <Text style={text.label}>Name</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Name your habit"
            placeholderTextColor={colors.textDim}
            style={styles.nameInput}
          />
        </View>

        <Text style={[text.label, styles.groupLabel]}>What counts as today&rsquo;s milestone</Text>

        <View style={styles.kinds}>
          {KINDS.map((option) => {
            const selected = option.id === kind;
            const body = (
              <View style={styles.kindInner}>
                <View style={styles.kindHeading}>
                  <Text style={[text.cardTitle, selected && { color: colors.accentInk }]}>
                    {option.title}
                  </Text>
                  {selected && <View style={styles.kindDot} />}
                </View>
                <Text
                  style={[
                    text.cardSub,
                    styles.kindSub,
                    selected && { color: colors.accentInkMuted },
                  ]}
                >
                  {option.sub}
                </Text>

                {selected && option.id === 'custom' && (
                  <TextInput
                    value={goal}
                    onChangeText={setGoal}
                    placeholder="What does today's win look like?"
                    placeholderTextColor={colors.accentInkMuted}
                    style={styles.inlineField}
                  />
                )}
                {selected && option.id === 'count' && (
                  <View style={styles.inlineRow}>
                    <TextInput
                      value={target}
                      onChangeText={setTarget}
                      keyboardType="number-pad"
                      style={[styles.inlineField, styles.inlineNumber]}
                    />
                    <Text style={styles.inlineUnit}>times a day</Text>
                  </View>
                )}
              </View>
            );

            return (
              <Pressable
                key={option.id}
                accessibilityRole="radio"
                accessibilityState={{ selected, disabled: isEdit }}
                disabled={isEdit}
                onPress={() => setKind(option.id)}
                style={({ pressed }) => pressed && styles.pressed}
              >
                {selected ? (
                  <AccentTile r={radius.card}>{body}</AccentTile>
                ) : (
                  <View style={styles.kindPlain}>{body}</View>
                )}
              </Pressable>
            );
          })}
        </View>

        <View style={styles.settings}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Days, ${scheduleLabel(schedule)}`}
            onPress={() => cycle(SCHEDULES, schedule, setSchedule)}
            style={({ pressed }) => [
              styles.settingRow,
              styles.settingDivider,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.settingLabel}>Days</Text>
            <Text style={styles.settingValue}>{scheduleLabel(schedule)}</Text>
          </Pressable>
          <View style={[styles.settingRow, styles.settingDivider]}>
            <Text style={styles.settingLabel}>Remind me</Text>
            <View style={styles.settingControls}>
              {reminder.length > 0 && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Turn reminder off"
                  onPress={() => setReminder('')}
                  style={({ pressed }) => pressed && styles.pressed}
                >
                  <Text style={styles.settingClear}>Off</Text>
                </Pressable>
              )}
              <TimeField
                value={reminder}
                onChange={setReminder}
                placeholder="Off"
                textStyle={styles.settingValue}
              />
            </View>
          </View>
          <View style={[styles.settingRow, styles.settingRowTight]}>
            <Text style={styles.settingLabel}>Colour</Text>
            <View style={styles.swatches}>
              {swatches.map((swatch) => {
                const selected = swatch === color;
                const shown = resolveHabitColor(swatch, colors.accent);
                return (
                  <Pressable
                    key={swatch}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    accessibilityLabel={
                      swatch === ACCENT_FOLLOW ? 'Colour: match the app accent' : `Colour ${swatch}`
                    }
                    onPress={() => setColor(swatch)}
                    style={[
                      styles.swatchRing,
                      selected && { borderColor: shown, borderWidth: 1.5 },
                    ]}
                  >
                    <View style={[styles.swatch, { backgroundColor: shown }]} />
                  </Pressable>
                );
              })}
            </View>
          </View>
          {isEdit && existing && (
            <View style={[styles.settingRow, styles.orderRow]}>
              <Text style={styles.settingLabel}>Order on Today</Text>
              <View style={styles.settingControls}>
                {([-1, 1] as const).map((delta) => {
                  const index = habits.findIndex((h) => h.id === existing.id);
                  const disabled = delta === -1 ? index <= 0 : index === habits.length - 1;
                  return (
                    <Pressable
                      key={delta}
                      accessibilityRole="button"
                      accessibilityLabel={delta === -1 ? 'Move up' : 'Move down'}
                      accessibilityState={{ disabled }}
                      disabled={disabled}
                      onPress={() => moveHabit(existing.id, delta)}
                      style={({ pressed }) => [
                        styles.orderButton,
                        pressed && styles.pressed,
                        disabled && styles.orderButtonDisabled,
                      ]}
                    >
                      <Text style={styles.orderGlyph}>{delta === -1 ? '↑' : '↓'}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}
        </View>

        <Text style={[text.caption, styles.footnote]}>
          Milestone type is fixed once saved, so your history stays comparable.
        </Text>

        {isEdit && (
          <Pressable
            accessibilityRole="button"
            onPress={onDelete}
            style={({ pressed }) => [styles.delete, pressed && styles.pressed]}
          >
            <Text style={styles.deleteLabel}>Delete habit</Text>
          </Pressable>
        )}
      </ScrollView>
    </Screen>
  );
}

const useStyles = themedStyles(({ colors }) => ({
  body: {
    paddingBottom: 24,
  },
  delete: {
    marginTop: 28,
    marginHorizontal: GUTTER,
    alignItems: 'center' as const,
    paddingVertical: 16,
  },
  deleteLabel: {
    fontFamily: font.semibold,
    fontSize: 14,
    lineHeight: 17,
    color: colors.danger,
  },
  nameCard: {
    marginTop: 24,
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: 16,
  },
  nameInput: {
    marginTop: 9,
    fontFamily: font.semibold,
    fontSize: 19,
    lineHeight: 23,
    color: colors.text,
    padding: 0,
  },
  groupLabel: {
    marginTop: 20,
  },
  kinds: {
    marginTop: 10,
    gap: 8,
  },
  kindPlain: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
  },
  kindInner: {
    paddingVertical: 15,
    paddingHorizontal: 16,
  },
  kindHeading: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    gap: 10,
  },
  kindDot: {
    width: 20,
    height: 20,
    borderRadius: 999,
    backgroundColor: colors.ground,
  },
  kindSub: {
    marginTop: 3,
  },
  inlineField: {
    marginTop: 12,
    backgroundColor: 'rgba(10, 30, 36, 0.22)',
    borderRadius: radius.sm,
    paddingVertical: 12,
    paddingHorizontal: 13,
    fontFamily: font.medium,
    fontSize: 14,
    lineHeight: 20,
    color: colors.accentInk,
  },
  inlineRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 10,
  },
  inlineNumber: {
    width: 74,
    textAlign: 'center' as const,
  },
  inlineUnit: {
    marginTop: 12,
    fontFamily: font.medium,
    fontSize: 14,
    color: colors.accentInk,
  },
  pressed: {
    opacity: 0.85,
  },
  settings: {
    marginTop: 18,
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    overflow: 'hidden' as const,
  },
  settingRow: {
    paddingVertical: 15,
    paddingHorizontal: 16,
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
  },
  settingRowTight: {
    paddingVertical: 14,
  },
  settingDivider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  settingLabel: {
    fontFamily: font.medium,
    fontSize: 15,
    lineHeight: 17,
    color: colors.text,
  },
  settingValue: {
    fontFamily: font.regular,
    fontSize: 15,
    lineHeight: 17,
    color: colors.textMuted,
  },
  settingControls: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 14,
  },
  settingClear: {
    fontFamily: font.regular,
    fontSize: 15,
    lineHeight: 17,
    color: colors.textDim,
  },
  swatches: {
    flexDirection: 'row' as const,
    gap: 7,
  },
  swatchRing: {
    padding: 2,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  swatch: {
    width: 20,
    height: 20,
    borderRadius: 999,
  },
  orderRow: {
    paddingVertical: 11,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  orderButton: {
    width: 40,
    height: 34,
    borderRadius: radius.tile,
    backgroundColor: colors.ground,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  orderButtonDisabled: {
    opacity: 0.35,
  },
  orderGlyph: {
    fontFamily: font.medium,
    fontSize: 16,
    lineHeight: 19,
    color: colors.textSecondary,
  },
  footnote: {
    marginTop: 24,
    textAlign: 'center' as const,
  },
}));
