// Colors for MapLibre layers (which cannot read CSS variables). Same values as app/styles.css.

export const MAP_COLORS = {
  ink: "#16202a",
  paper: "#f2f3f0",
  sheet: "#fbfbfa",
  ink3: "#5f6a74",
  /** Signal yellow: annotations on the map. Always draw a wider `ink` line underneath (casing). */
  signal: "#ffc21a",
} as const;

/** Default annotation widths: yellow core over an ink casing. */
export const ANNOTATION_LINE = {
  casingWidth: 4.5,
  coreWidth: 2,
} as const;
