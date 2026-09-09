import { useEffect, useState } from 'react';
import { ScrollView } from 'react-native';
import { BottomSheet } from './BottomSheet';
import { DayHistory } from './DayHistory';
import type { Habit, History } from '@/data/types';
import { themedStyles } from '@/theme';

type Props = {
  /** 'YYYY-MM-DD' of the tapped heatmap cell; null keeps the sheet closed */
  day: string | null;
  habits: Habit[];
  history: History;
  onDismiss: () => void;
};

/**
 * The tapped heatmap day, read out in a bottom drawer instead of inline under
 * the grid, so the grid never jumps and the read-out sits where the thumb is.
 */
export function DayHistorySheet({ day, habits, history, onDismiss }: Props) {
  const styles = useStyles();
  // Keep the last day around while the sheet animates closed.
  const [shownDay, setShownDay] = useState<string | null>(day);
  useEffect(() => {
    if (day !== null) setShownDay(day);
  }, [day]);

  return (
    <BottomSheet visible={day !== null} onDismiss={onDismiss}>
      <ScrollView
        bounces={false}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {shownDay && <DayHistory day={shownDay} habits={habits} history={history} />}
      </ScrollView>
    </BottomSheet>
  );
}

const useStyles = themedStyles(() => ({
  content: {
    paddingBottom: 4,
  },
}));
