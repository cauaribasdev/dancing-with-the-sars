// Colors for MapLibre layers (which cannot read CSS variables). Same values as app/styles.css.

export const MAP_COLORS = {
  ink: "#F8FAFC",
  paper: "#05070D",
  sheet: "#0D1320",
  ink3: "#94A3B8",
  /** Interaction blue: annotations on the map. Always draw a wider `ink` line underneath (casing). */
  signal: "#1479FF",
} as const;

/** Default annotation widths: blue core over an ink casing. */
export const ANNOTATION_LINE = {
  casingWidth: 4.5,
  coreWidth: 2,
} as const;
