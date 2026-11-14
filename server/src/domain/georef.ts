import type { MultiPolygon, Polygon, Position } from 'geojson';
import type { BBox } from './pass';

/**
 * Georeferencing of NISAR GCOV "_LATLON.png" browse images.
 *
 * Findings (scripts/check-browse-bounds.ts on Jul 2026 RS scenes):
 *  - the PNG is NOT the footprint bbox: it has a transparent margin of varying size;
 *  - pixels are square in Web Mercator (EPSG:3857) and axis-aligned (independent x/y
 *    scale fits agree to ~0.1%);
 *  - sometimes the image border clips the data, so a footprint corner falls outside the PNG.
 * The exact bounds are in a KML behind Earthdata Login, so we recover them from open data:
 * match the extreme valid (alpha>0) pixels of the PNG to the extreme vertices of the CMR
 * footprint, drop clipped corners, and fit x = ax + s*lon, y = ay - s*mercY by least squares.
 */

export interface RgbaImage {
  width: number;
  height: number;
  /** RGBA bytes, row-major (what pngjs decodes to). */
  data: Uint8Array | Buffer;
}

type CornerKey = 'top' | 'bottom' | 'left' | 'right';
const CORNERS: CornerKey[] = ['top', 'bottom', 'left', 'right'];

export interface BrowseGeoref {
  /** [west, south, east, north] of the whole PNG, in degrees. */
  bounds: BBox;
  /** Image corners [top-left, top-right, bottom-right, bottom-left] as [lon, lat] - MapLibre image source format. */
  corners: [Position, Position, Position, Position];
  projection: 'EPSG:3857';
  width: number;
  height: number;
  /** RMS misfit between the footprint vertices used and the observed image corners, in pixels. */
  rmsErrorPx: number;
  /** Independent x/y scale ratio over the corners used (~1 confirms the model); null if < 3 corners. */
  pixelAspect: number | null;
  /** Footprint corners that were cut off by the image border and excluded from the fit. */
  clippedCorners: CornerKey[];
  quality: 'good' | 'low';
}

const RAD = Math.PI / 180;
/** Web Mercator northing expressed in "degrees" (same units as longitude). */
export const mercY = (lat: number) => Math.log(Math.tan(Math.PI / 4 + (lat * RAD) / 2)) / RAD;
export const invMercY = (y: number) => (2 * Math.atan(Math.exp(y * RAD)) - Math.PI / 2) / RAD;

export interface Extreme {
  /** Pixel position [x, y] where the valid region reaches this side. */
  at: [number, number];
  /** True when this side is a straight cut (image border / flat edge), not a footprint vertex. */
  clipped: boolean;
}

/** Where the valid (non-transparent) region touches each side of its own bounding box. */
export function validExtremes(img: RgbaImage): Record<CornerKey, Extreme> | null {
  const { width, height, data } = img;
  const alpha = (x: number, y: number) => data[(y * width + x) * 4 + 3] ?? 0;
  let minX = width, maxX = -1, minY = height, maxY = -1;
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++)
      if (alpha(x, y) > 0) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
  if (maxX < 0) return null;

  const row = (y: number) => [...Array(width).keys()].filter((x) => alpha(x, y) > 0);
  const col = (x: number) => [...Array(height).keys()].filter((y) => alpha(x, y) > 0);
  const mid = (v: number[]) => (v[0]! + v.at(-1)!) / 2;
  // A true vertex touches its extreme row/column over a few pixels; a long run means a straight cut.
  const flat = (run: number[], dim: number) => run.length > Math.max(15, dim * 0.01);

  const top = row(minY), bottom = row(maxY), left = col(minX), right = col(maxX);
  return {
    top: { at: [mid(top), minY], clipped: minY <= 1 || flat(top, width) },
    bottom: { at: [mid(bottom), maxY], clipped: maxY >= height - 2 || flat(bottom, width) },
    left: { at: [minX, mid(left)], clipped: minX <= 1 || flat(left, height) },
    right: { at: [maxX, mid(right)], clipped: maxX >= width - 2 || flat(right, height) },
  };
}

function slope(xs: number[], ys: number[]) {
  const mx = xs.reduce((a, b) => a + b, 0) / xs.length;
  const my = ys.reduce((a, b) => a + b, 0) / ys.length;
  let sxy = 0, sxx = 0;
  xs.forEach((x, i) => {
    sxy += (x - mx) * (ys[i]! - my);
    sxx += (x - mx) ** 2;
  });
  return sxy / sxx;
}

/** Fit the PNG georeference from its pixels and the CMR footprint. Returns null if the PNG has no valid pixels. */
export function georeferenceBrowse(img: RgbaImage, footprint: Polygon | MultiPolygon): BrowseGeoref | null {
  const ext = validExtremes(img);
  if (!ext) return null;

  const pts: Position[] = footprint.type === 'Polygon' ? footprint.coordinates.flat() : footprint.coordinates.flat(2);
  const pick = (better: (a: Position, b: Position) => boolean) => pts.reduce((a, b) => (better(b, a) ? b : a));
  const vertex: Record<CornerKey, Position> = {
    top: pick((a, b) => a[1]! > b[1]!),
    bottom: pick((a, b) => a[1]! < b[1]!),
    left: pick((a, b) => a[0]! < b[0]!),
    right: pick((a, b) => a[0]! > b[0]!),
  };

  const clippedCorners = CORNERS.filter((k) => ext[k].clipped);
  const usable = CORNERS.filter((k) => !ext[k].clipped);
  const used = usable.length >= 2 ? usable : CORNERS;

  const lon = used.map((k) => vertex[k][0]!);
  const my = used.map((k) => mercY(vertex[k][1]!));
  const px = used.map((k) => ext[k].at[0]);
  const py = used.map((k) => ext[k].at[1]);
  const mean = (v: number[]) => v.reduce((a, b) => a + b, 0) / v.length;

  // Square-pixel model: x = ax + s*lon, y = ay - s*mercY (closed-form least squares).
  const [mLon, mMy, mPx, mPy] = [mean(lon), mean(my), mean(px), mean(py)];
  let num = 0, den = 0;
  used.forEach((_, i) => {
    const dl = lon[i]! - mLon, dm = my[i]! - mMy, dx = px[i]! - mPx, dy = py[i]! - mPy;
    num += dx * dl - dy * dm;
    den += dl * dl + dm * dm;
  });
  const s = num / den;
  const ax = mPx - s * mLon;
  const ay = mPy + s * mMy;

  let sq = 0;
  used.forEach((_, i) => {
    sq += (ax + s * lon[i]! - px[i]!) ** 2 + (ay - s * my[i]! - py[i]!) ** 2;
  });
  const rmsErrorPx = Math.sqrt(sq / used.length);
  const pixelAspect = used.length >= 3 ? Math.abs(slope(lon, px) / slope(my, py)) : null;

  // Pixel centers are integers, so the image's outer edges sit at -0.5 and size-0.5.
  const lonAt = (x: number) => (x - ax) / s;
  const latAt = (y: number) => invMercY((ay - y) / s);
  const r6 = (v: number) => Math.round(v * 1e6) / 1e6;
  const west = r6(lonAt(-0.5)), east = r6(lonAt(img.width - 0.5));
  const north = r6(latAt(-0.5)), south = r6(latAt(img.height - 0.5));

  const good =
    usable.length >= 3 &&
    rmsErrorPx / Math.max(img.width, img.height) < 0.005 &&
    (pixelAspect === null || Math.abs(pixelAspect - 1) < 0.03);

  return {
    bounds: [west, south, east, north],
    corners: [
      [west, north],
      [east, north],
      [east, south],
      [west, south],
    ],
    projection: 'EPSG:3857',
    width: img.width,
    height: img.height,
    rmsErrorPx: Math.round(rmsErrorPx * 100) / 100,
    pixelAspect: pixelAspect === null ? null : Math.round(pixelAspect * 1000) / 1000,
    clippedCorners,
    quality: good ? 'good' : 'low',
  };
}
