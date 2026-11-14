import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { QueryWindow } from '../application/passes';
import { addDays, isoDate } from '../shared/dates';

/** YYYY-MM-DD that exists on the calendar (Date.parse alone accepts 2026-02-30 by rolling over). */
const dateStr = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'expected YYYY-MM-DD')
  .refine((s) => {
    const d = new Date(`${s}T00:00:00Z`);
    return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
  }, 'invalid calendar date');

export const windowQuery = z.object({
  start: dateStr.optional(),
  end: dateStr.optional(),
  product: z.enum(['GCOV']).default('GCOV'),
});

export const pairsQuery = windowQuery.extend({
  /** If set, return before/after pairs around this date instead of all consecutive pairs. */
  eventDate: dateStr.optional(),
  maxGapDays: z.coerce.number().int().min(1).max(120).default(24),
  maxDaysBefore: z.coerce.number().int().min(1).max(120).default(30),
  maxDaysAfter: z.coerce.number().int().min(1).max(120).default(30),
});

export const kindQuery = z.object({ kind: z.enum(['country', 'region', 'state']).optional() });

/** Shared 400 response for any invalid query string. */
export const validate = <T extends z.ZodType>(schema: T) =>
  zValidator('query', schema, (result, c) => {
    if (!result.success) {
      const issues = result.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message }));
      return c.json({ error: { code: 'invalid_query', message: 'Invalid query parameters', issues } }, 400);
    }
  });

/** Default window: the 30 days ending today (UTC). */
export function resolveWindow(q: { start?: string; end?: string; product: 'GCOV' }): QueryWindow {
  const end = q.end ?? isoDate(new Date());
  const start = q.start ?? isoDate(addDays(new Date(`${end}T00:00:00Z`), -29));
  return { start, end, product: q.product };
}
