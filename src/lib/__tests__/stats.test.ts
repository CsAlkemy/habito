import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { Entry, Habit, History } from '@/data/types';
import { addDays, dayKey, isScheduled, weekStart } from '../date';
import {
  bestStreak,
  completionPct,
  completionTrend,
  currentStreak,
  dayCredit,
  heatmapCells,
  isPerfectDay,
  weeklyRecap,
} from '../stats';

/**
 * The statistics are the part of Habito that can be silently wrong — a streak
 * that reads 12 when it should read 3 looks perfectly plausible. These fix the
 * cases that are easy to get wrong: a skip mid-run, a weekend for a
 * weekdays-only habit, and today still being open.
 */

const TODAY = '2026-08-19'; // a Wednesday

function habit(over: Partial<Habit> = {}): Habit {
  return {
    id: 'h',
    name: 'Test',
    kind: 'streak',
    color: '#fff',
    schedule: 'daily',
    createdAt: '2026-01-01',
    sortOrder: 0,
    ...over,
  };
}

/** Build entries backwards from `TODAY`: index 0 is today, 1 is yesterday. */
function days(...statuses: (Entry['status'] | null)[]): Record<string, Entry> {
  const out: Record<string, Entry> = {};
  statuses.forEach((status, i) => {
    if (status) out[addDays(TODAY, -i)] = { status, value: 0 };
  });
  return out;
}

describe('currentStreak', () => {
  it('counts consecutive completions', () => {
    assert.equal(currentStreak(habit(), days('done', 'done', 'done'), TODAY), 3);
  });

  it('steps over a skip without breaking or counting it', () => {
    // The skip screen promises "your streak pauses here, not ends".
    assert.equal(currentStreak(habit(), days('done', 'skipped', 'done', 'done'), TODAY), 3);
  });

  it('breaks on a missed day', () => {
    assert.equal(currentStreak(habit(), days('done', null, 'done', 'done'), TODAY), 1);
  });

  it('does not break just because today is still open', () => {
    // 8am on day four should not read as a broken streak.
    assert.equal(currentStreak(habit(), days(null, 'done', 'done', 'done'), TODAY), 3);
  });

  it('ignores weekends for a weekdays-only habit', () => {
    const weekdays = habit({ schedule: 'weekdays' });
    // Mon 17th and Tue 18th done, today (Wed) open; the weekend before is empty.
    const entries: Record<string, Entry> = {
      '2026-08-18': { status: 'done', value: 0 },
      '2026-08-17': { status: 'done', value: 0 },
      '2026-08-14': { status: 'done', value: 0 }, // the Friday
    };
    assert.equal(currentStreak(weekdays, entries, TODAY), 3);
  });

  it('never counts days before the habit existed', () => {
    const young = habit({ createdAt: addDays(TODAY, -1) });
    assert.equal(currentStreak(young, days('done', 'done', 'done', 'done'), TODAY), 2);
  });

  it('is zero for a habit with no history', () => {
    assert.equal(currentStreak(habit(), {}, TODAY), 0);
  });
});

describe('bestStreak', () => {
  it('remembers a longer past run', () => {
    const entries = days('done', null, 'done', 'done', 'done', 'done');
    assert.equal(currentStreak(habit(), entries, TODAY), 1);
    assert.equal(bestStreak(habit(), entries, TODAY), 4);
  });
});

describe('completionPct', () => {
  it('divides by scheduled days, not calendar days', () => {
    const weekdays = habit({ schedule: 'weekdays', createdAt: '2026-08-17' });
    // Mon and Tue done, today open and therefore excluded: 2 of 2.
    const entries: Record<string, Entry> = {
      '2026-08-17': { status: 'done', value: 0 },
      '2026-08-18': { status: 'done', value: 0 },
    };
    assert.equal(completionPct(weekdays, entries, 30, TODAY), 100);
  });

  it('leaves skipped days out of both sides of the fraction', () => {
    const h = habit({ createdAt: addDays(TODAY, -3) });
    // Three past days: done, skipped, done -> 2 of 2, not 2 of 3.
    assert.equal(completionPct(h, days(null, 'done', 'skipped', 'done'), 30, TODAY), 100);
  });

  it('does not let an open today drag the figure down', () => {
    const h = habit({ createdAt: addDays(TODAY, -1) });
    assert.equal(completionPct(h, days(null, 'done'), 30, TODAY), 100);
  });

  it('is zero rather than NaN when nothing is due', () => {
    assert.equal(completionPct(habit({ createdAt: TODAY }), {}, 30, TODAY), 0);
  });

  it('credits saved partial progress on a count habit', () => {
    const counted = habit({ kind: 'count', target: 8, createdAt: addDays(TODAY, -1) });
    // Yesterday done, today saved at 2 of 8: (1 + 0.25) / 2 = 63%.
    const entries: Record<string, Entry> = {
      [addDays(TODAY, -1)]: { status: 'done', value: 8 },
      [TODAY]: { status: 'open', value: 2 },
    };
    assert.equal(completionPct(counted, entries, 30, TODAY), 63);
  });

  it('still excludes today while nothing is logged on a count habit', () => {
    const counted = habit({ kind: 'count', target: 8, createdAt: addDays(TODAY, -1) });
    const entries: Record<string, Entry> = {
      [addDays(TODAY, -1)]: { status: 'done', value: 8 },
      [TODAY]: { status: 'open', value: 0 },
    };
    assert.equal(completionPct(counted, entries, 30, TODAY), 100);
  });
});

describe('dayCredit', () => {
  const counted = habit({ kind: 'count', target: 8 });

  it('gives full credit for done, none for skipped or missing', () => {
    assert.equal(dayCredit(counted, { status: 'done', value: 8 }), 1);
    assert.equal(dayCredit(counted, { status: 'skipped', value: 5 }), 0);
    assert.equal(dayCredit(counted, undefined), 0);
  });

  it('gives fractional credit for an open count entry, capped at 1', () => {
    assert.equal(dayCredit(counted, { status: 'open', value: 2 }), 0.25);
    assert.equal(dayCredit(counted, { status: 'open', value: 12 }), 1);
  });

  it('gives no partial credit to non-count habits', () => {
    assert.equal(dayCredit(habit(), { status: 'open', value: 3 }), 0);
  });
});

describe('isPerfectDay', () => {
  const a = habit({ id: 'a' });
  const b = habit({ id: 'b' });

  it('needs every due habit done', () => {
    const history: History = {
      a: { '2026-08-18': { status: 'done', value: 0 } },
      b: { '2026-08-18': { status: 'done', value: 0 } },
    };
    assert.equal(isPerfectDay([a, b], history, '2026-08-18'), true);
  });

  it('is false when one is still open', () => {
    const history: History = { a: { '2026-08-18': { status: 'done', value: 0 } } };
    assert.equal(isPerfectDay([a, b], history, '2026-08-18'), false);
  });

  it('is false on a day with nothing due, rather than vacuously true', () => {
    assert.equal(isPerfectDay([], {}, '2026-08-18'), false);
  });
});

describe('heatmapCells', () => {
  const SHADES = ['empty', 'low', 'mid', 'full'] as const;

  it('never shades a day without user input', () => {
    const counted = habit({ kind: 'count', target: 8, createdAt: '2026-01-01' });
    // TODAY is Wednesday 19 Aug; one week -> cells are Mon..Sun of that week.
    const history: History = {
      h: {
        '2026-08-17': { status: 'done', value: 8 }, // Monday: full input
        '2026-08-18': { status: 'open', value: 0 }, // Tuesday: opened, nothing logged
        '2026-08-19': { status: 'open', value: 2 }, // today: saved partial progress
      },
    };
    const cells = heatmapCells([counted], history, SHADES, TODAY, 1);
    assert.deepEqual(cells, [
      'full', // Mon — done
      'empty', // Tue — an entry exists but holds no input
      'low', // Wed (today) — 2/8 partial credit
      'empty', // Thu — no entry
      'empty',
      'empty',
      'empty', // Fri–Sun — future days
    ]);
  });
});

describe('weeklyRecap', () => {
  it('reports nothing rather than inventing a week', () => {
    const recap = weeklyRecap([], {}, TODAY);
    assert.equal(recap.hasData, false);
    assert.equal(recap.completion, 0);
    assert.equal(recap.strongest, null);
  });

  it('counts only the current week', () => {
    const h = habit({ createdAt: '2026-01-01' });
    const monday = weekStart(TODAY);
    const history: History = {
      h: {
        [monday]: { status: 'done', value: 0 },
        [addDays(monday, 1)]: { status: 'done', value: 0 },
        [addDays(monday, -3)]: { status: 'done', value: 0 }, // last week
      },
    };
    const recap = weeklyRecap([h], history, TODAY);
    assert.equal(recap.hasData, true);
    assert.match(recap.headline, /2 times out of/);
  });
});

describe('date helpers', () => {
  it('formats a local day key without shifting timezone', () => {
    assert.equal(dayKey(new Date(2026, 7, 19, 23, 45)), '2026-08-19');
    assert.equal(dayKey(new Date(2026, 0, 1, 0, 5)), '2026-01-01');
  });

  it('crosses month and year boundaries', () => {
    assert.equal(addDays('2026-08-31', 1), '2026-09-01');
    assert.equal(addDays('2026-01-01', -1), '2025-12-31');
  });

  it('starts weeks on Monday, including for a Sunday', () => {
    assert.equal(weekStart('2026-08-19'), '2026-08-17'); // Wed -> Mon
    assert.equal(weekStart('2026-08-17'), '2026-08-17'); // Mon -> itself
    assert.equal(weekStart('2026-08-23'), '2026-08-17'); // Sun -> the Mon before
  });

  it('knows which days a weekdays-only habit is due', () => {
    assert.equal(isScheduled('weekdays', '2026-08-21'), true); // Friday
    assert.equal(isScheduled('weekdays', '2026-08-22'), false); // Saturday
    assert.equal(isScheduled('daily', '2026-08-22'), true);
  });
});

describe('weeklyRecap comparison', () => {
  it('does not report a delta against a week that had nothing due', () => {
    const h = habit({ createdAt: weekStart(TODAY) });
    const history: History = {
      h: { [weekStart(TODAY)]: { status: 'done', value: 0 } },
    };
    const recap = weeklyRecap([h], history, TODAY);
    assert.equal(recap.hasComparison, false);
    assert.equal(recap.vsLastWeek, 0);
  });

  it('reports a delta once there is a week to compare against', () => {
    const h = habit({ createdAt: addDays(weekStart(TODAY), -7) });
    const lastMonday = addDays(weekStart(TODAY), -7);
    const history: History = {
      h: {
        [lastMonday]: { status: 'done', value: 0 },
        [weekStart(TODAY)]: { status: 'done', value: 0 },
      },
    };
    const recap = weeklyRecap([h], history, TODAY);
    assert.equal(recap.hasComparison, true);
  });
});

describe('completionTrend', () => {
  const water = habit({ id: 'w' });
  const salah = habit({ id: 's' });
  const history: History = {
    w: days('done', 'done', 'done', 'done'),
    s: days(null, 'done', null, 'skipped'),
  };

  it('draws one point per day for a week and one per week for six months', () => {
    assert.equal(completionTrend([water], history, TODAY, 1).points.length, 7);
    assert.equal(completionTrend([water], history, TODAY, 5).points.length, 35);
    assert.equal(completionTrend([water], history, TODAY, 26).points.length, 26);
  });

  it('leaves days after today as gaps', () => {
    const { points } = completionTrend([water, salah], history, TODAY, 1);
    // Wednesday: Mon and Tue are logged, Thu–Sun have not happened.
    assert.deepEqual(points.slice(3), [null, null, null, null]);
  });

  it('pools every due habit into one percentage per day', () => {
    const { points } = completionTrend([water, salah], history, TODAY, 1);
    // Yesterday (Tue): both done → 100. Monday: water done, salah not → 50.
    assert.equal(points[1], 100);
    assert.equal(points[0], 50);
    // Today: water done, salah unlogged — an open today doesn't count as a miss.
    assert.equal(points[2], 100);
  });

  it('labels a week by weekday and a month by week start', () => {
    assert.deepEqual(
      completionTrend([water], history, TODAY, 1).labels.map((l) => l.text),
      ['M', 'T', 'W', 'T', 'F', 'S', 'S'],
    );
    const month = completionTrend([water], history, TODAY, 5).labels;
    assert.equal(month.length, 5);
    assert.equal(month[0].index, 0);
  });

  it('reports the range average and the period before it', () => {
    const trend = completionTrend([water], history, TODAY, 1);
    // Water was done every day of this week so far.
    assert.equal(trend.average, 100);
    assert.equal(typeof trend.previous, 'number');
  });
});
