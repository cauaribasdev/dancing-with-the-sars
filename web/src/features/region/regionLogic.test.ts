import { describe, expect, it } from "vitest";
import type { Pass } from "../../api/types";
import {
  addDays,
  buildCalendar,
  daysBetween,
  findNeighbors,
  formatTimeUtc,
  groupByDay,
  marginWindows,
  resolvePeriod,
} from "./regionLogic";

function pass(id: string, stackId: string, start: string): Pass {
  return { id, stackId, start, date: start.slice(0, 10) } as Pass;
}

const TODAY = new Date("2026-11-14T15:00:00Z");

describe("resolvePeriod", () => {
  it("recognizes a whole month as the overview links it", () => {
    expect(resolvePeriod("2026-07-01", "2026-07-31", TODAY)).toEqual({
      kind: "explicit",
      window: { start: "2026-07-01", end: "2026-07-31" },
      month: "2026-07",
    });
  });

  it("recognizes the current month, which ends today", () => {
    expect(resolvePeriod("2026-11-01", "2026-11-14", TODAY).month).toBe("2026-11");
  });

  it("keeps a period that is not a month, without a month", () => {
    const p = resolvePeriod("2026-07-01", "2026-08-05", TODAY);
    expect(p).toMatchObject({ kind: "explicit", month: null, window: { start: "2026-07-01", end: "2026-08-05" } });
  });

  it("falls back to the API default (last 30 days) when dates are missing, invalid or reversed", () => {
    const expected = { kind: "default", month: null, window: { start: "2026-10-16", end: "2026-11-14" } };
    expect(resolvePeriod(null, null, TODAY)).toEqual(expected);
    expect(resolvePeriod("2026-02-30", "2026-03-10", TODAY)).toEqual(expected);
    expect(resolvePeriod("2026-07-31", "2026-07-01", TODAY)).toEqual(expected);
  });
});

describe("date helpers", () => {
  it("adds days across months and years in UTC", () => {
    expect(addDays("2026-07-01", -24)).toBe("2026-06-07");
    expect(addDays("2025-12-31", 1)).toBe("2026-01-01");
    expect(daysBetween("2026-07-01", "2026-07-13")).toBe(12);
  });

  it("formats the time of a pass in UTC", () => {
    expect(formatTimeUtc("2026-07-01T21:49:57.000000Z")).toBe("21:49 UTC");
    expect(formatTimeUtc("bad")).toBe("");
  });
});

describe("buildCalendar", () => {
  it("aligns July 2026 on Sunday-first weeks and counts passes per day", () => {
    const weeks = buildCalendar({ start: "2026-07-01", end: "2026-07-31" }, [
      { date: "2026-07-01", acquisitions: 3, stacks: [] },
      { date: "2026-07-22", acquisitions: 4, stacks: [] },
    ]);
    // July 1, 2026 is a Wednesday: three empty cells first.
    expect(weeks[0].slice(0, 3)).toEqual([null, null, null]);
    expect(weeks[0][3]).toEqual({ date: "2026-07-01", day: 1, passes: 3 });
    expect(weeks.every((w) => w.length === 7)).toBe(true);
    const cells = weeks.flat().filter((c) => c !== null);
    expect(cells).toHaveLength(31);
    expect(cells.find((c) => c.date === "2026-07-22")?.passes).toBe(4);
    expect(cells.find((c) => c.date === "2026-07-02")?.passes).toBe(0);
  });
});

describe("groupByDay", () => {
  it("orders days and the passes inside each day by start time", () => {
    const groups = groupByDay([
      pass("c", "s1", "2026-07-13T21:49:00Z"),
      pass("a", "s2", "2026-07-01T09:00:00Z"),
      pass("b", "s3", "2026-07-13T09:06:00Z"),
    ]);
    expect(groups.map((g) => g.date)).toEqual(["2026-07-01", "2026-07-13"]);
    expect(groups[1].passes.map((p) => p.id)).toEqual(["b", "c"]);
  });
});

describe("findNeighbors", () => {
  const all = [
    pass("s1-jul01", "082_D_102", "2026-07-01T21:49:57Z"),
    pass("s1-jul13", "082_D_102", "2026-07-13T21:49:58Z"),
    pass("s1-jul25", "082_D_102", "2026-07-25T21:49:59Z"),
    pass("s2-jul13", "082_D_103", "2026-07-13T21:50:30Z"),
    pass("s2-jul12", "082_D_103", "2026-07-12T21:50:30Z"),
  ];

  it("finds the closest earlier and later pass of the same strip only", () => {
    const n = findNeighbors(all[1], all);
    expect(n.previous?.id).toBe("s1-jul01");
    expect(n.next?.id).toBe("s1-jul25");
  });

  it("never offers another strip, even one closer in time", () => {
    const n = findNeighbors(all[0], all);
    expect(n.previous).toBeUndefined();
    expect(n.next?.id).toBe("s1-jul13");
  });

  it("ignores the pass itself when it appears twice (period and margin)", () => {
    const n = findNeighbors(all[2], [...all, all[2]]);
    expect(n.next).toBeUndefined();
    expect(n.previous?.id).toBe("s1-jul13");
  });
});

describe("marginWindows", () => {
  it("looks 24 days beyond each end of a past month", () => {
    expect(marginWindows({ start: "2026-07-01", end: "2026-07-31" }, TODAY)).toEqual({
      before: { start: "2026-06-07", end: "2026-06-30" },
      after: { start: "2026-08-01", end: "2026-08-24" },
    });
  });

  it("does not look into the future or before the first data", () => {
    expect(marginWindows({ start: "2026-11-01", end: "2026-11-14" }, TODAY).after).toBeNull();
    expect(marginWindows({ start: "2026-11-01", end: "2026-11-10" }, TODAY).after).toEqual({
      start: "2026-11-11",
      end: "2026-11-14",
    });
    expect(marginWindows({ start: "2025-10-01", end: "2025-10-31" }, TODAY).before).toBeNull();
    expect(marginWindows({ start: "2025-10-10", end: "2025-10-31" }, TODAY).before).toEqual({
      start: "2025-10-01",
      end: "2025-10-09",
    });
  });
});
