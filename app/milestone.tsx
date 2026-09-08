import { useLocalSearchParams, useRouter } from 'expo-router';
import { Text, View } from 'react-native';
import { Button, TextAction } from '@/components/Button';
import { ImageSlot } from '@/components/ImageSlot';
import { RadialBackdrop } from '@/components/RadialBackdrop';
import { Screen } from '@/components/Screen';
import { useHabit } from '@/data/store';
import { themedStyles, useTheme } from '@/theme';
import { font, radius, tracking } from '@/theme/tokens';

const PHRASES: Record<number, string> = {
  7: 'A full week of',
  21: 'Three weeks of',
  30: 'A full month of',
  100: 'A hundred days of',
};

/** Fifty XP a rung, matching `totalXp` in `src/lib/stats.ts`. */
const MILESTONE_XP = 50;

const BADGES: Record<number, string> = {
  7: 'Week one',
  21: 'Three weeks',
  30: 'Thirty days',
  100: 'Hundred days',
};

/** Screen 2g — milestone reached. */
export default function Milestone() {
  const router = useRouter();
  const params = useLocalSearchParams<{ habit?: string; count?: string }>();
  const { habit } = useHabit(params.habit);
  const { text, colors } = useTheme();
  const styles = useStyles();

  const count = Number.parseInt(params.count ?? '', 10) || 7;
  const phrase = PHRASES[count] ?? `${count} days of`;
  const noun = habit?.milestoneNoun ?? habit?.name.toLowerCase() ?? 'showing up';

  const detail =
    habit?.unit === 'minutes' && habit.target
      ? `${count} days · ${count * habit.target} minutes`
      : `${count} days`;

  const dismiss = () => (router.canGoBack() ? router.back() : router.replace('/(tabs)'));

  return (
    <Screen background={colors.groundDeep} style={styles.screen} bottomExtra={36}>
      <RadialBackdrop stops={['#1A2E34', colors.ground, colors.groundDeep]} />

      <Text style={[text.screenTitle, styles.title]}>
        {phrase}
        {'\n'}
        {noun}
      </Text>
      <Text style={[text.bodySm, styles.blurb]}>
        You&rsquo;ve already taken the hardest step, there&rsquo;s very little left
      </Text>

      <View style={styles.art}>
        <ImageSlot placeholder="Drop the 3D milestone render" width={280} height={260} />
      </View>

      <Text style={styles.count}>{count}</Text>
      <Text style={styles.detail}>{detail}</Text>

      <View style={styles.chips}>
        <Text style={styles.chip}>+{MILESTONE_XP} XP</Text>
        <Text style={styles.chip}>Badge: {BADGES[count] ?? 'Milestone'}</Text>
      </View>

      <View style={styles.spacer} />

      <Button label="Keep going" onPress={dismiss} style={styles.cta} />
      <TextAction label="Share this" style={styles.share} labelStyle={styles.shareLabel} />
    </Screen>
  );
}

const useStyles = themedStyles(({ colors }) => ({
  screen: {
    paddingHorizontal: 24,
    alignItems: 'center' as const,
  },
  title: {
    textAlign: 'center' as const,
  },
  blurb: {
    marginTop: 12,
    textAlign: 'center' as const,
    maxWidth: 300,
  },
  art: {
    marginTop: 10,
  },
  count: {
    marginTop: 18,
    fontFamily: font.semibold,
    fontSize: 62,
    lineHeight: 64,
    letterSpacing: -1.24,
    color: colors.accent,
  },
  detail: {
    marginTop: 2,
    fontFamily: font.semibold,
    fontSize: 11,
    lineHeight: 13,
    letterSpacing: tracking(0.2, 11),
    color: colors.textDim,
    textTransform: 'uppercase' as const,
  },
  chips: {
    marginTop: 18,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
  },
  chip: {
    overflow: 'hidden' as const,
    backgroundColor: colors.surface,
    borderRadius: radius.full,
    paddingVertical: 9,
    paddingHorizontal: 14,
    fontFamily: font.semibold,
    fontSize: 12,
    lineHeight: 14,
    letterSpacing: tracking(0.06, 12),
    color: colors.text,
    textTransform: 'uppercase' as const,
  },
  spacer: {
    flex: 1,
    minHeight: 16,
  },
  cta: {
    alignSelf: 'stretch' as const,
    borderRadius: radius.panel,
    paddingVertical: 20,
  },
  share: {
    paddingTop: 14,
  },
  shareLabel: {
    fontSize: 14,
    color: colors.textDim,
  },
}));
