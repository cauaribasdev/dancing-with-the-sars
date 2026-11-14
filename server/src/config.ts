import { fileURLToPath } from 'node:url';
import type { Maturity, ProductId } from './domain/pass';
import type { RegionKind } from './domain/region';

const num = (v: string | undefined, fallback: number) => {
  const n = Number(v);
  return Number.isFinite(n) && v !== undefined && v !== '' ? n : fallback;
};

export const config = {
  port: num(process.env.PORT, 8787),
  corsOrigin: process.env.CORS_ORIGIN ?? '*',
  cmrBaseUrl: process.env.CMR_BASE_URL ?? 'https://cmr.earthdata.nasa.gov/search',
  cacheDir: process.env.CACHE_DIR ?? fileURLToPath(new URL('../.cache/', import.meta.url)),
  /** TTL for cached CMR weeks that are fully in the past (data rarely changes). */
  cacheTtlPastMs: num(process.env.CACHE_TTL_PAST_HOURS, 24 * 7) * 3_600_000,
  /** TTL for the current/recent week (new acquisitions keep arriving). */
  cacheTtlRecentMs: num(process.env.CACHE_TTL_RECENT_HOURS, 3) * 3_600_000,
  requestTimeoutMs: num(process.env.CMR_TIMEOUT_MS, 90_000),
  cmrConcurrency: num(process.env.CMR_CONCURRENCY, 4),
  cmrPageSize: 2000,
  /** Max query window per region kind - CMR records are ~29 KB each and Brazil has ~1.5k GCOV passes/month. */
  maxRangeDays: { country: 31, region: 92, state: 366 } satisfies Record<RegionKind, number>,
  /** First date with NISAR science products over Brazil (beta collection). */
  dataStart: '2025-10-01',
};

export interface CollectionInfo {
  shortName: string;
  maturity: Maturity;
}

export const PRODUCTS: Record<ProductId, { label: string; collections: CollectionInfo[] }> = {
  GCOV: {
    label: 'Geocoded Polarimetric Covariance (radar backscatter)',
    collections: [
      { shortName: 'NISAR_L2_GCOV_V1', maturity: 'validated' },
      { shortName: 'NISAR_L2_GCOV_PROVISIONAL_V1', maturity: 'provisional' },
      { shortName: 'NISAR_L2_GCOV_BETA_V1', maturity: 'beta' },
    ],
  },
};
