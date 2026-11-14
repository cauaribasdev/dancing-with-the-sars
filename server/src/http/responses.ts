import type { Context } from 'hono';
import type { DataSource } from '../domain/pass';

/** JSON body with `dataSource` plus the X-Data-Source header, for responses built from the catalog. */
export function withSource<T extends object>(c: Context, source: DataSource, body: T) {
  c.header('X-Data-Source', source);
  return c.json({ dataSource: source, ...body });
}
