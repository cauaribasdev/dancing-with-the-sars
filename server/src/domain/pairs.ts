import { daysBetween } from '../shared/dates';
import type { Direction, Pass } from './pass';

/** Two passes with identical viewing geometry (same stackId) - the only valid basis for before/after comparison. */
export interface Pair {
  stackId: string;
  track: number;
  frame: number;
  direction: Direction;
  before: Pass;
  after: Pass;
  daysApart: number;
}

export interface EventPair extends Pair {
  daysBeforeEvent: number;
  daysAfterEvent: number;
}

function groupByStack(passes: Pass[]): Map<string, Pass[]> {
  const groups = new Map<string, Pass[]>();
  for (const p of passes) {
    const g = groups.get(p.stackId);
    if (g) g.push(p);
    else groups.set(p.stackId, [p]);
  }
  for (const g of groups.values()) g.sort((a, b) => a.start.localeCompare(b.start));
  return groups;
}

const makePair = (before: Pass, after: Pass): Pair => ({
  stackId: before.stackId,
  track: before.track,
  frame: before.frame,
  direction: before.direction,
  before,
  after,
  daysApart: daysBetween(before.start, after.start),
});

/** Every consecutive acquisition of the same stack, at most `maxGapDays` apart (NISAR repeats every 12 days). */
export function consecutivePairs(passes: Pass[], maxGapDays = 24): Pair[] {
  const pairs: Pair[] = [];
  for (const g of groupByStack(passes).values()) {
    for (let i = 1; i < g.length; i++) {
      const pair = makePair(g[i - 1] as Pass, g[i] as Pass);
      if (pair.daysApart > 0 && pair.daysApart <= maxGapDays) pairs.push(pair);
    }
  }
  return pairs.sort((a, b) => a.after.start.localeCompare(b.after.start) || a.stackId.localeCompare(b.stackId));
}

/**
 * For each stack, the last acquisition before `eventDate` and the first on/after it.
 * Sorted so the pairs that see the event soonest (and with the shortest baseline) come first.
 */
export function bracketingPairs(
  passes: Pass[],
  eventDate: string,
  { maxDaysBefore = 30, maxDaysAfter = 30 }: { maxDaysBefore?: number; maxDaysAfter?: number } = {},
): EventPair[] {
  const pairs: EventPair[] = [];
  for (const g of groupByStack(passes).values()) {
    const before = g.filter((p) => p.date < eventDate).at(-1);
    const after = g.find((p) => p.date >= eventDate);
    if (!before || !after) continue;
    const daysBeforeEvent = daysBetween(before.date, eventDate);
    const daysAfterEvent = daysBetween(eventDate, after.date);
    if (daysBeforeEvent > maxDaysBefore || daysAfterEvent > maxDaysAfter) continue;
    pairs.push({ ...makePair(before, after), daysBeforeEvent, daysAfterEvent });
  }
  return pairs.sort(
    (a, b) => a.daysAfterEvent - b.daysAfterEvent || a.daysApart - b.daysApart || a.stackId.localeCompare(b.stackId),
  );
}
