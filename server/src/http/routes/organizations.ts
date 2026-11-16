import { Hono } from 'hono';
import { z } from 'zod';
import { requireRegion, toSummary } from '../../application/passes';
import type { Deps } from '../../application/ports';
import { DomainError } from '../../domain/errors';
import { UpstreamError } from '../../application/ports';
import { withSource } from '../responses';
import { validate } from '../schemas';

const nearSchema = z.string().regex(/^-?\d+(?:\.\d+)?,-?\d+(?:\.\d+)?$/).transform((raw) => {
  const [lon, lat] = raw.split(',').map(Number);
  return { lon, lat };
}).refine(({ lon, lat }) => lon >= -180 && lon <= 180 && lat >= -90 && lat <= 90, 'near coordinates out of range');

const organizationQuery = z.object({
  areas: z.string().default('5,2').transform((raw) => [...new Set(raw.split(',').map((v) => v.trim()))]),
  near: nearSchema.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.coerce.number().int().min(0).default(0),
});

const SUPPORTED_AREAS = new Set(['5', '2']);

function distanceKm(lon1: number, lat1: number, lon2: number, lat2: number): number {
  const radians = Math.PI / 180;
  const dLat = (lat2 - lat1) * radians;
  const dLon = (lon2 - lon1) * radians;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * radians) * Math.cos(lat2 * radians) * Math.sin(dLon / 2) ** 2;
  return 6371.0088 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function organizationsRoutes(deps: Deps) {
  const r = new Hono();

  r.get('/regions/:id/organizations', validate(organizationQuery), async (c) => {
    const region = requireRegion(deps, c.req.param('id'));
    if (region.kind !== 'state') {
      throw new DomainError('invalid', 'state_only', 'Organizations are available only for Brazilian states.');
    }
    const query = c.req.valid('query');
    if (query.areas.length === 0 || query.areas.some((area) => !SUPPORTED_AREAS.has(area))) {
      throw new DomainError('invalid', 'unsupported_area', 'Supported IPEA areas are 5 (social assistance) and 2 (health) in the current snapshot.');
    }
    const center = query.near ?? { lon: (region.bbox[0] + region.bbox[2]) / 2, lat: (region.bbox[1] + region.bbox[3]) / 2 };
    let snapshot;
    try {
      snapshot = await deps.organizations.findOrganizations(region.id, query.areas);
    } catch (error) {
      if (error instanceof UpstreamError) {
        throw new DomainError('upstream', 'upstream_unavailable', `IPEA organizations are unavailable: ${error.message}`);
      }
      throw error;
    }

    const organizations = snapshot.organizations
      .map(({ uf: _uf, ...org }) => ({ ...org, distanceKm: distanceKm(center.lon, center.lat, org.lon, org.lat) }))
      .sort((a, b) => a.distanceKm - b.distanceKm || a.id.localeCompare(b.id));
    const page = organizations.slice(query.cursor, query.cursor + query.limit);
    const nextOffset = query.cursor + page.length;
    return withSource(c, snapshot.source, {
      region: toSummary(region),
      reference: { ...center, kind: query.near ? 'pass' : 'state' },
      total: snapshot.total,
      organizations: page,
      campaigns: null,
      campaignsStatus: 'not_configured',
      snapshotDate: snapshot.snapshotDate,
      nextCursor: nextOffset < snapshot.total ? String(nextOffset) : null,
      notice: 'Fonte: Mapa das OSCs (IPEA). O snapshot pode estar desatualizado; listagem não implica endosso ou disponibilidade da organização. As áreas disponíveis dependem das categorias publicadas pela fonte.',
    });
  });

  return r;
}
