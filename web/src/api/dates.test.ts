import { describe, expect, it } from "vitest";
import { addMonths, clampMonth, daysInclusive, isIsoDate, listMonths, monthRange } from "./dates";

const today = new Date("2026-11-14T15:00:00Z");

describe("listMonths", () => {
  it("runs from October 2025 to the current month, oldest first", () => {
    const months = listMonths(today);
    expect(months[0]).toBe("2025-10");
    expect(months.at(-1)).toBe("2026-11");
    expect(months).toHaveLength(14);
  });

  it("crosses the year boundary", () => {
    expect(listMonths(new Date("2026-01-02T00:00:00Z"), "2025-11")).toEqual(["2025-11", "2025-12", "2026-01"]);
  });
});

describe("monthRange", () => {
  it("covers a whole past month", () => {
    expect(monthRange("2026-07", today)).toEqual({ start: "2026-07-01", end: "2026-07-31" });
  });

  it("stops at today for the current month", () => {
    expect(monthRange("2026-11", today)).toEqual({ start: "2026-11-01", end: "2026-11-14" });
  });

  it("handles February in leap and common years", () => {
    expect(monthRange("2028-02", new Date("2029-01-01")).end).toBe("2028-02-29");
    expect(monthRange("2026-02", today).end).toBe("2026-02-28");
  });

  it("uses UTC, so a late-evening local time does not shift the month", () => {
    // 2026-11-01T02:00Z is still Oct 31 in Brazil (UTC-3); the API works in UTC.
    expect(monthRange("2026-11", new Date("2026-11-01T02:00:00Z"))).toEqual({ start: "2026-11-01", end: "2026-11-01" });
  });

  it("always fits the 31-day coverage limit", () => {
    for (const m of listMonths(today)) expect(daysInclusive(monthRange(m, today))).toBeLessThanOrEqual(31);
  });
});

describe("helpers", () => {
  it("adds months across years", () => {
    expect(addMonths("2025-12", 1)).toBe("2026-01");
    expect(addMonths("2026-01", -1)).toBe("2025-12");
  });

  it("counts both ends of a period", () => {
    expect(daysInclusive({ start: "2026-07-01", end: "2026-07-31" })).toBe(31);
    expect(daysInclusive({ start: "2026-07-01", end: "2026-07-01" })).toBe(1);
  });

  it("falls back to the latest month for missing or unknown months", () => {
    const months = listMonths(today);
    expect(clampMonth("2026-07", months)).toBe("2026-07");
    expect(clampMonth("2024-01", months)).toBe("2026-11");
    expect(clampMonth("july", months)).toBe("2026-11");
    expect(clampMonth(null, months)).toBe("2026-11");
  });

  it("validates calendar dates", () => {
    expect(isIsoDate("2026-07-22")).toBe(true);
    expect(isIsoDate("2026-02-30")).toBe(false);
    expect(isIsoDate("2026-7-2")).toBe(false);
  });
});
