import { describe, expect, it } from "vitest";
import { COVERAGE_CLASSES, coverageClassIndex, coverageClassLabel, coverageColor, coverageFillExpression } from "./coverageScale";

describe("coverage scale", () => {
  it("leaves zero and missing values unfilled", () => {
    for (const v of [0, null, undefined, Number.NaN, -1]) {
      expect(coverageClassIndex(v)).toBe(-1);
      expect(coverageColor(v)).toBeNull();
    }
  });

  it("puts class boundaries in the right bins", () => {
    expect([1, 2, 3, 5, 6, 9, 10, 14, 15, 19, 20, 31].map(coverageClassIndex)).toEqual([0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5]);
  });

  it("colors July 2026 by days, not by raw pass count", () => {
    // Amazonas had 210 passes on 24 days, Distrito Federal 10 passes on 6 days.
    expect(coverageColor(24)).toBe(COVERAGE_CLASSES[5].color);
    expect(coverageColor(6)).toBe(COVERAGE_CLASSES[2].color);
  });

  it("has contiguous classes that get darker", () => {
    for (let i = 1; i < COVERAGE_CLASSES.length; i++) {
      expect(COVERAGE_CLASSES[i].min).toBe(COVERAGE_CLASSES[i - 1].max + 1);
      const lum = (hex: string) => parseInt(hex.slice(1, 3), 16) + parseInt(hex.slice(3, 5), 16) + parseInt(hex.slice(5, 7), 16);
      expect(lum(COVERAGE_CLASSES[i].color)).toBeLessThan(lum(COVERAGE_CLASSES[i - 1].color));
    }
    expect(COVERAGE_CLASSES.at(-1)!.max).toBe(Infinity);
  });

  it("builds a MapLibre step expression matching coverageColor", () => {
    const expr = coverageFillExpression("days") as unknown[];
    expect(expr[0]).toBe("step");
    expect(expr.slice(3)).toEqual(COVERAGE_CLASSES.flatMap((c) => [c.min, c.color]));
  });

  it("describes classes in words", () => {
    expect(coverageClassLabel(7)).toBe("6 a 9 dias com passagem");
    expect(coverageClassLabel(25)).toBe("20 ou mais dias com passagem");
    expect(coverageClassLabel(0)).toBe("nenhum dia com passagem");
  });
});
