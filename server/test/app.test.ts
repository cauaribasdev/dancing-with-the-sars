import { describe, expect, it } from 'vitest';
import { createApp } from '../src/http/app';
import { makePass, testDeps } from './helpers';

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
