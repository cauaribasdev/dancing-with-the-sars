import { describe, expect, it } from "vitest";
import { formatDayRange, formatDayShort, formatMonth, plural } from "./format";

describe("format", () => {
  it("formats months and days in English, in UTC", () => {
    expect(formatMonth("2026-07")).toBe("July 2026");
    expect(formatDayShort("2026-07-01")).toBe("Jul 1");
  });

  it("formats day ranges", () => {
    expect(formatDayRange("2026-07-01", "2026-07-27")).toBe("Jul 1–27");
    expect(formatDayRange("2026-06-28", "2026-07-03")).toBe("Jun 28 – Jul 3");
    expect(formatDayRange("2026-07-05", "2026-07-05")).toBe("Jul 5");
  });

  it("pluralizes", () => {
    expect(plural(1, "day", "days")).toBe("1 day");
    expect(plural(1200, "pass", "passes")).toBe("1,200 passes");
  });
});
