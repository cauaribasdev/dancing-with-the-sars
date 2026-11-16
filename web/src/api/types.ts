// API response types, written from real /api responses (Nov 2026).
// Do not import types from server/: the contract is the JSON, not the server code.

import type { Feature, FeatureCollection, MultiPolygon, Polygon } from "geojson";

/** Date as YYYY-MM-DD (UTC). */
export type IsoDate = string;
/** [west, south, east, north] in degrees. */
export type BBox = [number, number, number, number];
export type LonLat = [number, number];

/** `live`: fresh from NASA. `cache`: server cache. `stale`: NASA failed and the server returned the last saved copy. */
export type DataSource = "live" | "cache" | "stale";

export type RegionKind = "country" | "region" | "state";

export interface Region {
  id: string; // "br", "sul", "rs", ...
  kind: RegionKind;
  code: string; // "BR", "S", "RS"
  /** Official IBGE name, in Portuguese. Display it with regionName() from api/regionNames.ts. */
  name: string;
  ibgeCode?: number; // states only
  parentId?: string; // state -> macro-region -> "br"
  bbox: BBox;
}

export interface RegionsResponse {
  regions: Region[];
}

export type RegionFeature = Feature<Polygon | MultiPolygon, Region>;
export type RegionsGeoJSON = FeatureCollection<Polygon | MultiPolygon, Region>;

export interface DateWindow {
  start: IsoDate;
  end: IsoDate;
}

export interface Query extends DateWindow {
  product: "GCOV" | (string & {});
}

/** Coverage summary for a period. Dates and gap are null when there was no pass. */
export interface CoverageSummary {
  acquisitions: number; // passes after deduplication
  distinctDates: number; // days with at least one pass
  stacks: number; // distinct geometries (track + direction + frame)
  firstDate: IsoDate | null;
  lastDate: IsoDate | null;
  medianGapDays: number | null; // typical gap between days with a pass
}

export interface StateCoverage extends CoverageSummary {
  id: string;
  code: string;
  name: string;
  parentId: string;
}

export interface CoverageResponse {
  dataSource: DataSource;
  query: Query;
  total: CoverageSummary;
  states: StateCoverage[];
}

export type Direction = "ascending" | "descending";
export type Maturity = "validated" | "provisional" | "beta";

export type AlertSeverity = "minor" | "moderate" | "severe" | "extreme";
export type AlertStatus = "active" | "expired";

export interface WeatherAlert {
  id: string;
  sent: string;
  event: string;
  severity: AlertSeverity;
  color: string;
  onset: string;
  expires: string;
  headline: string;
  description: string;
  instruction: string;
  url: string;
  municipalities: { code: string; name: string }[];
  municipalityCountTotal: number;
  geometry: Polygon | MultiPolygon | null;
  status: AlertStatus;
}

export interface AlertsResponse {
  dataSource: DataSource;
  region: Region;
  updatedAt: string;
  summary: { active: number; highestSeverity: AlertSeverity | null };
  alerts: WeatherAlert[];
}

export interface Pass {
  id: string;
  conceptId: string;
  product: string;
  collection: string;
  maturity: Maturity;
  productVersion: string;
  start: string; // ISO datetime
  end: string;
  date: IsoDate;
  cycle: number;
  orbit: number;
  track: number;
  frame: number;
  direction: Direction;
  /** track + direction + frame, e.g. "053_D_103". Only compare passes with the same stackId. */
  stackId: string;
  fullFrame: boolean;
  frequencies: string[];
  polarizations: string[];
  rangeBandwidthMHz: number;
  sizeBytes: number;
  /** Outline reported by CMR. NEVER use it to position the browse image (see BrowseInfo.georef). */
  footprint: Polygon;
  bbox: BBox;
  browse: { latlon: string; thumbnail: string };
  download: string; // HDF5, needs an Earthdata Login
  qaReport: string;
}

export interface TimelineDay {
  date: IsoDate;
  acquisitions: number;
  stacks: string[];
}

export interface RegionPassesResponse {
  dataSource: DataSource;
  region: Region;
  query: Query;
  summary: CoverageSummary;
  timeline: TimelineDay[];
  passes: Pass[];
}

export interface FootprintProperties {
  id: string;
  date: IsoDate;
  stackId: string;
  direction: Direction;
  maturity: Maturity;
  thumbnail: string;
}

export type FootprintsGeoJSON = FeatureCollection<Polygon, FootprintProperties>;

export type GeorefQuality = "good" | "low" | (string & {});

/** Browse image corners, reconstructed by the server. This is what positions the image on the map. */
export interface Georef {
  bounds: BBox;
  /** Top-left, top-right, bottom-right, bottom-left; each [lon, lat]. The MapLibre `image` source format. */
  corners: [LonLat, LonLat, LonLat, LonLat];
  projection: string; // "EPSG:3857"
  width: number;
  height: number;
  rmsErrorPx: number;
  pixelAspect: number;
  clippedCorners: number[];
  quality: GeorefQuality;
}

export interface BrowseInfo {
  passId: string;
  url: string; // PNG (2-7 MB) on ASF, CORS allowed
  thumbnail: string;
  georef: Georef | null;
}

export interface PassResponse {
  dataSource: DataSource;
  pass: Pass;
}

export interface Pair {
  stackId: string;
  track: number;
  frame: number;
  direction: Direction;
  before: Pass;
  after: Pass;
  daysApart: number;
  /** Only in `event` mode (with eventDate). */
  daysBeforeEvent?: number;
  daysAfterEvent?: number;
}

export interface RegionPairsResponse {
  dataSource: DataSource;
  region: Region;
  query: Query & { eventDate: IsoDate | null; mode: "event" | "consecutive" };
  count: number;
  pairs: Pair[];
}

export interface StoryListItem {
  id: string;
  title: string;
  subtitle: string;
  regionId: string;
  eventDate: IsoDate;
  window: DateWindow;
}

export interface StoriesResponse {
  stories: StoryListItem[];
}

export interface StoryPlace {
  name: string;
  lon: number;
  lat: number;
}

export interface StorySource {
  title: string;
  publisher: string;
  url: string;
}

export interface StoryPair extends Pair {
  daysBeforeEvent: number;
  daysAfterEvent: number;
  placesCovered: string[];
  featured: boolean;
  /** Present on featured pairs, with georeferencing already computed. */
  browse?: {
    before: BrowseInfo;
    after: BrowseInfo;
  };
}

export interface Story extends StoryListItem {
  places: StoryPlace[];
  narrative: {
    summary: string;
    whatToLookFor: string[];
    physicalDrivers: string[];
    caveats: string[];
  };
  sources: StorySource[];
  region: Region;
  dataSource: DataSource;
  summary: CoverageSummary;
  timeline: TimelineDay[];
  pairs: StoryPair[];
  passes: Pass[];
}

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    issues?: { path: string; message: string }[];
  };
}
