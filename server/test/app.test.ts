import { describe, expect, it } from 'vitest';
import { createApp } from '../src/http/app';
import { makePass, testDeps } from './helpers';
import type { WeatherAlert } from '../src/domain/alerts';

const southern = makePass({ date: '2026-07-23' });
// A pass whose footprint is entirely in Uruguay: inside the RS bbox, but not inside RS.
const uruguay = makePass({
  date: '2026-07-23',
  stackId: '999_D_001',
  footprint: {
    type: 'Polygon',
    coordinates: [[[-56.5, -34.5], [-55.5, -34.5], [-55.5, -34.0], [-56.5, -34.0], [-56.5, -34.5]]],
  },
  bbox: [-56.5, -34.5, -55.5, -34.0],
});
const before = makePass({ date: '2026-07-11', cycle: 25 });

function setup() {
  const deps = testDeps([before, southern, uruguay]);
  return { app: createApp(deps), deps };
}

const get = async (app: ReturnType<typeof createApp>, path: string) => {
  const res = await app.request(path);
  return { status: res.status, headers: res.headers, body: (await res.json()) as any };
};

describe('API', () => {
  it('GET /api/regions lists the country, 5 macro-regions and 27 states', async () => {
    const { app } = setup();
    const { status, body } = await get(app, '/api/regions');
    expect(status).toBe(200);
    expect(body.regions).toHaveLength(33);
    expect(body.regions.find((r: any) => r.id === 'rs')).toMatchObject({ kind: 'state', name: 'Rio Grande do Sul', parentId: 'sul' });
    expect(body.regions[0].geometry).toBeUndefined();
  });

  it('GET /api/regions/geojson?kind=state returns 27 features', async () => {
    const { app } = setup();
    const { body } = await get(app, '/api/regions/geojson?kind=state');
    expect(body.type).toBe('FeatureCollection');
    expect(body.features).toHaveLength(27);
  });

  it('GET /api/regions/rs/passes filters by the state polygon, not just its bbox', async () => {
    const { app } = setup();
    const { status, headers, body } = await get(app, '/api/regions/rs/passes?start=2026-07-01&end=2026-07-31');
    expect(status).toBe(200);
    expect(headers.get('x-data-source')).toBe('live');
    expect(body.passes.map((p: any) => p.id)).toEqual([before.id, southern.id]);
    expect(body.summary).toMatchObject({ acquisitions: 2, firstDate: '2026-07-11', lastDate: '2026-07-23' });
    expect(body.timeline).toHaveLength(2);
  });

  it('GET /api/regions/rs/pairs?eventDate= returns before/after pairs', async () => {
    const { app } = setup();
    const { body } = await get(app, '/api/regions/rs/pairs?start=2026-07-01&end=2026-07-31&eventDate=2026-07-22');
    expect(body.query.mode).toBe('event');
    expect(body.pairs).toHaveLength(1);
    expect(body.pairs[0]).toMatchObject({ stackId: '053_D_103', daysApart: 12, daysAfterEvent: 1 });
  });

  it('GET /api/passes/:id/browse returns the georeference', async () => {
    const { app } = setup();
    const { status, body } = await get(app, `/api/passes/${southern.id}/browse`);
    expect(status).toBe(200);
    expect(body.georef.projection).toBe('EPSG:3857');
    expect(body.georef.corners).toHaveLength(4);
  });

  it('GET /api/stories/rs-flood-jul-2026 resolves featured pairs with browse info', async () => {
    const { app } = setup();
    const { status, body } = await get(app, '/api/stories/rs-flood-jul-2026');
    expect(status).toBe(200);
    const pair = body.pairs[0];
    expect(pair.featured).toBe(true);
    expect(pair.placesCovered).toContain('Porto Alegre / Guaíba');
    expect(pair.browse.before.georef.quality).toBe('good');
    expect(body.sources.length).toBeGreaterThan(0);
  });

  it('GET /api/regions/rs/posts returns passes, compatible pairs and matching stories', async () => {
    const { app } = setup();
    const { status, headers, body } = await get(app, '/api/regions/rs/posts?start=2026-07-01&end=2026-07-31');
    expect(status).toBe(200);
    expect(headers.get('x-data-source')).toBe('live');
    expect(body.dataSource).toBe('live');
    expect(body.posts).toHaveLength(4);
    expect(body.posts.map((post: any) => post.kind)).toEqual(['pass', 'pair', 'story', 'pass']);
    expect(body.posts[1].link).toMatchObject({ page: 'compare', before: before.id, after: southern.id });
    expect(body.posts[2].link).toMatchObject({ page: 'story', storyId: 'rs-flood-jul-2026' });
  });

  it('GET /api/regions/:id/posts validates state-only, filters, and stable pagination', async () => {
    const { app } = setup();
    const first = await get(app, '/api/regions/rs/posts?start=2026-07-01&end=2026-07-31&limit=1');
    expect(first.status).toBe(200);
    expect(first.body.total).toBe(4);
    expect(first.body.posts).toHaveLength(1);
    expect(first.body.nextCursor).toBe('1');

    const second = await get(app, '/api/regions/rs/posts?start=2026-07-01&end=2026-07-31&limit=1&cursor=1');
    expect(second.body.posts[0].id).not.toBe(first.body.posts[0].id);
    expect(second.body.nextCursor).toBe('2');

    const country = await get(app, '/api/regions/br/posts');
    expect(country.status).toBe(400);
    expect(country.body.error.code).toBe('state_only');

    const invalidLimit = await get(app, '/api/regions/rs/posts?limit=101');
    expect(invalidLimit.status).toBe(400);
    expect(invalidLimit.body.error.code).toBe('invalid_query');
  });

  it('GET /api/regions/:id/alerts filters by IBGE state and orders active before recently expired', async () => {
    const now = Date.now();
    const active: WeatherAlert = {
      id: 'active', sent: new Date(now).toISOString(), event: 'Chuva', severity: 'moderate', color: '#FFFE00',
      onset: new Date(now - 60_000).toISOString(), expires: new Date(now + 60 * 60_000).toISOString(),
      headline: 'Ativo', description: 'Descrição oficial', instruction: 'Orientação oficial', url: 'https://avisos.inmet.gov.br/1',
      municipalities: [{ code: '4314902', name: 'Porto Alegre' }, { code: '4205407', name: 'Florianópolis' }],
      municipalityCountTotal: 2, geometry: null,
    };
    const expired: WeatherAlert = {
      ...active, id: 'expired', severity: 'extreme', headline: 'Expirado',
      onset: new Date(now - 50 * 60 * 60_000).toISOString(), expires: new Date(now - 24 * 60 * 60_000).toISOString(),
      municipalities: [{ code: '4304606', name: 'Canoas' }], municipalityCountTotal: 1,
    };
    const historical: WeatherAlert = {
      ...expired, id: 'historical', headline: 'Histórico',
      onset: new Date(now - 96 * 60 * 60_000).toISOString(), expires: new Date(now - 72 * 60 * 60_000).toISOString(),
    };
    const deps = testDeps([before, southern]);
    deps.alerts = { async findAlerts() { return { alerts: [historical, expired, active], updatedAt: new Date(now).toISOString(), source: 'live' }; } };
    const app = createApp(deps);

    const activeOnly = await get(app, '/api/regions/rs/alerts');
    expect(activeOnly.status).toBe(200);
    expect(activeOnly.headers.get('x-data-source')).toBe('live');
    expect(activeOnly.body.alerts.map((alert: any) => alert.id)).toEqual(['active']);
    expect(activeOnly.body.alerts[0].municipalities).toEqual([{ code: '4314902', name: 'Porto Alegre' }]);
    expect(activeOnly.body.alerts[0].municipalityCountTotal).toBe(2);
    expect(activeOnly.body.summary).toEqual({ active: 1, highestSeverity: 'moderate' });

    const recent = await get(app, '/api/regions/rs/alerts?include=recent');
    expect(recent.body.alerts.map((alert: any) => [alert.id, alert.status])).toEqual([['active', 'active'], ['expired', 'expired']]);

    const history = await get(app, '/api/regions/rs/alerts?include=history');
    expect(history.status).toBe(200);
    expect(history.body.alerts.map((alert: any) => [alert.id, alert.status])).toEqual([
      ['active', 'active'], ['expired', 'expired'], ['historical', 'expired'],
    ]);
  });

  it('GET /api/regions/br/alerts returns nationwide municipalities and rejects macro-regions', async () => {
    const alert: WeatherAlert = {
      id: 'national', sent: new Date().toISOString(), event: 'Chuva', severity: 'severe', color: '#FF0000',
      onset: new Date(Date.now() - 60_000).toISOString(), expires: new Date(Date.now() + 60 * 60_000).toISOString(),
      headline: 'Aviso', description: 'Descrição', instruction: 'Orientação', url: 'https://avisos.inmet.gov.br/1',
      municipalities: [{ code: '4314902', name: 'Porto Alegre' }, { code: '4205407', name: 'Florianópolis' }],
      municipalityCountTotal: 2, geometry: null,
    };
    const deps = testDeps([]);
    deps.alerts = { async findAlerts() { return { alerts: [alert], updatedAt: new Date().toISOString(), source: 'cache' }; } };
    const app = createApp(deps);
    const national = await get(app, '/api/regions/br/alerts');
    expect(national.status).toBe(200);
    expect(national.body.alerts[0].municipalities).toHaveLength(2);
    expect(national.body.dataSource).toBe('cache');
    const macro = await get(app, '/api/regions/sul/alerts');
    expect(macro.status).toBe(400);
    expect(macro.body.error.code).toBe('state_only');
  });

  it('GET /api/regions/:id/organizations filters, sorts by distance, and paginates IPEA records', async () => {
    const deps = testDeps([]);
    deps.organizations = {
      async findOrganizations() {
        return {
          source: 'stale', snapshotDate: '2026-08-18', total: 2,
          organizations: [
            { id: '2', uf: 'rs', name: 'Mais longe', areas: ['Saúde'], municipality: { code: '4305108', name: 'Caxias do Sul' }, lon: -51.18, lat: -29.16, url: 'https://mapaosc.ipea.gov.br/detalhar/2' },
            { id: '1', uf: 'rs', name: 'Perto', areas: ['Assistência social'], municipality: { code: '4314902', name: 'Porto Alegre' }, lon: -51.23, lat: -30.03, url: 'https://mapaosc.ipea.gov.br/detalhar/1' },
          ],
        };
      },
    };
    const app = createApp(deps);
    const first = await get(app, '/api/regions/rs/organizations?areas=5,2&near=-51.23,-30.03&limit=1');
    expect(first.status).toBe(200);
    expect(first.headers.get('x-data-source')).toBe('stale');
    expect(first.body.organizations[0].id).toBe('1');
    expect(first.body.organizations[0].distanceKm).toBe(0);
    expect(first.body.reference.kind).toBe('pass');
    expect(first.body.snapshotDate).toBe('2026-08-18');
    expect(first.body.nextCursor).toBe('1');
    const second = await get(app, '/api/regions/rs/organizations?areas=5,2&near=-51.23,-30.03&limit=1&cursor=1');
    expect(second.body.organizations[0].id).toBe('2');
    expect((await get(app, '/api/regions/br/organizations')).status).toBe(400);
    expect((await get(app, '/api/regions/rs/organizations?areas=1')).body.error.code).toBe('unsupported_area');
    expect((await get(app, '/api/regions/rs/organizations?near=181,0')).body.error.code).toBe('invalid_query');
  });

  describe('errors', () => {
    it.each([
      ['/api/regions/xx/passes', 404, 'region_not_found'],
      ['/api/passes/nope/browse', 404, 'pass_not_found'],
      ['/api/stories/nope', 404, 'story_not_found'],
      ['/api/regions/rs/passes?start=2026-02-30', 400, 'invalid_query'],
      ['/api/regions/rs/passes?start=2026-08-01&end=2026-07-01', 400, 'invalid_window'],
      ['/api/coverage?start=2026-01-01&end=2026-06-30', 400, 'window_too_large'],
      ['/api/does-not-exist', 404, 'not_found'],
    ])('%s -> %i %s', async (path, status, code) => {
      const { app } = setup();
      const res = await get(app, path);
      expect(res.status).toBe(status);
      expect(res.body.error.code).toBe(code);
    });
  });
});
