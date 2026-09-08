import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Share, ScrollView, Text, View } from 'react-native';
import { AccentTile } from '@/components/AccentTile';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { BarChart } from '@/components/Charts';
import { Screen } from '@/components/Screen';
import { StatTile } from '@/components/StatTile';
import { useHistoryHabits, useStore } from '@/data/store';
import { weeklyRecap } from '@/lib/stats';
import { themedStyles, useTheme } from '@/theme';
import { font, radius, tracking } from '@/theme/tokens';

/** Screen 2h — Sunday's weekly recap. */
export default function Recap() {
  const router = useRouter();
  const { history, todayKey } = useStore();
  const habits = useHistoryHabits();
  const { text, colors } = useTheme();
  const styles = useStyles();
  const recap = useMemo(
    () => weeklyRecap(habits, history, todayKey),
    [habits, history, todayKey],
  );

  const onShare = () => {
    Share.share({
      message: `${recap.headline} — ${recap.completion}% this week on Habito.`,
    }).catch(() => {});
  };

  return (
    <Screen gutter bottomExtra={32}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.body}>
        <Text style={text.eyebrow}>{recap.week}</Text>
        <Text style={[text.screenTitleSm, styles.headline]}>
          {recap.hasData ? recap.headline : 'Nothing logged this week yet'}
        </Text>

        <View style={styles.stats}>
          <StatTile size={30} value={String(recap.completion)} suffix="%" label="Done" />
          <StatTile
            size={30}
            value={
              recap.hasComparison
                ? `${recap.vsLastWeek >= 0 ? '+' : ''}${recap.vsLastWeek}`
                : '—'
            }
            label={recap.hasComparison ? 'vs last week' : 'First week'}
            valueColor={recap.vsLastWeek < 0 ? colors.textMuted : colors.accent}
          />
          <StatTile size={30} value={String(recap.milestones)} label="Milestones" />
        </View>

        <Card r={radius.panel} style={styles.panel}>
          <Text style={text.sectionLabel}>Day by day</Text>
          <View style={styles.chart}>
            <BarChart data={recap.days} height={62} gap={10} rounded />
          </View>
        </Card>

        {(recap.strongest || recap.hardestDay) && (
          <Card r={radius.panel} style={[styles.panel, styles.insights]}>
            {recap.strongest && (
              <View>
                <Text style={text.label}>Strongest</Text>
                <Text style={styles.insight}>{recap.strongest}</Text>
              </View>
            )}
            {recap.strongest && recap.hardestDay && <View style={styles.divider} />}
            {recap.hardestDay && (
              <View>
                <Text style={text.label}>Hardest day</Text>
                <Text style={styles.insight}>{recap.hardestDay}</Text>
              </View>
            )}
          </Card>
        )}

        {/*
          The design showed a coaching suggestion here. Producing an honest one
          needs a model of when the user actually checks in, which the app does
          not have yet — so this states what the week's own numbers say rather
          than inventing advice.
        */}
        <AccentTile r={radius.panel} style={styles.panel}>
          <View style={styles.suggestion}>
            <Text style={styles.suggestionLabel}>This week</Text>
            <Text style={styles.suggestionText}>
              {!recap.hasData
                ? 'Check in once and this page starts filling itself in.'
                : !recap.hasComparison
                  ? 'Your first week on the board. Next Sunday this compares against it.'
                  : recap.vsLastWeek > 0
                    ? `Up ${recap.vsLastWeek} points on last week. Whatever changed, keep it.`
                    : recap.vsLastWeek < 0
                      ? `Down ${Math.abs(recap.vsLastWeek)} points on last week. One good day resets the trend.`
                      : 'Level with last week. Steady is its own kind of progress.'}
            </Text>
          </View>
        </AccentTile>
      </ScrollView>

      <View style={styles.actions}>
        <Button label="Share recap" onPress={onShare} />
        <Button label="Done" variant="secondary" fill={false} onPress={() => router.back()} />
      </View>
    </Screen>
  );
}

const useStyles = themedStyles(({ colors }) => ({
  body: {
    paddingBottom: 16,
  },
  headline: {
    marginTop: 12,
  },
  stats: {
    marginTop: 18,
    flexDirection: 'row' as const,
    gap: 8,
  },
  panel: {
    marginTop: 12,
  },
  chart: {
    marginTop: 16,
  },
  insights: {
    gap: 14,
  },
  insight: {
    marginTop: 6,
    fontFamily: font.medium,
    fontSize: 15.5,
    lineHeight: 21,
    color: colors.text,
  },
  divider: {
    height: 1,
    backgroundColor: colors.divider,
  },
  suggestion: {
    padding: 18,
  },
  suggestionLabel: {
    fontFamily: font.semibold,
    fontSize: 10.5,
    lineHeight: 13,
    letterSpacing: tracking(0.16, 10.5),
    color: colors.accentInk,
    textTransform: 'uppercase' as const,
  },
  suggestionText: {
    marginTop: 8,
    fontFamily: font.medium,
    fontSize: 15.5,
    lineHeight: 22,
    color: colors.accentInk,
  },
  actions: {
    marginTop: 12,
    flexDirection: 'row' as const,
    gap: 10,
  },
}));
