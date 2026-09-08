import { Pressable, Text, TextInput, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { AccentTile } from '@/components/AccentTile';
import type { MilestoneKind } from '@/data/types';
import { themedStyles, useTheme } from '@/theme';
import { font, radius } from '@/theme/tokens';

/**
 * The "what counts as today's milestone" radio group from screen 2e, with the
 * count target and custom goal fields inlined into their cards. Shared by the
 * new-habit form and onboarding so the first habit isn't second-class.
 */

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

type Props = {
  kind: MilestoneKind;
  onKindChange: (next: MilestoneKind) => void;
  /** custom habits — the user's own words */
  goal: string;
  onGoalChange: (next: string) => void;
  /** count habits — daily target, kept as the raw input string */
  target: string;
  onTargetChange: (next: string) => void;
  /** edit mode: the milestone type is fixed once saved */
  locked?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function MilestonePicker({
  kind,
  onKindChange,
  goal,
  onGoalChange,
  target,
  onTargetChange,
  locked = false,
  style,
}: Props) {
  const { text, colors } = useTheme();
  const styles = useStyles();

  return (
    <View style={[styles.kinds, style]}>
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
              style={[text.cardSub, styles.kindSub, selected && { color: colors.accentInkMuted }]}
            >
              {option.sub}
            </Text>

            {selected && option.id === 'custom' && (
              <TextInput
                value={goal}
                onChangeText={onGoalChange}
                placeholder="What does today's win look like?"
                placeholderTextColor={colors.accentInkMuted}
                style={styles.inlineField}
              />
            )}
            {selected && option.id === 'count' && (
              <View style={styles.inlineRow}>
                <TextInput
                  value={target}
                  onChangeText={onTargetChange}
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
            accessibilityState={{ selected, disabled: locked }}
            disabled={locked}
            onPress={() => onKindChange(option.id)}
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
  );
}

const useStyles = themedStyles(({ colors }) => ({
  kinds: {
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
}));
