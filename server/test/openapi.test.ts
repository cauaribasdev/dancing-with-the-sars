import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const spec = JSON.parse(readFileSync(new URL('../openapi.json', import.meta.url), 'utf8')) as Record<string, any>;

function refs(value: unknown, found: string[] = []): string[] {
  if (Array.isArray(value)) value.forEach((item) => refs(item, found));
  else if (value && typeof value === 'object') {
    for (const [key, nested] of Object.entries(value)) {
      if (key === '$ref' && typeof nested === 'string') found.push(nested);
      else refs(nested, found);
    }
  }
  return found;
}

function resolve(ref: string): unknown {
  if (!ref.startsWith('#/')) throw new Error(`External ref not allowed in this contract test: ${ref}`);
  return ref.slice(2).split('/').reduce<any>((value, key) => value?.[key.replace(/~1/g, '/').replace(/~0/g, '~')], spec);
}

describe('OpenAPI 3.1 optional feeds contract', () => {
  it('documents exactly the implemented feed paths and resolves every local reference', () => {
    expect(spec.openapi).toBe('3.1.0');
    const paths = Object.keys(spec.paths).sort();
    expect(paths).toEqual([
      '/api/regions/{id}/alerts',
      '/api/regions/{id}/organizations',
      '/api/regions/{id}/posts',
    ]);
    for (const ref of refs(spec)) expect(resolve(ref), ref).toBeDefined();
  });

  it('matches query parameters and wrapped object response schemas for each route', () => {
    const expected = {
      '/api/regions/{id}/alerts': ['include'],
      '/api/regions/{id}/organizations': ['areas', 'cursor', 'limit', 'near'],
      '/api/regions/{id}/posts': ['cursor', 'end', 'limit', 'product', 'start'],
    };
    for (const [path, query] of Object.entries(expected)) {
      const operation = spec.paths[path].get;
      const parameters = operation.parameters.map((p: any) => p.$ref ? resolve(p.$ref) as any : p);
      expect(parameters.filter((p: any) => p.in === 'query').map((p: any) => p.name).sort()).toEqual(query);
      const schema = operation.responses['200'].content['application/json'].schema;
      expect(schema.$ref).toMatch(/^#\/components\/schemas\//);
      expect(resolve(schema.$ref)).toMatchObject({ type: 'object' });
    }
  });

  it('defines actual IPEA area support, UTC alert timestamps, and posts pagination', () => {
    const orgParams = spec.paths['/api/regions/{id}/organizations'].get.parameters;
    const areas = orgParams.find((p: any) => p.name === 'areas').schema;
    expect(areas.default).toBe('5,2');
    expect(new RegExp(areas.pattern).test('5,2')).toBe(true);
    expect(new RegExp(areas.pattern).test('1,12')).toBe(false);

    const alert = spec.components.schemas.Alert.properties;
    expect(alert.sent.format).toBe('date-time');
    expect(alert.onset.format).toBe('date-time');
    expect(alert.expires.format).toBe('date-time');

    const posts = spec.components.schemas.PostsResponse.properties;
    expect(posts.query.type).toBe('object');
    expect(posts.total.minimum).toBe(0);
    expect(posts.nextCursor.type).toEqual(['string', 'null']);
  });
});
