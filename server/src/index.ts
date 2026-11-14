import { serve } from '@hono/node-server';
import { createApp } from './http/app';
import { config } from './config';
import { createDeps } from './composition-root';

const app = createApp(createDeps(), { corsOrigin: config.corsOrigin, logRequests: true });

serve({ fetch: app.fetch, port: config.port }, (info) => {
  console.log(`NISAR API listening on http://localhost:${info.port}/api`);
});
