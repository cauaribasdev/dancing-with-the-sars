import { describe, expect, it } from 'vitest';
import { summarize, timeline } from '../src/domain/coverage';
import { bracketingPairs, consecutivePairs } from '../src/domain/pairs';
import { makePass } from './helpers';

const d103 = (date: string, cycle: number) => makePass({ date, cycle });
const a163 = (date: string, cycle: number) =>
  makePass({ date, cycle, stackId: '103_A_163', track: 103, frame: 163, direction: 'ascending' });

// Real July 2026 schedule over Porto Alegre.
const passes = [
  d103('2026-06-29', 24),
  d103('2026-07-11', 25),
  d103('2026-07-23', 26),
  a163('2026-07-03', 24),
  a163('2026-07-15', 25),
  a163('2026-07-27', 26),
];

describe('consecutivePairs', () => {
  it('pairs only acquisitions of the same stack, 12 days apart', () => {
    const pairs = consecutivePairs(passes);
    expect(pairs).toHaveLength(4);
    for (const p of pairs) {
      expect(p.before.stackId).toBe(p.after.stackId);
      expect(p.daysApart).toBe(12);
    }
  });

  it('drops pairs with a gap larger than maxGapDays', () => {
    const gappy = [d103('2026-07-27', 26), d103('2026-08-20', 28)];
    expect(consecutivePairs(gappy, 12)).toHaveLength(0);
    expect(consecutivePairs(gappy, 24)).toHaveLength(1);
  });
});

describe('bracketingPairs (flood started 2026-07-22)', () => {
  const pairs = bracketingPairs(passes, '2026-07-22');

  it('picks the last pass before and the first pass on/after the event, per stack', () => {
    expect(pairs.map((p) => [p.stackId, p.before.date, p.after.date])).toEqual([
      ['053_D_103', '2026-07-11', '2026-07-23'],
      ['103_A_163', '2026-07-15', '2026-07-27'],
    ]);
  });

  it('reports how close each pass is to the event, soonest first', () => {
    expect(pairs[0]).toMatchObject({ daysBeforeEvent: 11, daysAfterEvent: 1 });
    expect(pairs[1]).toMatchObject({ daysBeforeEvent: 7, daysAfterEvent: 5 });
  });

  it('counts a pass on the event day as "after"', () => {
    const p = bracketingPairs([d103('2026-07-10', 25), d103('2026-07-22', 26)], '2026-07-22');
    expect(p[0]?.daysAfterEvent).toBe(0);
  });

  it('respects the before/after limits', () => {
    expect(bracketingPairs(passes, '2026-07-22', { maxDaysAfter: 2 })).toHaveLength(1);
  });
});

describe('coverage', () => {
  it('builds a per-day timeline and a summary', () => {
    const t = timeline(passes);
    expect(t[0]).toEqual({ date: '2026-06-29', acquisitions: 1, stacks: ['053_D_103'] });
    expect(summarize(passes)).toMatchObject({
      acquisitions: 6,
      distinctDates: 6,
      stacks: 2,
      firstDate: '2026-06-29',
      lastDate: '2026-07-27',
    });
  });
});
