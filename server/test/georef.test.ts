import type { Polygon, Position } from 'geojson';
import { describe, expect, it } from 'vitest';
import { georeferenceBrowse, invMercY, mercY, type RgbaImage } from '../src/domain/georef';

// Real footprint of the 2026-07-23 pass over Porto Alegre (track 53, frame 103).
const footprint: Polygon = {
  type: 'Polygon',
  coordinates: [
    [
      [-52.99887, -27.75004],
      [-53.48535, -29.88671],
      [-50.8593, -30.29778],
      [-50.42869, -28.16541],
      [-52.99887, -27.75004],
    ],
  ],
};

function inside([x, y]: number[], ring: Position[]): boolean {
  let hit = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i] as [number, number];
    const [xj, yj] = ring[j] as [number, number];
    if (yi > y! !== yj > y! && x! < ((xj - xi) * (y! - yi)) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
}

/** Render the footprint into a transparent RGBA image with a known Web Mercator georeference. */
function render(west: number, north: number, pxPerDeg: number, width: number, height: number): RgbaImage {
  const data = new Uint8Array(width * height * 4);
  const ring = footprint.coordinates[0]!;
  const top = mercY(north);
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const lon = west + (x + 0.5) / pxPerDeg;
      const lat = invMercY(top - (y + 0.5) / pxPerDeg);
      if (inside([lon, lat], ring)) data[(y * width + x) * 4 + 3] = 255;
    }
  return { width, height, data };
}

describe('georeferenceBrowse', () => {
  const pxPerDeg = 150;

  it('recovers the bounds of a Web Mercator image with margins (not the footprint bbox)', () => {
    const west = -53.7, north = -27.5;
    const img = render(west, north, pxPerDeg, 520, 500);
    const g = georeferenceBrowse(img, footprint)!;
    expect(g.quality).toBe('good');
    expect(g.clippedCorners).toEqual([]);
    expect(g.pixelAspect).toBeCloseTo(1, 1);
    const [w, s, e, n] = g.bounds;
    const tol = 2 / pxPerDeg; // within ~2 pixels
    expect(Math.abs(w - west)).toBeLessThan(tol);
    expect(Math.abs(n - north)).toBeLessThan(tol);
    expect(Math.abs(e - (west + 520 / pxPerDeg))).toBeLessThan(tol);
    expect(Math.abs(s - invMercY(mercY(north) - 500 / pxPerDeg))).toBeLessThan(tol);
    expect(g.corners[0]).toEqual([w, n]);
    expect(g.corners[2]).toEqual([e, s]);
  });

  it('ignores a corner cut off by the image border', () => {
    // Image ends before the footprint's southern vertex (lat -30.30) -> bottom is clipped.
    const west = -53.7, north = -27.5;
    const height = Math.floor((mercY(north) - mercY(-30.1)) * pxPerDeg);
    const img = render(west, north, pxPerDeg, 520, height);
    const g = georeferenceBrowse(img, footprint)!;
    expect(g.clippedCorners).toEqual(['bottom']);
    expect(g.quality).toBe('good');
    expect(Math.abs(g.bounds[0] - west)).toBeLessThan(2 / pxPerDeg);
    expect(Math.abs(g.bounds[3] - north)).toBeLessThan(2 / pxPerDeg);
  });

  it('returns null for a fully transparent image', () => {
    expect(georeferenceBrowse({ width: 4, height: 4, data: new Uint8Array(64) }, footprint)).toBeNull();
  });
});
