import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import type { Deps } from '../application/ports';
import { handleError, handleNotFound } from './errors';
import { coverageRoutes } from './routes/coverage';
import { metaRoutes } from './routes/meta';
import { passRoutes } from './routes/passes';
import { regionRoutes } from './routes/regions';
import { storyRoutes } from './routes/stories';

/** The HTTP API: middleware, error mapping, and every router mounted under /api. */
export function createApp(deps: Deps, opts: { corsOrigin?: string; logRequests?: boolean } = {}) {
  const app = new Hono();
  app.use('*', cors({ origin: opts.corsOrigin ?? '*', exposeHeaders: ['X-Data-Source'] }));
  if (opts.logRequests) app.use('*', logger());

  app.onError(handleError);
  app.notFound(handleNotFound);

  const api = new Hono();
  api.route('/', metaRoutes());
  api.route('/', regionRoutes(deps));
  api.route('/', passRoutes(deps));
  api.route('/', coverageRoutes(deps));
  api.route('/', storyRoutes(deps));

  app.route('/api', api);
  return app;
}
