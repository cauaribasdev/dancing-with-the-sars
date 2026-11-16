/**
 * Ports: what the use cases need from the outside world. Implementations live in infra/
 * (wired in composition-root.ts); tests pass fakes (test/helpers.ts).
 */
import type { FeatureCollection, MultiPolygon, Polygon } from 'geojson';
import type { BrowseGeoref } from '../domain/georef';
import type { WeatherAlert } from '../domain/alerts';
import type { Organization } from '../domain/organizations';
import type { BBox, DataSource, Pass, ProductId } from '../domain/pass';
import type { Region, RegionKind, RegionSummary } from '../domain/region';

export interface PassQuery {
  product: ProductId;
  bbox: BBox;
  /** Inclusive YYYY-MM-DD window. */
  start: string;
  end: string;
}

/** Anything that can answer "which NISAR passes exist here, in this window?" (CMR in prod, a fake in tests). */
export interface Catalog {
  findPasses(q: PassQuery): Promise<{ passes: Pass[]; source: DataSource }>;
  /** Look up a single pass by its granule id (GranuleUR). */
  findById(product: ProductId, id: string): Promise<{ pass: Pass | null; source: DataSource }>;
}

/** Thrown by a Catalog when the upstream service fails and nothing usable is cached. */
export class UpstreamError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
    this.name = 'UpstreamError';
  }
}

export interface BrowseInfo {
  passId: string;
  url: string | null;
  thumbnail: string | null;
  /** null when the pass has no browse image or the PNG had no valid pixels. */
  georef: BrowseGeoref | null;
}

/** Georeferences a pass's browse image. */
export interface BrowseService {
  describe(pass: Pass): Promise<BrowseInfo>;
}

/** Nationwide alert snapshot from the INMET CAP catalog. */
export interface AlertCatalog {
  findAlerts(): Promise<{ alerts: WeatherAlert[]; updatedAt: string; source: DataSource }>;
}

export interface OrganizationCatalog {
  findOrganizations(stateId: string, areaIds: string[]): Promise<{
    organizations: Organization[];
    total: number;
    snapshotDate: string;
    source: DataSource;
  }>;
}

/** Brazilian country / macro-regions / states and geometric tests against them. */
export interface RegionRepository {
  get(id: string): Region | undefined;
  list(kind?: RegionKind): RegionSummary[];
  featureCollection(kind?: RegionKind): FeatureCollection<Polygon | MultiPolygon, RegionSummary>;
  intersects(region: Region, geom: Polygon | MultiPolygon, geomBbox?: BBox): boolean;
}

export interface Limits {
  /** Max query window in days, per region kind. */
  maxRangeDays: Record<RegionKind, number>;
}

/** Everything a use case may depend on. Built in composition-root.ts. */
export interface Deps {
  regions: RegionRepository;
  catalog: Catalog;
  browse: BrowseService;
  alerts: AlertCatalog;
  organizations: OrganizationCatalog;
  limits: Limits;
}
