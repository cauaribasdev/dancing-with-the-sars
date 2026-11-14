// Coverage color scale: days with at least one pass (`distinctDates`).
// Do not use `acquisitions`: the raw count tracks state area (AM 210, DF 10 in July 2026).
// Fixed classes, the same every month, so colors can be compared across months.
import type { ExpressionSpecification } from "maplibre-gl";

export interface CoverageClass {
  min: number;
  max: number; // inclusive; Infinity on the last class
  color: string;
  label: string;
}

/** No pass in the period: no fill, dashed outline only. */
export const NO_COVERAGE_LABEL = "none";

/** Same values as --color-cov-1..6 in app/styles.css (checked with the dataviz skill's validator). */
export const COVERAGE_CLASSES: readonly CoverageClass[] = [
  { min: 1, max: 2, color: "#67b6ce", label: "1–2" },
  { min: 3, max: 5, color: "#389db9", label: "3–5" },
  { min: 6, max: 9, color: "#0083a0", label: "6–9" },
  { min: 10, max: 14, color: "#006a84", label: "10–14" },
  { min: 15, max: 19, color: "#005067", label: "15–19" },
  { min: 20, max: Infinity, color: "#003849", label: "20+" },
];

/** Class index (0..5), or -1 when there was no pass / no data. */
export function coverageClassIndex(days: number | null | undefined): number {
  if (days == null || !Number.isFinite(days) || days < 1) return -1;
  return COVERAGE_CLASSES.findIndex((c) => days >= c.min && days <= c.max);
}

export function coverageColor(days: number | null | undefined): string | null {
  const i = coverageClassIndex(days);
  return i < 0 ? null : COVERAGE_CLASSES[i].color;
}

/** Accessible class text, e.g. "6 to 9 days with a pass". */
export function coverageClassLabel(days: number | null | undefined): string {
  const i = coverageClassIndex(days);
  if (i < 0) return "no days with a pass";
  const c = COVERAGE_CLASSES[i];
  return Number.isFinite(c.max) ? `${c.min} to ${c.max} days with a pass` : `${c.min} or more days with a pass`;
}

/**
 * MapLibre expression equivalent to `coverageColor`, reading the polygon's `days` property.
 * Fewer than 1 day stays transparent (the dashed outline shows "none").
 */
export function coverageFillExpression(property = "days"): ExpressionSpecification {
  const stops: (string | number)[] = [];
  for (const c of COVERAGE_CLASSES) stops.push(c.min, c.color);
  return ["step", ["coalesce", ["get", property], 0], "rgba(0,0,0,0)", ...stops] as ExpressionSpecification;
}
