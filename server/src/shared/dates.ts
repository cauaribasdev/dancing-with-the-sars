const DAY_MS = 86_400_000;

export const isoDate = (d: Date) => d.toISOString().slice(0, 10);

/** Parse YYYY-MM-DD as UTC midnight. */
export const parseDate = (s: string) => new Date(`${s}T00:00:00Z`);

export const addDays = (d: Date, days: number) => new Date(d.getTime() + days * DAY_MS);

/** Whole days between two YYYY-MM-DD dates or ISO timestamps (b - a), rounded. */
export function daysBetween(a: string, b: string): number {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / DAY_MS);
}

/** Inclusive day count of a [start, end] date window. */
export function windowDays(start: string, end: string): number {
  return daysBetween(start, end) + 1;
}

/**
 * Split [start, end] into fixed 7-day blocks aligned to a constant epoch, so that
 * overlapping queries hit the same cache entries.
 */
export function weekBlocks(start: string, end: string): { start: Date; end: Date }[] {
  const EPOCH = Date.UTC(2025, 8, 29); // Monday 2025-09-29
  const WEEK = 7 * DAY_MS;
  const from = parseDate(start).getTime();
  const to = addDays(parseDate(end), 1).getTime(); // exclusive
  const blocks: { start: Date; end: Date }[] = [];
  let t = EPOCH + Math.floor((from - EPOCH) / WEEK) * WEEK;
  for (; t < to; t += WEEK) blocks.push({ start: new Date(t), end: new Date(t + WEEK) });
  return blocks;
}
