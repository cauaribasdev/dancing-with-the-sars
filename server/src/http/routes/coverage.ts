import { Hono } from 'hono';
import { brazilCoverage } from '../../application/passes';
import type { Deps } from '../../application/ports';
import { withSource } from '../responses';
import { resolveWindow, validate, windowQuery } from '../schemas';

export function coverageRoutes(deps: Deps) {
  const r = new Hono();

  r.get('/coverage', validate(windowQuery), async (c) => {
    const w = resolveWindow(c.req.valid('query'));
    const { total, states, source } = await brazilCoverage(deps, w);
    return withSource(c, source, { query: w, total, states });
  });

  return r;
}
