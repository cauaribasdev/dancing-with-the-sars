import { afterEach, describe, expect, it, vi } from 'vitest';
import { createIpeaCatalog } from '../src/infra/ipea/catalog';
import { createMemoryCache } from '../src/infra/cache/cache';

const csv = [
  'cnpj;tx_razao_social_osc;tx_nome_fantasia_osc;situacao_cadastral;removida_do_mosc;cd_municipio;municipio_nome;UF_Sigla;longitude;latitude;Area_Assistencia_social;Area_Saude;Area_Desenvolvimento_e_defesa_de_direitos_e_interesses',
  '12345678000199;Razão Social;"OSC; Sul";Ativa;não;4314902;Porto Alegre;RS;-51,23;-30,03;1;0;1',
  '12345678000188;Razão Social 2;OSC Saúde;Ativa;não;4205407;Florianópolis;SC;-48,55;-27,59;0;1;0',
  '12345678000177;Encerrada;OSC Inativa;Baixada;sim;4314902;Porto Alegre;RS;-51,23;-30,03;1;1;0',
].join('\r\n');

afterEach(() => vi.unstubAllGlobals());

describe('IPEA organization catalog', () => {
  it('streams and decodes CSV, filters by state and area, and reports snapshot staleness', async () => {
    const fetch = vi.fn(async () => new Response(new TextEncoder().encode(csv), {
      headers: { 'last-modified': 'Tue, 18 Aug 2026 17:30:58 GMT' },
    }));
    vi.stubGlobal('fetch', fetch);
    const catalog = createIpeaCatalog({ cache: createMemoryCache(), url: 'https://example.test/20260818.csv', now: () => new Date('2026-11-15T00:00:00Z') });

    const rs = await catalog.findOrganizations('rs', ['5']);
    expect(rs.organizations).toHaveLength(1);
    expect(rs.organizations[0]).toMatchObject({ id: '12345678000199', name: 'OSC; Sul', areas: ['Assistência social'], municipality: { code: '4314902' }, lon: -51.23, lat: -30.03 });
    expect(rs.snapshotDate).toBe('2026-08-18');
    expect(rs.source).toBe('stale');
    expect((await catalog.findOrganizations('rs', ['2'])).organizations).toHaveLength(0);
    await expect(catalog.findOrganizations('rs', ['12'])).rejects.toThrow();
    expect((await catalog.findOrganizations('sc', ['2'])).organizations).toHaveLength(1);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('rejects malformed source schema', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('wrong;columns\n1;2')));
    const catalog = createIpeaCatalog({ cache: createMemoryCache(), url: 'https://example.test/data.csv' });
    await expect(catalog.findOrganizations('rs', ['5'])).rejects.toThrow('unexpected schema');
  });

  it('serves an old cached snapshot as stale when refresh fails', async () => {
    const cache = createMemoryCache();
    vi.stubGlobal('fetch', vi.fn(async () => new Response(csv, { headers: { 'last-modified': 'Tue, 18 Aug 2026 17:30:58 GMT' } })));
    const catalog = createIpeaCatalog({ cache, url: 'https://example.test/20260818.csv', now: () => new Date('2026-11-15T00:00:00Z') });
    const first = await catalog.findOrganizations('rs', ['5']);
    expect(first.source).toBe('stale');
    vi.stubGlobal('fetch', vi.fn(async () => new Response('down', { status: 503 })));
    const refreshed = createIpeaCatalog({ cache, url: 'https://example.test/20260818.csv', now: () => new Date('2026-11-15T00:00:00Z') });
    expect((await refreshed.findOrganizations('rs', ['5'])).source).toBe('stale');
  });
});
