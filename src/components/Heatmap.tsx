import { Pressable, Text, View } from 'react-native';
import { addDays, daysBetween, fromDayKey, weekStart } from '@/lib/date';
import { themedStyles, useTheme } from '@/theme';
import { font, tracking } from '@/theme/tokens';

const ROWS = 7;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
/** Mon-first weekday rail. */
const DAY_RAIL = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const RAIL_WIDTH = 16;

type Props = {
  /** row-major: one column per week across, 7 days down */
  cells: readonly string[];
  /** fixed row height; omit to let cells stay square */
  rowHeight?: number;
  legend?: boolean;
  /**
   * Today's day key. When given, the grid grows date context: month labels
   * along the top, a weekday rail on the left, and an outline on today's cell.
   * The grid is assumed to end on the current week, matching `heatmapCells`.
   */
  today?: string;
  /** Makes past cells tappable; tapping reports the cell's day key. */
  onSelectDay?: (day: string) => void;
  /** The day whose cell is drawn with the selection outline. */
  selectedDay?: string;
};

export function Heatmap({ cells, rowHeight, legend = false, today, onSelectDay, selectedDay }: Props) {
  const { colors, heatLegend } = useTheme();
  const styles = useStyles();
  // Columns come from the data rather than a constant, so the same grid can
  // draw one week or a full year. Dense grids tighten up: a 52-column year at
  // the 12-week gap would spend more width on gutters than on cells. Sparse
  // grids (a month) grow taller so the wide cells don't read as bars.
  const columns = Math.max(1, Math.round(cells.length / ROWS));
  const gap = columns > 40 ? 1.5 : columns > 20 ? 2.5 : 4;
  const heightScale = columns > 20 ? 12 / columns + 0.4 : columns <= 6 ? 1.6 : 1;
  const height = rowHeight ? Math.max(6, rowHeight * heightScale) : undefined;
  // Day-of-month numbers only fit the 12-week grid and sparser; denser grids
  // would turn them into noise, so there the month row and the tap read-out
  // carry the date.
  const showDates = today !== undefined && columns <= 12;

  // Date context: which column starts a new month, and where today sits.
  const monthLabels: { col: number; label: string }[] = [];
  let todayRow = -1;
  const firstWeek = today ? addDays(weekStart(today), -7 * (columns - 1)) : null;
  if (today && firstWeek) {
    const starts: { col: number; label: string }[] = [];
    let prev = -1;
    for (let col = 0; col < columns; col++) {
      const month = fromDayKey(addDays(firstWeek, col * 7)).getMonth();
      if (month !== prev) {
        starts.push({ col, label: MONTHS[month] });
        prev = month;
      }
    }
    // A year grid has no room for twelve labels, so dense grids keep every
    // other one, counting back from the newest so the current month survives.
    const step = columns > 40 ? 2 : 1;
    for (let i = starts.length - 1; i >= 0; i -= step) monthLabels.unshift(starts[i]);
    todayRow = (fromDayKey(today).getDay() + 6) % 7;
  }

  /** One day square: colour, today/selection outline, optional date, tap. */
  const renderCell = (row: number, col: number, shape: object, dateStyle?: object) => {
    const isToday = today !== undefined && col === columns - 1 && row === todayRow;
    const day = firstWeek ? addDays(firstWeek, col * 7 + row) : null;
    const future = day !== null && today !== undefined && daysBetween(day, today) < 0;
    const tappable = day !== null && today !== undefined && onSelectDay !== undefined && !future;
    const cellStyle = [
      styles.cell,
      { borderRadius: gap < 3 ? 1.5 : 4 },
      shape,
      { backgroundColor: cells[row * columns + col] ?? colors.surfaceEmpty },
      isToday && styles.todayCell,
      day !== null && day === selectedDay && styles.selectedCell,
    ];
    const date =
      showDates && day !== null ? (
        <Text
          allowFontScaling={false}
          style={[styles.dateLabel, dateStyle, future && styles.dateLabelFuture]}
        >
          {fromDayKey(day).getDate()}
        </Text>
      ) : null;
    return tappable ? (
      <Pressable
        key={col}
        accessibilityRole="button"
        accessibilityLabel={`Show ${day}`}
        onPress={() => onSelectDay(day)}
        style={cellStyle}
      >
        {date}
      </Pressable>
    ) : (
      <View key={col} style={cellStyle}>
        {date}
      </View>
    );
  };

  const legendNode = legend ? (
    <View style={styles.legend}>
      <Text style={styles.legendLabel}>Less</Text>
      {heatLegend.map((shade) => (
        <View key={shade} style={[styles.swatch, { backgroundColor: shade }]} />
      ))}
      <Text style={styles.legendLabel}>More</Text>
    </View>
  ) : null;

  // A single week is laid across rather than down: seven wide day tiles with
  // the weekday above each, which is how a phone calendar shows a week.
  if (today && columns === 1) {
    return (
      <View>
        <View style={styles.strip}>
          {DAY_RAIL.map((label, row) => (
            <View key={row} style={styles.stripDay}>
              <Text style={styles.stripLabel}>{label}</Text>
              {renderCell(row, 0, styles.stripCell, styles.stripDate)}
            </View>
          ))}
        </View>
        {legendNode}
      </View>
    );
  }

  const shape = height ? { height } : { aspectRatio: 1 };
  const grid = (
    <View style={[styles.grid, { gap }]}>
      {Array.from({ length: ROWS }, (_, row) => (
        <View key={row} style={[styles.row, { gap }]}>
          {Array.from({ length: columns }, (_, col) => renderCell(row, col, shape))}
        </View>
      ))}
    </View>
  );

  return (
    <View>
      {today && (
        <View style={styles.monthRow}>
          {monthLabels.map(({ col, label }) => (
            <Text
              key={`${col}-${label}`}
              style={[styles.monthLabel, { left: `${(col / columns) * 100}%` }]}
            >
              {label}
            </Text>
          ))}
        </View>
      )}

      {today ? (
        <View style={styles.body}>
          <View style={[styles.rail, { gap }]}>
            {DAY_RAIL.map((label, row) => (
              <View key={row} style={[styles.railCell, height ? { height } : { flex: 1 }]}>
                <Text style={styles.railLabel}>{label}</Text>
              </View>
            ))}
          </View>
          <View style={styles.gridWrap}>{grid}</View>
        </View>
      ) : (
        grid
      )}

      {legendNode}
    </View>
  );
}

const useStyles = themedStyles(({ colors }) => ({
  monthRow: {
    height: 13,
    marginBottom: 7,
    marginLeft: RAIL_WIDTH,
    position: 'relative' as const,
  },
  monthLabel: {
    position: 'absolute' as const,
    fontFamily: font.medium,
    fontSize: 9.5,
    lineHeight: 12,
    letterSpacing: tracking(0.1, 9.5),
    color: colors.textSub,
    textTransform: 'uppercase' as const,
  },
  body: {
    flexDirection: 'row' as const,
  },
  rail: {
    width: RAIL_WIDTH,
  },
  railCell: {
    justifyContent: 'center' as const,
  },
  railLabel: {
    fontFamily: font.medium,
    fontSize: 8.5,
    lineHeight: 10,
    color: colors.textSub,
  },
  gridWrap: {
    flex: 1,
  },
  grid: {},
  row: {
    flexDirection: 'row' as const,
  },
  cell: {
    flex: 1,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  dateLabel: {
    fontFamily: font.medium,
    fontSize: 8.5,
    lineHeight: 10,
    color: colors.textSub,
  },
  dateLabelFuture: {
    color: colors.textLocked,
  },
  strip: {
    flexDirection: 'row' as const,
    gap: 6,
  },
  stripDay: {
    flex: 1,
    alignItems: 'stretch' as const,
    gap: 6,
  },
  stripLabel: {
    fontFamily: font.medium,
    fontSize: 9.5,
    lineHeight: 12,
    letterSpacing: tracking(0.1, 9.5),
    color: colors.textSub,
    textAlign: 'center' as const,
  },
  stripCell: {
    aspectRatio: 1,
    borderRadius: 10,
  },
  stripDate: {
    fontSize: 13,
    lineHeight: 16,
    color: colors.textSecondary,
  },
  todayCell: {
    borderWidth: 1.5,
    borderColor: colors.textSub,
  },
  selectedCell: {
    borderWidth: 2,
    borderColor: colors.text,
  },
  legend: {
    marginTop: 12,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'flex-end' as const,
    gap: 6,
  },
  legendLabel: {
    fontFamily: font.medium,
    fontSize: 9.5,
    lineHeight: 11,
    letterSpacing: tracking(0.12, 9.5),
    color: colors.textSub,
    textTransform: 'uppercase' as const,
  },
  swatch: {
    width: 10,
    height: 10,
    borderRadius: 3,
  },
}));
