import { daysBetween } from '../shared/dates';
import type { Pass } from './pass';

export interface TimelineDay {
  date: string;
  acquisitions: number;
  stacks: string[];
}

export interface CoverageSummary {
  acquisitions: number;
  distinctDates: number;
  stacks: number;
  firstDate: string | null;
  lastDate: string | null;
  /** Median gap in days between consecutive acquisition dates (any geometry). */
  medianGapDays: number | null;
}

/** Acquisitions per UTC day - drives the time slider / histogram. */
export function timeline(passes: Pass[]): TimelineDay[] {
  const days = new Map<string, Set<string>>();
  const counts = new Map<string, number>();
  for (const p of passes) {
    counts.set(p.date, (counts.get(p.date) ?? 0) + 1);
    const s = days.get(p.date) ?? new Set<string>();
    s.add(p.stackId);
    days.set(p.date, s);
  }
  return [...days.keys()].sort().map((date) => ({
    date,
    acquisitions: counts.get(date) ?? 0,
    stacks: [...(days.get(date) ?? [])].sort(),
  }));
}

export function summarize(passes: Pass[]): CoverageSummary {
  const dates = [...new Set(passes.map((p) => p.date))].sort();
  const gaps = dates.slice(1).map((d, i) => daysBetween(dates[i] as string, d)).sort((a, b) => a - b);
  return {
    acquisitions: passes.length,
    distinctDates: dates.length,
    stacks: new Set(passes.map((p) => p.stackId)).size,
    firstDate: dates[0] ?? null,
    lastDate: dates.at(-1) ?? null,
    medianGapDays: gaps.length ? (gaps[Math.floor(gaps.length / 2)] as number) : null,
  };
}
