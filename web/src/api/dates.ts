// Dates the way the API expects them: YYYY-MM-DD in UTC. Months as "YYYY-MM".
import type { DateWindow, IsoDate } from "./types";

/** First month with NISAR data over Brazil (GET /api/meta → dataStart 2025-10-01). */
export const FIRST_DATA_MONTH = "2025-10";

export type MonthKey = string;

const MONTH_RE = /^(\d{4})-(0[1-9]|1[0-2])$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function toIsoDate(d: Date): IsoDate {
  return d.toISOString().slice(0, 10);
}

export function isMonthKey(value: string | null | undefined): value is MonthKey {
  return !!value && MONTH_RE.test(value);
}

export function isIsoDate(value: string | null | undefined): value is IsoDate {
  if (!value || !DATE_RE.test(value)) return false;
  const d = new Date(value + "T00:00:00Z");
  return !Number.isNaN(d.getTime()) && toIsoDate(d) === value;
}

export function monthOf(d: Date): MonthKey {
  return d.toISOString().slice(0, 7);
}

function parseMonth(key: MonthKey): { year: number; month: number } {
  const m = MONTH_RE.exec(key);
  if (!m) throw new Error(`Invalid month: ${key}`);
  return { year: Number(m[1]), month: Number(m[2]) };
}

export function addMonths(key: MonthKey, delta: number): MonthKey {
  const { year, month } = parseMonth(key);
  return monthOf(new Date(Date.UTC(year, month - 1 + delta, 1)));
}

/** Months from `first` up to the month of `today`, oldest first. */
export function listMonths(today: Date, first: MonthKey = FIRST_DATA_MONTH): MonthKey[] {
  const last = monthOf(today);
  const out: MonthKey[] = [];
  for (let k = first; k <= last; k = addMonths(k, 1)) out.push(k);
  return out;
}

/**
 * Period of a month: from the 1st to the last day, or up to today for the current month.
 * Always fits the 31-day limit of GET /api/coverage.
 */
export function monthRange(key: MonthKey, today: Date): DateWindow {
  const { year, month } = parseMonth(key);
  const start = toIsoDate(new Date(Date.UTC(year, month - 1, 1)));
  const lastDay = toIsoDate(new Date(Date.UTC(year, month, 0)));
  const todayIso = toIsoDate(today);
  const end = lastDay > todayIso ? todayIso : lastDay;
  return { start, end: end < start ? start : end };
}

/** Number of days in the period, counting both ends. */
export function daysInclusive({ start, end }: DateWindow): number {
  const ms = Date.parse(end + "T00:00:00Z") - Date.parse(start + "T00:00:00Z");
  return Math.round(ms / 86_400_000) + 1;
}

/** Keeps the month inside the available list; otherwise returns the latest month. */
export function clampMonth(key: string | null | undefined, months: MonthKey[]): MonthKey {
  if (isMonthKey(key) && months.includes(key)) return key;
  return months[months.length - 1];
}
