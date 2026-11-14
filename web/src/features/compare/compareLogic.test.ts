import { describe, expect, it } from "vitest";
import { compareArea, compareNotes, daysBetween, formatTimeUtc, orderPasses, readCompareParams } from "./compareLogic";

const early = { id: "p1", start: "2026-07-11T21:33:51.000000Z", date: "2026-07-11", stackId: "053_D_103" };
const late = { id: "p2", start: "2026-07-23T21:33:50.000000Z", date: "2026-07-23", stackId: "053_D_103" };
const other = { id: "p3", start: "2026-07-22T09:29:37.000000Z", date: "2026-07-22", stackId: "031_A_161" };

describe("readCompareParams", () => {
  it("reads both ids", () => {
    expect(readCompareParams(new URLSearchParams("before=a&after=b"))).toEqual({ before: "a", after: "b" });
  });

  it("treats missing and blank values as missing", () => {
    expect(readCompareParams(new URLSearchParams("before=a"))).toEqual({ before: "a", after: null });
    expect(readCompareParams(new URLSearchParams("before=&after=%20"))).toEqual({ before: null, after: null });
  });
});

describe("orderPasses", () => {
  it("keeps the order when the first is earlier", () => {
    const r = orderPasses(early, late);
    expect([r.before.id, r.after.id, r.swapped]).toEqual(["p1", "p2", false]);
  });

  it("puts the earlier pass first", () => {
    const r = orderPasses(late, early);
    expect([r.before.id, r.after.id, r.swapped]).toEqual(["p1", "p2", true]);
  });
});

describe("compareNotes", () => {
  it("flags different viewing geometries", () => {
    expect(compareNotes(early, late)).toEqual({ sameGeometry: true, samePass: false });
    expect(compareNotes(early, other)).toEqual({ sameGeometry: false, samePass: false });
  });

  it("flags the same pass twice", () => {
    expect(compareNotes(early, early).samePass).toBe(true);
  });
});

describe("daysBetween", () => {
  it("counts whole days in UTC, across months", () => {
    expect(daysBetween("2026-07-11", "2026-07-23")).toBe(12);
    expect(daysBetween("2026-07-23", "2026-07-11")).toBe(12);
    expect(daysBetween("2026-07-25", "2026-08-06")).toBe(12);
    expect(daysBetween("2026-07-11", "2026-07-11")).toBe(0);
  });
});

describe("compareArea", () => {
  it("frames both passes", () => {
    expect(compareArea({ bbox: [-53, -30, -50, -27] }, { bbox: [-52, -31, -49, -28] })).toEqual([-53, -31, -49, -27]);
  });
});

describe("formatTimeUtc", () => {
  it("takes hours and minutes from the ISO time", () => {
    expect(formatTimeUtc("2026-07-11T21:33:51.000000Z")).toBe("21:33 UTC");
    expect(formatTimeUtc("bad")).toBe("");
  });
});
