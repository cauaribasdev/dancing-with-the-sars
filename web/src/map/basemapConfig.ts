// Basemap configuration. The only place that picks the style; change it here if needed.
import type { BBox } from "../api/types";

/**
 * OpenFreeMap "positron": no API key, light grays with soft hillshading.
 * Chosen so the basemap stays quiet under the radar images and the coverage colors.
 * Checked 2026-11-14: responds 200 application/json.
 */
export const BASEMAP_STYLE_URL = "https://tiles.openfreemap.org/styles/positron";

/** Vector source in the style (OpenMapTiles). Used to find the first label layer and the water outline. */
export const BASEMAP_VECTOR_SOURCE = "openmaptiles";

/** The basemap declares its own attribution (OpenFreeMap, OpenMapTiles, OpenStreetMap); this one covers our data. */
export const DATA_ATTRIBUTION =
  '<a href="https://science.nasa.gov/mission/nisar/" target="_blank" rel="noreferrer">NISAR radar (NASA and ISRO)</a> via <a href="https://asf.alaska.edu/" target="_blank" rel="noreferrer">ASF DAAC</a>; boundaries: <a href="https://www.ibge.gov.br/" target="_blank" rel="noreferrer">IBGE</a>';

/** Brazil bbox, from GET /api/regions (id "br"). */
export const BRAZIL_BBOX: BBox = [-73.9833, -33.7438, -34.8027, 5.2718];

/** Converts an API bbox to MapLibre bounds. */
export function bboxToBounds(b: BBox): [[number, number], [number, number]] {
  return [
    [b[0], b[1]],
    [b[2], b[3]],
  ];
}
