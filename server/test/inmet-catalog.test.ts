import { afterEach, describe, expect, it, vi } from 'vitest';
import { createMemoryCache } from '../src/infra/cache/cache';
import { createInmetCatalog } from '../src/infra/inmet/catalog';

const alertXml = `<?xml version="1.0"?><alert xmlns="urn:oasis:names:tc:emergency:cap:1.2">
<identifier>alert-1</identifier><sent>2026-11-15T12:00:00Z</sent><info><language>pt-BR</language>
<event>Tempestade</event><severity>Moderate</severity><onset>2026-11-15T12:00:00Z</onset><expires>2026-11-16T00:00:00Z</expires>
<headline>Aviso</headline><description>Descrição</description><instruction>Orientação</instruction><web>https://avisos.inmet.gov.br/1</web>
<parameter><valueName>ColorRisk</valueName><value>#FFFE00</value></parameter>
<parameter><valueName>Municipios</valueName><value>Porto Alegre - RS (4314902)</value></parameter>
<area><polygon>-30,-51 -29,-50 -28,-49 -30,-51</polygon></area></info></alert>`;

const listing = (lastModified: string) => `<?xml version="1.0"?><ListBucketResult>
<IsTruncated>false</IsTruncated><Contents><Key>2026-11-15/wis/urn:wmo:md:br-inmet:alerts/alert.xml</Key>
<LastModified>${lastModified}</LastModified></Contents></ListBucketResult>`;

afterEach(() => vi.unstubAllGlobals());

describe('createInmetCatalog', () => {
  it('loads recent CAP objects, parses them, and caches the snapshot', async () => {
    const fetchMock = vi.fn(async (input: string | URL) => {
      const url = new URL(String(input));
      if (url.pathname.endsWith('/data/')) {
        return new Response(url.searchParams.get('prefix')?.startsWith('2026-11-15/') ? listing('2026-11-15T12:31:00.000Z') : '<ListBucketResult><IsTruncated>false</IsTruncated></ListBucketResult>');
      }
      return new Response(alertXml);
    });
    vi.stubGlobal('fetch', fetchMock);
    const catalog = createInmetCatalog({
      baseUrl: 'https://wis2bra.inmet.gov.br', cache: createMemoryCache(), ttlMs: 60_000,
      maxAgeMs: 24 * 60 * 60_000, timeoutMs: 1000, now: () => new Date('2026-11-15T13:00:00Z'),
    });

    const first = await catalog.findAlerts();
    expect(first.source).toBe('live');
    expect(first.updatedAt).toBe('2026-11-15T12:31:00.000Z');
    expect(first.alerts).toHaveLength(1);
    expect(first.alerts[0]?.municipalities[0]?.code).toBe('4314902');
    const calls = fetchMock.mock.calls.length;
    expect((await catalog.findAlerts()).source).toBe('cache');
    expect(fetchMock).toHaveBeenCalledTimes(calls);
  });

  it('marks a fresh fetch stale when the source publication is old', async () => {
    vi.stubGlobal('fetch', vi.fn(async (input: string | URL) => {
      const url = new URL(String(input));
      if (url.pathname.endsWith('/data/')) {
        return new Response(url.searchParams.get('prefix')?.startsWith('2026-11-15/') ? listing('2026-11-13T12:00:00.000Z') : '<ListBucketResult><IsTruncated>false</IsTruncated></ListBucketResult>');
      }
      return new Response(alertXml);
    }));
    const catalog = createInmetCatalog({
      baseUrl: 'https://wis2bra.inmet.gov.br', cache: createMemoryCache(), ttlMs: 60_000,
      maxAgeMs: 24 * 60 * 60_000, timeoutMs: 1000, now: () => new Date('2026-11-15T13:00:00Z'),
    });
    expect((await catalog.findAlerts()).source).toBe('stale');
  });
});
