import { XMLParser, XMLValidator } from 'fast-xml-parser';
import type { MultiPolygon, Polygon } from 'geojson';
import type { WeatherAlert } from '../../domain/alerts';

const xml = new XMLParser({
  ignoreAttributes: true,
  removeNSPrefix: true,
  parseTagValue: false,
  trimValues: true,
});

const asArray = <T>(value: T | T[] | null | undefined): T[] => {
  if (value === null || value === undefined) return [];
  return Array.isArray(value) ? value : [value];
};

const text = (value: unknown): string => typeof value === 'string' ? value.trim() : '';
const utcInstant = (value: unknown): string | null => {
  const raw = text(value);
  const date = new Date(raw);
  return raw && !Number.isNaN(date.getTime()) ? date.toISOString() : null;
};

function parseSeverity(value: unknown): WeatherAlert['severity'] | null {
  const severity = text(value).toLowerCase();
  return ['minor', 'moderate', 'severe', 'extreme'].includes(severity)
    ? severity as WeatherAlert['severity']
    : null;
}

function parseMunicipalities(areas: Record<string, unknown>[], parameters: Record<string, unknown>[]) {
  const municipalities = new Map<string, string>();
  const values = parameters
    .filter((parameter) => /municip/i.test(text(parameter.valueName)))
    .map((parameter) => text(parameter.value));
  for (const area of areas) {
    for (const geocode of asArray(area.geocode as Record<string, unknown> | Record<string, unknown>[] | undefined)) {
      if (/municip/i.test(text(geocode.valueName))) values.push(text(geocode.value));
    }
  }
  for (const value of values) {
    const matches = value.matchAll(/([^,()]+?)\s+-\s+[A-Z]{2}\s+\((\d{7})\)/g);
    for (const match of matches) municipalities.set(match[2]!, match[1]!.trim());
  }
  return [...municipalities].map(([code, name]) => ({ code, name }));
}

function parseRing(value: unknown): [number, number][] | null {
  const raw = text(value);
  if (!raw) return null;
  const ring: [number, number][] = [];
  for (const coordinate of raw.split(/\s+/)) {
    const [latText, lonText, ...rest] = coordinate.split(',');
    if (!latText || !lonText || rest.length) return null;
    const lat = Number(latText);
    const lon = Number(lonText);
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) return null;
    ring.push([lon, lat]);
  }
  if (ring.length < 4) return null;
  const first = ring[0]!;
  const last = ring.at(-1)!;
  if (first[0] !== last[0] || first[1] !== last[1]) return null;
  return ring;
}

function parseGeometry(areas: Record<string, unknown>[]): Polygon | MultiPolygon | null {
  const rings = areas.flatMap((area) => asArray(area.polygon as string | string[] | undefined)
    .map(parseRing)
    .filter((ring): ring is [number, number][] => ring !== null));
  if (rings.length === 0) return null;
  if (rings.length === 1) return { type: 'Polygon', coordinates: [rings[0]!] };
  return { type: 'MultiPolygon', coordinates: rings.map((ring) => [ring]) };
}

/** Parse an INMET CAP 1.2 document into the project's normalized alert fields. */
export function parseCapAlert(source: string): WeatherAlert | null {
  try {
    if (XMLValidator.validate(source) !== true) return null;
    const root = xml.parse(source)?.alert as Record<string, unknown> | undefined;
    if (!root) return null;
    const infos = asArray(root.info as Record<string, unknown> | Record<string, unknown>[] | undefined);
    const info = infos.find((candidate) => text(candidate.language) === 'pt-BR') ?? infos[0];
    if (!info) return null;

    const severity = parseSeverity(info.severity);
    const id = text(root.identifier);
    const sent = utcInstant(root.sent);
    const onset = utcInstant(info.onset);
    const expires = utcInstant(info.expires);
    if (!severity || !id || !sent || !onset || !expires) return null;

    const areas = asArray(info.area as Record<string, unknown> | Record<string, unknown>[] | undefined);
    const parameters = asArray(info.parameter as Record<string, unknown> | Record<string, unknown>[] | undefined);
    const color = text(parameters.find((parameter) => text(parameter.valueName) === 'ColorRisk')?.value) || '#6B7280';
    const municipalities = parseMunicipalities(areas, parameters);
    const geometry = parseGeometry(areas);

    return {
      id,
      sent,
      event: text(info.event),
      severity,
      color,
      onset,
      expires,
      headline: text(info.headline),
      description: text(info.description),
      instruction: text(info.instruction),
      url: text(info.web),
      municipalities,
      municipalityCountTotal: municipalities.length,
      geometry,
    };
  } catch {
    return null;
  }
}
