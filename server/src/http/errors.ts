import type { ErrorHandler, NotFoundHandler } from 'hono';
import { DomainError, type DomainErrorKind } from '../domain/errors';

/** The only place that turns a DomainError kind into an HTTP status. */
const STATUS: Record<DomainErrorKind, 400 | 404 | 502> = {
  not_found: 404,
  invalid: 400,
  upstream: 502,
};

/** DomainError -> {error:{code,message}} with its status; anything else is a 500. */
export const handleError: ErrorHandler = (err, c) => {
  if (err instanceof DomainError) return c.json({ error: { code: err.code, message: err.message } }, STATUS[err.kind]);
  console.error(err);
  return c.json({ error: { code: 'internal_error', message: 'Unexpected server error' } }, 500);
};

export const handleNotFound: NotFoundHandler = (c) =>
  c.json({ error: { code: 'not_found', message: `No route for ${c.req.method} ${c.req.path}` } }, 404);
