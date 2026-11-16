import { describe, expect, it } from "vitest";
import { formatDayRange, formatDayShort, formatMonth, plural } from "./format";

describe("format", () => {
  it("formata meses e dias em português brasileiro e UTC", () => {
    expect(formatMonth("2026-07")).toBe("julho de 2026");
    expect(formatDayShort("2026-07-01")).toBe("1 de jul.");
  });

  it("formats day ranges", () => {
    expect(formatDayRange("2026-07-01", "2026-07-27")).toBe("1–27 de jul.");
    expect(formatDayRange("2026-06-28", "2026-07-03")).toBe("28 de jun. – 3 de jul.");
    expect(formatDayRange("2026-07-05", "2026-07-05")).toBe("5 de jul.");
  });

  it("pluralizes", () => {
    expect(plural(1, "dia", "dias")).toBe("1 dia");
    expect(plural(1200, "passagem", "passagens")).toBe("1.200 passagens");
  });
});
