// Pure helpers for the region page: period from the URL, calendar grid, grouping by day, neighbors in a strip.
import { isIsoDate, monthOf, monthRange, toIsoDate, type MonthKey } from "../../api/dates";
import type { DateWindow, IsoDate, Pass, TimelineDay } from "../../api/types";

/** First day with data, from GET /api/meta (dataStart). Margins never reach before it. */
export const DATA_START: IsoDate = "2025-10-01";
/** How far beyond the period we look for the previous/next pass of a strip (two 12-day repeats). */
export const NEIGHBOR_MARGIN_DAYS = 24;
/** The API default when the address has no dates. */
export const DEFAULT_PERIOD_DAYS = 30;

const DAY_MS = 86_400_000;

export function addDays(date: IsoDate, delta: number): IsoDate {
  return toIsoDate(new Date(Date.parse(date + "T00:00:00Z") + delta * DAY_MS));
}

/** Whole days from `a` to `b` (positive when b is later). */
export function daysBetween(a: IsoDate, b: IsoDate): number {
  return Math.round((Date.parse(b + "T00:00:00Z") - Date.parse(a + "T00:00:00Z")) / DAY_MS);
}

export type ResolvedPeriod =
  | { kind: "explicit"; window: DateWindow; month: MonthKey | null }
  | { kind: "default"; window: DateWindow; month: null };

/**
 * Period from the address. Valid start/end → that period (and its month if it is exactly one month, as the
 * overview links it). Otherwise → the API default, the last 30 days ending today (UTC).
 */
export function resolvePeriod(start: string | null, end: string | null, today: Date): ResolvedPeriod {
  if (isIsoDate(start) && isIsoDate(end) && start <= end) {
    const month = monthOf(new Date(start + "T00:00:00Z"));
    const range = monthRange(month, today);
    const isMonth = range.start === start && range.end === end;
    return { kind: "explicit", window: { start, end }, month: isMonth ? month : null };
  }
  const todayIso = toIsoDate(today);
  return { kind: "default", window: { start: addDays(todayIso, -(DEFAULT_PERIOD_DAYS - 1)), end: todayIso }, month: null };
}

export interface CalendarCell {
  date: IsoDate;
  /** Day of the month, for the label. */
  day: number;
  passes: number;
}

/**
 * Calendar weeks (Sunday first) covering the period. Days outside the period are null so the grid stays aligned.
 * Each day carries its number of passes from the API's timeline (0 when it had none).
 */
export function buildCalendar(window: DateWindow, timeline: TimelineDay[]): (CalendarCell | null)[][] {
  const counts = new Map(timeline.map((t) => [t.date, t.acquisitions]));
  const startDow = new Date(window.start + "T00:00:00Z").getUTCDay();
  const total = daysBetween(window.start, window.end) + 1;
  const cells: (CalendarCell | null)[] = Array.from({ length: startDow }, () => null);
  for (let i = 0; i < total; i++) {
    const date = addDays(window.start, i);
    cells.push({ date, day: Number(date.slice(8, 10)), passes: counts.get(date) ?? 0 });
  }
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: (CalendarCell | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

export interface DayGroup {
  date: IsoDate;
  passes: Pass[];
}

/** Passes grouped by day, days in order and passes in each day by start time. */
export function groupByDay(passes: Pass[]): DayGroup[] {
  const byDate = new Map<IsoDate, Pass[]>();
  for (const p of passes) {
    const list = byDate.get(p.date);
    if (list) list.push(p);
    else byDate.set(p.date, [p]);
  }
  return [...byDate.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([date, list]) => ({ date, passes: [...list].sort(byStart) }));
}

export function byStart(a: Pick<Pass, "start">, b: Pick<Pass, "start">): number {
  return a.start < b.start ? -1 : a.start > b.start ? 1 : 0;
}

export interface Neighbors {
  previous: Pass | undefined;
  next: Pass | undefined;
}

/**
 * The previous and the next pass of the same image strip (same stackId), by start time.
 * Only the same stackId is comparable: another viewing geometry changes brightness even when the ground did not change.
 */
export function findNeighbors(pass: Pick<Pass, "id" | "stackId" | "start">, candidates: Iterable<Pass>): Neighbors {
  let previous: Pass | undefined;
  let next: Pass | undefined;
  for (const c of candidates) {
    if (c.stackId !== pass.stackId || c.id === pass.id) continue;
    if (c.start < pass.start) {
      if (!previous || c.start > previous.start) previous = c;
    } else if (c.start > pass.start) {
      if (!next || c.start < next.start) next = c;
    }
  }
  return { previous, next };
}

/**
 * Windows just outside the period where a pass near the edge finds its neighbor: up to 24 days before the start
 * and after the end, never before the first data or after today. 24 days fits every region's limit (country: 31).
 */
export function marginWindows(
  window: DateWindow,
  today: Date,
  days = NEIGHBOR_MARGIN_DAYS,
): { before: DateWindow | null; after: DateWindow | null } {
  const todayIso = toIsoDate(today);
  const beforeEnd = addDays(window.start, -1);
  const beforeStart = addDays(window.start, -days);
  const afterStart = addDays(window.end, 1);
  const afterEnd = addDays(window.end, days);
  return {
    before: beforeEnd >= DATA_START ? { start: beforeStart < DATA_START ? DATA_START : beforeStart, end: beforeEnd } : null,
    after: afterStart <= todayIso ? { start: afterStart, end: afterEnd > todayIso ? todayIso : afterEnd } : null,
  };
}

/** "2026-07-01T21:49:57.000000Z" → "21:49 UTC" */
export function formatTimeUtc(iso: string): string {
  const m = /T(\d{2}):(\d{2})/.exec(iso);
  return m ? `${m[1]}:${m[2]} UTC` : "";
}

/** Unique ids, first occurrence kept (map queries can return the same feature from several tiles). */
export function uniqueIds(ids: Iterable<string>): string[] {
  return [...new Set(ids)];
}
