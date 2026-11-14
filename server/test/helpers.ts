import type { BrowseService, Catalog, Deps } from '../src/application/ports';
import { config } from '../src/config';
import type { Pass } from '../src/domain/pass';
import { RegionIndex } from '../src/infra/regions/region-index';

let counter = 0;

/** A plausible GCOV pass over Porto Alegre (track 53 descending, frame 103) - override what a test cares about. */
export function makePass(overrides: Partial<Pass> = {}): Pass {
  const date = overrides.date ?? '2026-07-23';
  const stackId = overrides.stackId ?? '053_D_103';
  counter++;
  return {
    id: `NISAR_TEST_${stackId}_${date}_${counter}`,
    conceptId: `G${counter}-ASF`,
    product: 'GCOV',
    collection: 'NISAR_L2_GCOV_PROVISIONAL_V1',
    maturity: 'provisional',
    productVersion: '1.0.11',
    start: `${date}T21:33:50.000Z`,
    end: `${date}T21:34:25.000Z`,
    date,
    cycle: 26,
    orbit: 5169,
    track: 53,
    frame: 103,
    direction: 'descending',
    stackId,
    fullFrame: true,
    frequencies: ['A', 'B'],
    polarizations: ['HH', 'HV'],
    rangeBandwidthMHz: 40,
    sizeBytes: 7_004_487_680,
    footprint: {
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
    },
    bbox: [-53.48535, -30.29778, -50.42869, -27.75004],
    browse: {
      latlon: `https://nisar.asf.earthdatacloud.nasa.gov/BROWSE/TEST/${stackId}_${date}_LATLON.png`,
      thumbnail: null,
    },
    download: null,
    qaReport: null,
    ...overrides,
  };
}

/** Catalog fake that returns a fixed list (filtered by date window) and records calls. */
export function fakeCatalog(passes: Pass[]): Catalog & { calls: number } {
  const fake = {
    calls: 0,
    async findPasses({ start, end }: { start: string; end: string }) {
      fake.calls++;
      return { passes: passes.filter((p) => p.date >= start && p.date <= end), source: 'live' as const };
    },
    async findById(_product: string, id: string) {
      return { pass: passes.find((p) => p.id === id) ?? null, source: 'cache' as const };
    },
  };
  return fake;
}

export const fakeBrowse: BrowseService = {
  async describe(pass) {
    return {
      passId: pass.id,
      url: pass.browse.latlon,
      thumbnail: pass.browse.thumbnail,
      georef: {
        bounds: [-53.6, -30.4, -50.2, -27.6],
        corners: [
          [-53.6, -27.6],
          [-50.2, -27.6],
          [-50.2, -30.4],
          [-53.6, -30.4],
        ],
        projection: 'EPSG:3857',
        width: 100,
        height: 100,
        rmsErrorPx: 1,
        pixelAspect: 1,
        clippedCorners: [],
        quality: 'good',
      },
    };
  },
};

let regions: RegionIndex | undefined;
export function testDeps(passes: Pass[]): Deps & { catalog: ReturnType<typeof fakeCatalog> } {
  regions ??= RegionIndex.fromFile();
  return { regions, catalog: fakeCatalog(passes), browse: fakeBrowse, limits: { maxRangeDays: config.maxRangeDays } };
}
