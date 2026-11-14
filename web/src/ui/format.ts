// English formatting. API dates are UTC; we format in UTC so a date never shifts back a day.
import type { IsoDate } from "../api/types";

const LOCALE = "en-US";
const monthFmt = new Intl.DateTimeFormat(LOCALE, { month: "long", year: "numeric", timeZone: "UTC" });
const dayShortFmt = new Intl.DateTimeFormat(LOCALE, { month: "short", day: "numeric", timeZone: "UTC" });
const longFmt = new Intl.DateTimeFormat(LOCALE, { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });
const monthShortFmt = new Intl.DateTimeFormat(LOCALE, { month: "short", timeZone: "UTC" });
const numFmt = new Intl.NumberFormat(LOCALE);

function utc(date: IsoDate): Date {
  return new Date(date + "T00:00:00Z");
}

/** "2026-07" → "July 2026" */
export function formatMonth(key: string): string {
  return monthFmt.format(utc(key + "-01"));
}

/** "2026-07-22" → "Jul 22" */
export function formatDayShort(date: IsoDate): string {
  return dayShortFmt.format(utc(date));
}

/** "2026-07-22" → "July 22, 2026" */
export function formatDateLong(date: IsoDate): string {
  return longFmt.format(utc(date));
}

/** ("2026-07-01", "2026-07-27") → "Jul 1–27"; across months → "Jun 28 – Jul 3" */
export function formatDayRange(start: IsoDate, end: IsoDate): string {
  if (start === end) return formatDayShort(start);
  const a = utc(start);
  const b = utc(end);
  if (a.getUTCMonth() === b.getUTCMonth() && a.getUTCFullYear() === b.getUTCFullYear()) {
    return `${monthShortFmt.format(a)} ${a.getUTCDate()}–${b.getUTCDate()}`;
  }
  return `${formatDayShort(start)} – ${formatDayShort(end)}`;
}

export function formatNumber(n: number): string {
  return numFmt.format(n);
}

/** plural(1, "day", "days") → "1 day"; plural(3, ...) → "3 days" */
export function plural(n: number, one: string, many: string): string {
  return `${formatNumber(n)} ${n === 1 ? one : many}`;
}

/** File size: 5201111 → "5.2 MB" */
export function formatBytes(bytes: number): string {
  const fmt = (v: number) => v.toLocaleString(LOCALE, { maximumFractionDigits: 1 });
  return bytes >= 1e9 ? `${fmt(bytes / 1e9)} GB` : `${fmt(bytes / 1e6)} MB`;
}
