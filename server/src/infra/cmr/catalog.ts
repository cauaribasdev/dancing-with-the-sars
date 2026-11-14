import { UpstreamError, type Catalog } from '../../application/ports';
import { PRODUCTS } from '../../config';
import type { Maturity, Pass, ProductId } from '../../domain/pass';
import { mapLimit } from '../../shared/async';
import { isoDate, weekBlocks } from '../../shared/dates';
import { cached, mergeSources, type Cache } from '../cache/cache';
import { normalizeGcov, type UmmItem } from './normalize';

export interface CmrCatalogOptions {
  baseUrl: string;
  cache: Cache;
  timeoutMs: number;
  pageSize: number;
  concurrency: number;
  ttlPastMs: number;
  ttlRecentMs: number;
  fetchImpl?: typeof fetch;
  now?: () => Date;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * NASA CMR granule search (https://cmr.earthdata.nasa.gov/search/site/docs/search/api.html).
 * Metadata search is open (no login). Windows are split into fixed weekly blocks that are
 * fetched in parallel and cached individually as normalized (small) Pass records.
 */
export function createCmrCatalog(opts: CmrCatalogOptions): Catalog {
  const fetchImpl = opts.fetchImpl ?? fetch;
  const now = opts.now ?? (() => new Date());

  async function fetchPage(url: string, searchAfter?: string) {
    for (let attempt = 0; ; attempt++) {
      try {
        const headers: Record<string, string> = { accept: 'application/json', 'Client-Id': 'dancing-with-the-sars' };
        if (searchAfter) headers['CMR-Search-After'] = searchAfter;
        const res = await fetchImpl(url, { headers, signal: AbortSignal.timeout(opts.timeoutMs) });
        if (!res.ok) {
          const text = (await res.text()).slice(0, 300);
          throw new UpstreamError(`CMR responded ${res.status}: ${text}`, res.status);
        }
        const body = (await res.json()) as { items?: UmmItem[] };
        return { items: body.items ?? [], searchAfter: res.headers.get('cmr-search-after') ?? undefined };
      } catch (err) {
        const retryable = !(err instanceof UpstreamError) || (err.status ?? 0) >= 500;
        if (attempt < 2 && retryable) {
          await sleep(1000 * (attempt + 1));
          continue;
        }
        throw err instanceof UpstreamError ? err : new UpstreamError(`CMR request failed: ${(err as Error).message}`);
      }
    }
  }

  async function search(product: ProductId, extra: (p: URLSearchParams) => void): Promise<Pass[]> {
    const collections = PRODUCTS[product].collections;
    const maturityOf = new Map<string, Maturity>(collections.map((c) => [c.shortName, c.maturity]));
    const params = new URLSearchParams();
    for (const c of collections) params.append('short_name[]', c.shortName);
    extra(params);
    params.set('page_size', String(opts.pageSize));
    params.set('sort_key', 'start_date');
    const url = `${opts.baseUrl}/granules.umm_json?${params}`;

    const passes: Pass[] = [];
    let searchAfter: string | undefined;
    for (;;) {
      const page = await fetchPage(url, searchAfter);
      for (const item of page.items) {
        const maturity = maturityOf.get(item.umm.CollectionReference?.ShortName ?? '');
        const pass = maturity ? normalizeGcov(item, maturity) : null;
        if (pass) passes.push(pass);
      }
      if (page.items.length < opts.pageSize || !page.searchAfter) break;
      searchAfter = page.searchAfter;
    }
    return passes;
  }

  return {
    async findPasses({ product, bbox, start, end }) {
      const recentCutoff = now().getTime() - 2 * 86_400_000;
      const blocks = weekBlocks(start, end);
      const results = await mapLimit(blocks, opts.concurrency, (b) => {
        const key = `cmr:v1:${product}:${bbox.map((n) => n.toFixed(3)).join(',')}:${isoDate(b.start)}`;
        const ttl = b.end.getTime() > recentCutoff ? opts.ttlRecentMs : opts.ttlPastMs;
        return cached(opts.cache, key, ttl, () =>
          search(product, (p) => {
            p.set('bounding_box', bbox.join(','));
            p.set('temporal[]', `${b.start.toISOString()},${b.end.toISOString()}`);
          }),
        );
      });

      const byId = new Map<string, Pass>();
      for (const r of results) for (const p of r.value) if (p.date >= start && p.date <= end) byId.set(p.id, p);
      return { passes: [...byId.values()], source: mergeSources(results.map((r) => r.source)) };
    },

    async findById(product, id) {
      const { value, source } = await cached(opts.cache, `cmr:v1:${product}:id:${id}`, opts.ttlPastMs, () =>
        search(product, (p) => p.set('granule_ur', id)),
      );
      return { pass: value[0] ?? null, source };
    },
  };
}
