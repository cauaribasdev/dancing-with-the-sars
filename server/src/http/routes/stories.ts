import { Hono } from 'hono';
import type { Deps } from '../../application/ports';
import { listStories, resolveStory } from '../../application/stories/resolve';

export function storyRoutes(deps: Deps) {
  const r = new Hono();

  r.get('/stories', (c) => c.json({ stories: listStories() }));

  r.get('/stories/:id', async (c) => {
    const story = await resolveStory(deps, c.req.param('id'));
    c.header('X-Data-Source', story.dataSource);
    return c.json(story);
  });

  return r;
}
