import { useLocalSearchParams, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { ColorSwatches } from '@/components/ColorSwatches';
import { MilestonePicker } from '@/components/MilestonePicker';
import { NavHeader } from '@/components/NavHeader';
import { Screen } from '@/components/Screen';
import { TimeField } from '@/components/TimeField';
import { useStore } from '@/data/store';
import type { MilestoneKind, Schedule } from '@/data/types';
import { scheduleLabel } from '@/lib/date';
import { themedStyles, useTheme } from '@/theme';
import { ACCENT_FOLLOW, font, GUTTER, radius } from '@/theme/tokens';

const SCHEDULES: Schedule[] = ['daily', 'weekdays', 'some'];

/** Keep count habits from scheduling an absurd pile of notifications. */
const MAX_REMINDERS = 8;

const toHHMM = (minutes: number) =>
  `${String(Math.floor(minutes / 60) % 24).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;

/**
 * Suggested reminder times for "N times a day": up to six, spread evenly
 * between 08:00 and 20:00 and kept on 15-minute marks.
 */
function prefillTimes(targetText: string): string[] {
  const n = Math.min(Math.max(Number.parseInt(targetText, 10) || 1, 1), 6);
  if (n === 1) return ['08:00'];
  return Array.from({ length: n }, (_, i) =>
    toHHMM(Math.round((8 * 60 + (i * 12 * 60) / (n - 1)) / 15) * 15),
  );
}

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
  const [reminders, setReminders] = useState<string[]>(() =>
    existing ? (existing.reminder?.split(',').filter(Boolean) ?? []) : ['08:00'],
  );
  const [color, setColor] = useState(existing?.color ?? ACCENT_FOLLOW);

  // Once the user has touched the reminder list (or is editing a saved habit),
  // changing the kind or target stops re-prefilling it over their choices.
  const remindersTouched = useRef(Boolean(existing));

  const trimmed = name.trim();
  const canSave = trimmed.length > 0;

  /** Step through the presets rather than pulling in a picker the design never drew. */
  const cycle = <T,>(list: T[], current: T, set: (next: T) => void) =>
    set(list[(list.indexOf(current) + 1) % list.length]);

  const editReminders = (next: string[]) => {
    remindersTouched.current = true;
    setReminders(next);
  };

  const addReminder = () => {
    const last = /^(\d{1,2}):(\d{2})$/.exec(reminders[reminders.length - 1] ?? '');
    const next = last ? toHHMM(((Number(last[1]) + 1) % 24) * 60 + Number(last[2])) : '08:00';
    editReminders([...reminders, next]);
  };

  const changeKind = (next: MilestoneKind) => {
    setKind(next);
    if (!remindersTouched.current) setReminders(next === 'count' ? prefillTimes(target) : ['08:00']);
  };

  const changeTarget = (next: string) => {
    setTarget(next);
    if (kind === 'count' && !remindersTouched.current) setReminders(prefillTimes(next));
  };

  const fields = () => {
    const times = [
      ...new Set((kind === 'count' ? reminders : reminders.slice(0, 1)).filter((t) => t.trim())),
    ].sort();
    return {
      name: trimmed,
      color,
      schedule,
      reminder: times.join(',') || undefined,
      ...(kind === 'count'
        ? { target: Math.max(1, Number.parseInt(target, 10) || 1), unit: 'times' }
        : {}),
      ...(kind === 'custom' ? { goal: goal.trim() } : {}),
    };
  };

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

        <MilestonePicker
          kind={kind}
          onKindChange={changeKind}
          goal={goal}
          onGoalChange={setGoal}
          target={target}
          onTargetChange={changeTarget}
          locked={isEdit}
          style={styles.kinds}
        />

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
          {kind === 'count' ? (
            <View style={[styles.reminderBlock, styles.settingDivider]}>
              <View style={styles.reminderHeader}>
                <Text style={styles.settingLabel}>Remind me</Text>
                {reminders.length > 0 && (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Turn all reminders off"
                    onPress={() => editReminders([])}
                    style={({ pressed }) => pressed && styles.pressed}
                  >
                    <Text style={styles.settingClear}>Off</Text>
                  </Pressable>
                )}
              </View>
              {reminders.map((time, index) => (
                <View key={index} style={styles.reminderRow}>
                  <TimeField
                    value={time}
                    onChange={(next) =>
                      editReminders(reminders.map((t, i) => (i === index ? next : t)))
                    }
                    textStyle={styles.settingValue}
                  />
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Remove the ${time} reminder`}
                    hitSlop={10}
                    onPress={() => editReminders(reminders.filter((_, i) => i !== index))}
                    style={({ pressed }) => pressed && styles.pressed}
                  >
                    <Text style={styles.reminderRemove}>✕</Text>
                  </Pressable>
                </View>
              ))}
              {reminders.length === 0 && (
                <Text style={[styles.settingValue, styles.reminderEmpty]}>
                  No reminders for this habit.
                </Text>
              )}
              {reminders.length < MAX_REMINDERS && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Add a reminder time"
                  onPress={addReminder}
                  style={({ pressed }) => [styles.reminderAdd, pressed && styles.pressed]}
                >
                  <Text style={styles.reminderAddLabel}>+ Add a time</Text>
                </Pressable>
              )}
            </View>
          ) : (
            <View style={[styles.settingRow, styles.settingDivider]}>
              <Text style={styles.settingLabel}>Remind me</Text>
              <View style={styles.settingControls}>
                {(reminders[0] ?? '').length > 0 && (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Turn reminder off"
                    onPress={() => editReminders([])}
                    style={({ pressed }) => pressed && styles.pressed}
                  >
                    <Text style={styles.settingClear}>Off</Text>
                  </Pressable>
                )}
                <TimeField
                  value={reminders[0] ?? ''}
                  onChange={(next) => editReminders([next])}
                  placeholder="Off"
                  textStyle={styles.settingValue}
                />
              </View>
            </View>
          )}
          <View style={[styles.settingRow, styles.settingRowTight]}>
            <Text style={styles.settingLabel}>Colour</Text>
            <ColorSwatches value={color} onChange={setColor} />
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
  reminderBlock: {
    paddingTop: 15,
    paddingBottom: 13,
    paddingHorizontal: 16,
  },
  reminderHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
  },
  reminderRow: {
    marginTop: 12,
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
  },
  reminderRemove: {
    fontFamily: font.medium,
    fontSize: 14,
    lineHeight: 17,
    color: colors.textDim,
  },
  reminderEmpty: {
    marginTop: 12,
  },
  reminderAdd: {
    marginTop: 14,
    alignSelf: 'flex-start' as const,
  },
  reminderAddLabel: {
    fontFamily: font.semibold,
    fontSize: 14,
    lineHeight: 17,
    color: colors.accent,
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
