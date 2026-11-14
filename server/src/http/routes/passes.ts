import { Hono } from 'hono';
import { describeBrowse, findPassById } from '../../application/passes';
import type { Deps } from '../../application/ports';
import { withSource } from '../responses';

export function passRoutes(deps: Deps) {
  const r = new Hono();

  r.get('/passes/:id', async (c) => {
    const { pass, source } = await findPassById(deps, c.req.param('id'));
    return withSource(c, source, { pass });
  });

  /** Browse PNG URL + its fitted georeference (corners for a MapLibre image source). */
  r.get('/passes/:id/browse', async (c) => {
    const { pass } = await findPassById(deps, c.req.param('id'));
    const info = await describeBrowse(deps, pass);
    c.header('Cache-Control', 'public, max-age=86400');
    return c.json(info);
  });

  return r;
}
