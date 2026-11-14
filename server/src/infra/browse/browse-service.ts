import { PNG } from 'pngjs';
import type { BrowseService } from '../../application/ports';
import { georeferenceBrowse } from '../../domain/georef';
import { cached, type Cache } from '../cache/cache';

const ALLOWED_PREFIX = 'https://nisar.asf.earthdatacloud.nasa.gov/BROWSE/';

/**
 * Downloads a pass's LATLON browse PNG once, fits its georeference and caches the result
 * forever (a published browse image never changes). The PNG itself is not stored: the
 * frontend loads it straight from ASF (CORS is open).
 */
export function createBrowseService(opts: { cache: Cache; fetchImpl?: typeof fetch; timeoutMs?: number }): BrowseService {
  const fetchImpl = opts.fetchImpl ?? fetch;
  return {
    async describe(pass) {
      const url = pass.browse.latlon;
      const base = { passId: pass.id, url, thumbnail: pass.browse.thumbnail };
      if (!url) return { ...base, georef: null };
      if (!url.startsWith(ALLOWED_PREFIX)) throw new Error(`Refusing to fetch unexpected browse URL: ${url}`);

      const { value } = await cached(opts.cache, `browse-georef:v1:${pass.id}`, Number.POSITIVE_INFINITY, async () => {
        const res = await fetchImpl(url, { signal: AbortSignal.timeout(opts.timeoutMs ?? 60_000) });
        if (!res.ok) throw new Error(`Browse download failed (${res.status}) for ${url}`);
        const png = PNG.sync.read(Buffer.from(await res.arrayBuffer()));
        return georeferenceBrowse(png, pass.footprint);
      });
      return { ...base, georef: value };
    },
  };
}
