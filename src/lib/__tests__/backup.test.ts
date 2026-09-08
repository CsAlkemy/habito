import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { DatedEntry, Habit } from '@/data/types';
import { buildBackup, parseBackup } from '../backup';

/**
 * The importer reads files from outside the app's control, so the parser is
 * the trust boundary: everything usable survives, everything malformed is
 * dropped or rejected with a message rather than reaching the database.
 */

const habit: Habit = {
  id: 'water',
  name: 'Drink water',
  kind: 'count',
  color: '#72d7f0',
  unit: 'glasses',
  target: 8,
  schedule: 'daily',
  createdAt: '2026-01-01',
  sortOrder: 0,
};

const entry: DatedEntry = { habitId: 'water', day: '2026-08-19', status: 'done', value: 8 };

describe('backup round trip', () => {
  it('rebuilds what it wrote', () => {
    const json = buildBackup([habit], [entry]);
    const parsed = parseBackup(json);
    // JSON round-trip drops explicit-undefined optional fields on both sides.
    const plain = (v: unknown) => JSON.parse(JSON.stringify(v));
    assert.deepEqual(plain(parsed.habits), plain([habit]));
    assert.deepEqual(plain(parsed.entries), plain([entry]));
  });
});

describe('parseBackup rejections', () => {
  it('rejects a file that is not JSON', () => {
    assert.throws(() => parseBackup('not json'), /not valid JSON/);
  });

  it('rejects JSON that is not a Habito export', () => {
    assert.throws(() => parseBackup('{"foo": 1}'), /not a Habito export/);
  });

  it('rejects an export from a future format version', () => {
    const doc = { app: 'habito', version: 99, habits: [], entries: [] };
    assert.throws(() => parseBackup(JSON.stringify(doc)), /newer version/);
  });

  it('rejects an export with nothing usable in it', () => {
    const doc = { app: 'habito', version: 1, habits: [], entries: [] };
    assert.throws(() => parseBackup(JSON.stringify(doc)), /no usable/);
  });
});

describe('parseBackup sanitising', () => {
  it('drops malformed habits and keeps the good ones', () => {
    const doc = {
      app: 'habito',
      version: 1,
      habits: [habit, { id: 'broken' }, { ...habit, id: 'bad-kind', kind: 'nope' }],
      entries: [],
    };
    const parsed = parseBackup(JSON.stringify(doc));
    assert.deepEqual(
      parsed.habits.map((h) => h.id),
      ['water'],
    );
  });

  it('drops entries pointing at habits that exist nowhere', () => {
    const doc = {
      app: 'habito',
      version: 1,
      habits: [habit],
      entries: [entry, { ...entry, habitId: 'ghost' }],
    };
    const parsed = parseBackup(JSON.stringify(doc));
    assert.equal(parsed.entries.length, 1);
  });

  it('keeps entries for habits already on the device', () => {
    const doc = {
      app: 'habito',
      version: 1,
      habits: [],
      entries: [{ ...entry, habitId: 'already-here' }],
    };
    const parsed = parseBackup(JSON.stringify(doc), ['already-here']);
    assert.equal(parsed.entries.length, 1);
  });

  it('normalises broken values instead of importing them', () => {
    const doc = {
      app: 'habito',
      version: 1,
      habits: [habit],
      entries: [
        { ...entry, value: -3 },
        { ...entry, day: '2026-08-20', value: 'lots' },
      ],
    };
    const parsed = parseBackup(JSON.stringify(doc));
    assert.deepEqual(
      parsed.entries.map((e) => e.value),
      [0, 0],
    );
  });
});
