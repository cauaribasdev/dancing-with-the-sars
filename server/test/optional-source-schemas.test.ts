import { describe, expect, it } from 'vitest';
import {
  alertsResponseSchema,
  organizationsResponseSchema,
  postsResponseSchema,
} from '../src/http/optional-source-schemas';

const region = { id: 'rs', name: 'Rio Grande do Sul' };
const polygon = {
  type: 'Polygon' as const,
  coordinates: [[[-51, -30], [-50, -30], [-50, -29], [-51, -30]]],
};
const multiPolygon = {
  type: 'MultiPolygon' as const,
  coordinates: [[[[ -51, -30], [-50, -30], [-50, -29], [-51, -30]]]],
};

const alert = {
  id: 'alert-1', sent: '2026-11-15T11:00:00Z', event: 'Tempestade', severity: 'moderate', color: '#FFFE00',
  onset: '2026-11-15T12:00:00Z', expires: '2026-11-16T12:00:00Z', status: 'active',
  headline: 'Aviso', description: 'Descrição', instruction: 'Instrução',
  url: 'https://avisos.inmet.gov.br/1', municipalities: [{ code: 4314902, name: 'Porto Alegre' }],
  municipalityCountTotal: 1,
};

describe('alertsResponseSchema', () => {
  const base = {
    dataSource: 'live', region, updatedAt: '2026-11-15T12:00:00Z',
    summary: { active: 0, highestSeverity: null }, alerts: [],
  };

  it('accepts empty results and compatible future fields', () => {
    expect(alertsResponseSchema.safeParse({ ...base, futureField: true }).success).toBe(true);
  });

  it('validates Polygon, MultiPolygon, and alerts without geometry', () => {
    expect(alertsResponseSchema.safeParse({ ...base, alerts: [{ ...alert, geometry: polygon }] }).success).toBe(true);
    expect(alertsResponseSchema.safeParse({ ...base, alerts: [{ ...alert, geometry: multiPolygon }] }).success).toBe(true);
    expect(alertsResponseSchema.safeParse({ ...base, alerts: [alert] }).success).toBe(true);
  });

  it('rejects coordinates that are not longitude/latitude pairs', () => {
    const badGeometry = { type: 'Polygon', coordinates: [[[1, 2, 3], [1, 2, 3]]] };
    expect(alertsResponseSchema.safeParse({ ...base, alerts: [{ ...alert, geometry: badGeometry }] }).success).toBe(false);
  });
});

describe('organizationsResponseSchema', () => {
  it('accepts empty results, absent campaigns, null snapshot and open reference kind', () => {
    expect(organizationsResponseSchema.safeParse({
      region, reference: { lon: -51, lat: -30, kind: 'featured-pair' }, total: 0,
      organizations: [], snapshotDate: null,
    }).success).toBe(true);
  });

  it('accepts numeric and string municipality codes and compatible extra fields', () => {
    const organization = {
      id: 1, name: 'OSC', areas: [5, '12'], municipality: { code: '4314902', name: 'Porto Alegre' },
      lon: -51, lat: -30, distanceKm: 0,
    };
    expect(organizationsResponseSchema.safeParse({
      dataSource: 'cache', region, total: 1, organizations: [organization], futureField: 'ok',
    }).success).toBe(true);
  });

  it('rejects invalid coordinates and negative distances', () => {
    const bad = {
      id: 1, name: 'OSC', areas: [], municipality: { code: 4314902, name: 'Porto Alegre' },
      lon: 181, lat: -30, distanceKm: -1,
    };
    expect(organizationsResponseSchema.safeParse({ region, total: 1, organizations: [bad] }).success).toBe(false);
  });
});

describe('postsResponseSchema', () => {
  const common = { id: 'post-1', kind: 'pair', date: '2026-11-15', title: 'Par', text: 'Resumo' };
  it('accepts all typed destinations and empty results', () => {
    const posts = [
      { ...common, kind: 'pass', link: { page: 'region', regionId: 'rs', tab: 'radar', day: '2026-11-15' } },
      { ...common, link: { page: 'compare', before: 'pass-a', after: 'pass-b' } },
      { ...common, kind: 'story', link: { page: 'story', storyId: 'rs-flood-jul-2026' } },
    ];
    expect(postsResponseSchema.safeParse({ dataSource: 'cache', region, total: 3, posts }).success).toBe(true);
    expect(postsResponseSchema.safeParse({ dataSource: 'live', region, total: 0, posts: [] }).success).toBe(true);
  });

  it('rejects incomplete compare links and malformed dates', () => {
    const incomplete = { ...common, link: { page: 'compare', before: 'pass-a' } };
    const malformedDate = { ...common, date: '2026-99-40', link: { page: 'story', storyId: 'id' } };
    expect(postsResponseSchema.safeParse({ dataSource: 'live', region, total: 1, posts: [incomplete] }).success).toBe(false);
    expect(postsResponseSchema.safeParse({ dataSource: 'live', region, total: 1, posts: [malformedDate] }).success).toBe(false);
  });
});
