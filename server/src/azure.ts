import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { createApp } from './http/app';
import { config } from './config';
import { createDeps } from './composition-root';

const app = createApp(createDeps(), { corsOrigin: config.corsOrigin, logRequests: true });
const files = serveStatic({ root: './web/dist' });
const index = serveStatic({ path: './web/dist/index.html' });
app.get('*', async (c, next) => {
  if (c.req.path === '/api' || c.req.path.startsWith('/api/')) return next();
  return files(c, next);
});
app.get('*', (c, next) => {
  if (c.req.path === '/api' || c.req.path.startsWith('/api/') || c.req.path.split('/').pop()?.includes('.')) return next();
  return index(c, next);
});
serve({ fetch: app.fetch, port: config.port, hostname: '0.0.0.0' }, (info) => {
  console.log(`Dancing with the SARs listening on port ${info.port}`);
});
