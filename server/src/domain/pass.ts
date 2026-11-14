import type { MultiPolygon, Polygon } from 'geojson';

/** [west, south, east, north] in degrees. */
export type BBox = [number, number, number, number];

export type ProductId = 'GCOV';

/** NISAR data maturity, mapped from the CMR collection the granule belongs to. */
export type Maturity = 'validated' | 'provisional' | 'beta';

export type Direction = 'ascending' | 'descending';

/** Where a response's data came from: live from CMR, fresh cache, or stale cache served because CMR failed. */
export type DataSource = 'live' | 'cache' | 'stale';

/**
 * One NISAR acquisition ("passagem") over the ground, normalized from a CMR UMM-G record.
 * Kept small on purpose: this is what gets cached and sent to the frontend.
 */
export interface Pass {
  /** CMR GranuleUR, e.g. NISAR_L2_PR_GCOV_026_053_D_103_4005_DHDH_A_20260723T213350_... */
  id: string;
  conceptId: string;
  product: ProductId;
  collection: string;
  maturity: Maturity;
  productVersion: string | null;
  /** ISO timestamps (UTC). */
  start: string;
  end: string;
  /** UTC calendar date of acquisition start, YYYY-MM-DD. */
  date: string;
  /** 12-day repeat cycle number (parsed from the granule name). */
  cycle: number | null;
  orbit: number | null;
  track: number;
  frame: number;
  direction: Direction;
  /**
   * Same viewing geometry = same track + direction + frame (CMR STACK_ID, e.g. "053_D_103").
   * Only passes with the same stackId should be compared pixel-by-pixel for change detection.
   */
  stackId: string;
  fullFrame: boolean;
  frequencies: string[];
  /** Polarizations of frequency A, e.g. ["HH","HV"]. */
  polarizations: string[];
  rangeBandwidthMHz: number | null;
  sizeBytes: number | null;
  footprint: Polygon | MultiPolygon;
  bbox: BBox;
  browse: {
    /** Quick-look PNG resampled to lat/lon. Open access (no login). */
    latlon: string | null;
    thumbnail: string | null;
  };
  /** Full HDF5 product. Requires a free NASA Earthdata Login. */
  download: string | null;
  qaReport: string | null;
}
