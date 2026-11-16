import { Hono } from 'hono';
import { z } from 'zod';
import { requireRegion, toSummary } from '../../application/passes';
import type { Deps } from '../../application/ports';
import { UpstreamError } from '../../application/ports';
import { DomainError } from '../../domain/errors';
import type { AlertSeverity, WeatherAlert } from '../../domain/alerts';
import { withSource } from '../responses';
import { validate } from '../schemas';

const alertsQuery = z.object({ include: z.enum(['active', 'recent', 'history']).default('active') });
const severityRank: Record<AlertSeverity, number> = { minor: 1, moderate: 2, severe: 3, extreme: 4 };
const SEVERITIES: AlertSeverity[] = ['extreme', 'severe', 'moderate', 'minor'];
const RECENT_MS = 48 * 60 * 60 * 1000;

type AlertItem = WeatherAlert & { status: 'active' | 'expired' };

function orderAlerts(a: AlertItem, b: AlertItem): number {
  if (a.status !== b.status) return a.status === 'active' ? -1 : 1;
  if (a.status === 'active') {
    return severityRank[b.severity] - severityRank[a.severity]
      || b.onset.localeCompare(a.onset)
      || a.id.localeCompare(b.id);
  }
  return b.expires.localeCompare(a.expires) || a.id.localeCompare(b.id);
}

export function alertsRoutes(deps: Deps) {
  const r = new Hono();

  r.get('/regions/:id/alerts', validate(alertsQuery), async (c) => {
    const id = c.req.param('id');
    const { include } = c.req.valid('query');
    const region = requireRegion(deps, id);
    if (id !== 'br' && region.kind !== 'state') {
      throw new DomainError('invalid', 'state_only', 'Alerts are available only for Brazil or a Brazilian state.');
    }

    let snapshot;
    try {
      snapshot = await deps.alerts.findAlerts();
    } catch (error) {
      if (error instanceof UpstreamError) {
        throw new DomainError('upstream', 'upstream_unavailable', `INMET alerts are unavailable: ${error.message}`);
      }
      throw error;
    }

    const now = Date.now();
    const prefix = id === 'br' ? null : String(region.ibgeCode ?? '').padStart(2, '0');
    const alerts: AlertItem[] = snapshot.alerts.flatMap((alert) => {
      const municipalities = prefix === null
        ? alert.municipalities
        : alert.municipalities.filter((municipality) => municipality.code.startsWith(prefix));
      if (municipalities.length === 0) return [];

      const status: AlertItem['status'] = Date.parse(alert.expires) >= now ? 'active' : 'expired';
      if (status === 'expired' && include === 'active') return [];
      if (status === 'expired' && include === 'recent' && now - Date.parse(alert.expires) > RECENT_MS) return [];
      return [{ ...alert, municipalities, status }];
    }).sort(orderAlerts);

    const active = alerts.filter((alert) => alert.status === 'active');
    const highestSeverity = SEVERITIES.find((severity) => active.some((alert) => alert.severity === severity)) ?? null;

    return withSource(c, snapshot.source, {
      region: toSummary(region),
      updatedAt: snapshot.updatedAt,
      summary: { active: active.length, highestSeverity },
      alerts,
    });
  });

  return r;
}
