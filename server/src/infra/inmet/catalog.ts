import { XMLParser } from 'fast-xml-parser';
import type { WeatherAlert } from '../../domain/alerts';
import { addDays, isoDate } from '../../shared/dates';
import { mapLimit } from '../../shared/async';
import type { AlertCatalog, UpstreamError } from '../../application/ports';
import { UpstreamError as UpstreamErrorClass } from '../../application/ports';
import { cached, type Cache } from '../cache/cache';
import { parseCapAlert } from './parse-cap';

interface S3Object { key: string; lastModified: string }
interface Snapshot { alerts: WeatherAlert[]; updatedAt: string }

const parser = new XMLParser({ ignoreAttributes: true, removeNSPrefix: true, parseTagValue: false, trimValues: true });
const asArray = <T>(value: T | T[] | null | undefined): T[] => value == null ? [] : Array.isArray(value) ? value : [value];
const valueText = (value: unknown) => typeof value === 'string' ? value : '';

async function fetchText(url: URL, timeoutMs: number, fetchImpl: typeof fetch): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(url, { signal: controller.signal });
    if (!response.ok) throw new UpstreamErrorClass(`INMET returned HTTP ${response.status}.`, response.status);
    return await response.text();
  } catch (error) {
    if (error instanceof UpstreamErrorClass) throw error;
    throw new UpstreamErrorClass(`Could not retrieve INMET CAP data: ${(error as Error).message}`);
  } finally {
    clearTimeout(timer);
  }
}

async function listDay(baseUrl: string, date: string, timeoutMs: number, fetchImpl: typeof fetch): Promise<S3Object[]> {
  const prefix = `${date}/wis/urn:wmo:md:br-inmet:alerts/`;
  const objects: S3Object[] = [];
  let marker: string | undefined;

  for (let page = 0; page < 20; page++) {
    const url = new URL('/data/', baseUrl);
    url.searchParams.set('prefix', prefix);
    if (marker) url.searchParams.set('marker', marker);
    const body = parser.parse(await fetchText(url, timeoutMs, fetchImpl))?.ListBucketResult as Record<string, unknown> | undefined;
    if (!body) throw new UpstreamErrorClass('INMET returned an invalid storage listing.');

    const pageObjects = asArray(body.Contents as Record<string, unknown> | Record<string, unknown>[] | undefined)
      .flatMap((entry) => {
        const key = valueText(entry.Key);
        const lastModified = valueText(entry.LastModified);
        return key && lastModified ? [{ key, lastModified }] : [];
      });
    objects.push(...pageObjects);
    if (valueText(body.IsTruncated).toLowerCase() !== 'true') return objects;

    marker = valueText(body.NextMarker) || pageObjects.at(-1)?.key;
    if (!marker || pageObjects.length === 0) break;
  }
  return objects;
}

async function loadSnapshot(
  baseUrl: string,
  timeoutMs: number,
  fetchImpl: typeof fetch,
  now: () => Date,
): Promise<Snapshot> {
  const today = now();
  const days = Array.from({ length: 8 }, (_, index) => isoDate(addDays(today, -index)));
  const byDay = await mapLimit(days, 8, (date) => listDay(baseUrl, date, timeoutMs, fetchImpl));
  const objects = byDay.flat().sort((a, b) => a.key.localeCompare(b.key));

  const parsed = await mapLimit(objects, 8, async (object) => {
    const url = new URL(object.key, new URL('/data/', baseUrl));
    const alert = parseCapAlert(await fetchText(url, timeoutMs, fetchImpl));
    return alert ? { alert, lastModified: object.lastModified } : null;
  });

  const latestById = new Map<string, { alert: WeatherAlert; lastModified: string }>();
  for (const item of parsed) {
    if (!item) continue;
    const previous = latestById.get(item.alert.id);
    if (!previous || item.alert.sent > previous.alert.sent) latestById.set(item.alert.id, item);
  }

  const timestamps = objects.map((object) => object.lastModified).filter((date) => Number.isFinite(Date.parse(date)));
  const updatedAt = timestamps.sort().at(-1) ?? now().toISOString();
  const alerts = [...latestById.values()]
    .map(({ alert }) => alert)
    .sort((a, b) => b.sent.localeCompare(a.sent) || a.id.localeCompare(b.id));
  return { alerts, updatedAt };
}

export function createInmetCatalog(options: {
  baseUrl: string;
  cache: Cache;
  ttlMs: number;
  maxAgeMs: number;
  timeoutMs: number;
  now?: () => Date;
  fetchImpl?: typeof fetch;
}): AlertCatalog {
  const now = options.now ?? (() => new Date());
  const fetchImpl = options.fetchImpl ?? fetch;

  return {
    async findAlerts() {
      const result = await cached(
        options.cache,
        'inmet:cap-alerts:rolling-8d',
        options.ttlMs,
        () => loadSnapshot(options.baseUrl, options.timeoutMs, fetchImpl, now),
      );
      const oldPublication = now().getTime() - Date.parse(result.value.updatedAt) > options.maxAgeMs;
      return { ...result.value, source: result.source === 'stale' || oldPublication ? 'stale' : result.source };
    },
  };
}
