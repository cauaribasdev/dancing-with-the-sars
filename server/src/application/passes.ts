import { dedupeAcquisitions } from '../domain/acquisitions';
import { summarize, type CoverageSummary } from '../domain/coverage';
import { DomainError } from '../domain/errors';
import type { DataSource, Pass, ProductId } from '../domain/pass';
import type { Region, RegionKind, RegionSummary } from '../domain/region';
import { windowDays } from '../shared/dates';
import { UpstreamError, type Deps } from './ports';

const upstream = (err: unknown): never => {
  if (err instanceof UpstreamError) {
    throw new DomainError('upstream', 'upstream_unavailable', `NASA CMR is unavailable and nothing is cached for this query: ${err.message}`);
  }
  throw err;
};

export async function findPassById(deps: Deps, id: string, product: ProductId = 'GCOV') {
  const { pass, source } = await deps.catalog.findById(product, id).catch(upstream);
  if (!pass) throw new DomainError('not_found', 'pass_not_found', `No ${product} pass with id "${id}".`);
  return { pass, source };
}

/** Browse URL + fitted georeference; a failed PNG download becomes an 'upstream' DomainError, not a crash. */
export async function describeBrowse(deps: Deps, pass: Pass) {
  try {
    return await deps.browse.describe(pass);
  } catch (err) {
    throw new DomainError('upstream', 'browse_unavailable', `Could not georeference the browse image: ${(err as Error).message}`);
  }
}

export interface QueryWindow {
  start: string;
  end: string;
  product: ProductId;
}

export const toSummary = ({ geometry: _g, ...rest }: Region): RegionSummary => rest;

export function requireRegion(deps: Deps, id: string): Region {
  const region = deps.regions.get(id);
  if (!region) throw new DomainError('not_found', 'region_not_found', `Unknown region "${id}". See GET /api/regions for valid ids.`);
  return region;
}

export function checkWindow(region: Region, w: QueryWindow, maxRangeDays: Record<RegionKind, number>): void {
  if (w.start > w.end) throw new DomainError('invalid', 'invalid_window', '"start" must be on or before "end".');
  const max = maxRangeDays[region.kind];
  const days = windowDays(w.start, w.end);
  if (days > max) {
    throw new DomainError(
      'invalid',
      'window_too_large',
      `Window of ${days} days is too large for a ${region.kind} (max ${max} days). Narrow the dates or pick a smaller region.`,
    );
  }
}

function catalogPasses(deps: Deps, region: Region, w: QueryWindow) {
  return deps.catalog.findPasses({ product: w.product, bbox: region.bbox, start: w.start, end: w.end }).catch(upstream);
}

/** NISAR acquisitions whose footprint intersects the region (not just its bounding box), one record per acquisition. */
export async function findRegionPasses(
  deps: Deps,
  regionId: string,
  w: QueryWindow,
): Promise<{ region: RegionSummary; passes: Pass[]; source: DataSource }> {
  const region = requireRegion(deps, regionId);
  checkWindow(region, w, deps.limits.maxRangeDays);
  const { passes, source } = await catalogPasses(deps, region, w);
  const inside = passes.filter((p) => deps.regions.intersects(region, p.footprint, p.bbox));
  return { region: toSummary(region), passes: dedupeAcquisitions(inside), source };
}

export interface StateCoverage extends CoverageSummary {
  id: string;
  code: string;
  name: string;
  parentId?: string;
}

/** Per-state coverage across Brazil - feeds the choropleth on the country map. */
export async function brazilCoverage(
  deps: Deps,
  w: QueryWindow,
): Promise<{ total: CoverageSummary; states: StateCoverage[]; source: DataSource }> {
  const { passes, source } = await findRegionPasses(deps, 'br', w);
  const states = deps.regions.list('state').map((s) => {
    const region = requireRegion(deps, s.id);
    const inState = passes.filter((p) => deps.regions.intersects(region, p.footprint, p.bbox));
    return { id: s.id, code: s.code, name: s.name, parentId: s.parentId, ...summarize(inState) };
  });
  return { total: summarize(passes), states, source };
}
