import { Hono } from 'hono';
import { findRegionPasses, requireRegion } from '../../application/passes';
import type { Deps } from '../../application/ports';
import { summarize, timeline } from '../../domain/coverage';
import { bracketingPairs, consecutivePairs } from '../../domain/pairs';
import type { Pass } from '../../domain/pass';
import { withSource } from '../responses';
import { kindQuery, pairsQuery, resolveWindow, validate, windowQuery } from '../schemas';

/**
 * Footprint polygons for the map. Note: the browse PNG does NOT span the footprint bbox -
 * get its real corners from GET /api/passes/:id/browse before overlaying it.
 */
const footprintFeature = (p: Pass) => ({
  type: 'Feature' as const,
  geometry: p.footprint,
  properties: {
    id: p.id,
    date: p.date,
    stackId: p.stackId,
    direction: p.direction,
    maturity: p.maturity,
    thumbnail: p.browse.thumbnail,
  },
});

export function regionRoutes(deps: Deps) {
  const r = new Hono();

  r.get('/regions', validate(kindQuery), (c) => {
    const { kind } = c.req.valid('query');
    return c.json({ regions: deps.regions.list(kind) });
  });

  // Registered before /regions/:id so "geojson" is not taken as an id.
  r.get('/regions/geojson', validate(kindQuery), (c) => {
    const { kind } = c.req.valid('query');
    c.header('Cache-Control', 'public, max-age=86400');
    return c.json(deps.regions.featureCollection(kind));
  });

  r.get('/regions/:id', (c) => {
    const { geometry: _g, ...region } = requireRegion(deps, c.req.param('id'));
    return c.json({ region });
  });

  r.get('/regions/:id/passes', validate(windowQuery), async (c) => {
    const w = resolveWindow(c.req.valid('query'));
    const { region, passes, source } = await findRegionPasses(deps, c.req.param('id'), w);
    return withSource(c, source, {
      region,
      query: w,
      summary: summarize(passes),
      timeline: timeline(passes),
      passes,
    });
  });

  r.get('/regions/:id/footprints', validate(windowQuery), async (c) => {
    const w = resolveWindow(c.req.valid('query'));
    const { passes, source } = await findRegionPasses(deps, c.req.param('id'), w);
    c.header('X-Data-Source', source);
    return c.json({ type: 'FeatureCollection', features: passes.map(footprintFeature) });
  });

  r.get('/regions/:id/pairs', validate(pairsQuery), async (c) => {
    const q = c.req.valid('query');
    const w = resolveWindow(q);
    const { region, passes, source } = await findRegionPasses(deps, c.req.param('id'), w);
    const pairs = q.eventDate
      ? bracketingPairs(passes, q.eventDate, { maxDaysBefore: q.maxDaysBefore, maxDaysAfter: q.maxDaysAfter })
      : consecutivePairs(passes, q.maxGapDays);
    return withSource(c, source, {
      region,
      query: { ...w, eventDate: q.eventDate ?? null, mode: q.eventDate ? 'event' : 'consecutive' },
      count: pairs.length,
      pairs,
    });
  });

  return r;
}
