import { Hono } from 'hono';
import { z } from 'zod';
import { findRegionPasses, requireRegion } from '../../application/passes';
import type { Deps } from '../../application/ports';
import { STORIES } from '../../application/stories/definitions';
import { DomainError } from '../../domain/errors';
import { generatePosts } from '../../domain/posts';
import { withSource } from '../responses';
import { resolveWindow, validate, windowQuery } from '../schemas';

const postsQuery = windowQuery.extend({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.coerce.number().int().min(0).default(0),
});

export function postsRoutes(deps: Deps) {
  const r = new Hono();

  r.get('/regions/:id/posts', validate(postsQuery), async (c) => {
    const id = c.req.param('id');
    const query = c.req.valid('query');
    const region = requireRegion(deps, id);
    if (region.kind !== 'state') {
      throw new DomainError('invalid', 'state_only', 'Posts are available only for Brazilian states.');
    }

    const window = resolveWindow(query);
    const { region: regionSummary, passes, source } = await findRegionPasses(deps, id, window);
    const allPosts = generatePosts(id, passes, STORIES)
      .filter((post) => post.date >= window.start && post.date <= window.end);
    const total = allPosts.length;
    const page = allPosts.slice(query.cursor, query.cursor + query.limit);
    const nextOffset = query.cursor + page.length;

    return withSource(c, source, {
      region: regionSummary,
      query: { ...window, limit: query.limit },
      posts: page,
      total,
      nextCursor: nextOffset < total ? String(nextOffset) : null,
    });
  });

  return r;
}
