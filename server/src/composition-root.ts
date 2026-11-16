import type { Deps } from './application/ports';
import { config } from './config';
import { createBrowseService } from './infra/browse/browse-service';
import { createDiskCache } from './infra/cache/cache';
import { createCmrCatalog } from './infra/cmr/catalog';
import { createInmetCatalog } from './infra/inmet/catalog';
import { createIpeaCatalog } from './infra/ipea/catalog';
import { RegionIndex } from './infra/regions/region-index';

/**
 * Production wiring: IBGE regions + NASA CMR catalog + browse georeferencing, sharing one disk cache.
 * This is the only place that picks the infra implementation behind each port.
 */
export function createDeps(): Deps {
  const cache = createDiskCache(config.cacheDir);
  return {
    regions: RegionIndex.fromFile(),
    catalog: createCmrCatalog({
      baseUrl: config.cmrBaseUrl,
      cache,
      timeoutMs: config.requestTimeoutMs,
      pageSize: config.cmrPageSize,
      concurrency: config.cmrConcurrency,
      ttlPastMs: config.cacheTtlPastMs,
      ttlRecentMs: config.cacheTtlRecentMs,
    }),
    browse: createBrowseService({ cache }),
    alerts: createInmetCatalog({
      baseUrl: config.inmetBaseUrl,
      cache,
      ttlMs: config.inmetCacheTtlMs,
      maxAgeMs: config.inmetMaxAgeMs,
      timeoutMs: config.inmetTimeoutMs,
    }),
    organizations: createIpeaCatalog({ cache, url: config.ipeaCsvUrl, timeoutMs: config.ipeaTimeoutMs }),
    limits: { maxRangeDays: config.maxRangeDays },
  };
}
