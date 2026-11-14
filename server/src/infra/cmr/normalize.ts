import type { MultiPolygon, Polygon, Position } from 'geojson';
import type { BBox, Direction, Maturity, Pass } from '../../domain/pass';

/** Subset of a CMR UMM-G item (granules.umm_json) that we read. */
export interface UmmItem {
  meta: { 'concept-id': string };
  umm: {
    GranuleUR: string;
    TemporalExtent?: { RangeDateTime?: { BeginningDateTime: string; EndingDateTime: string } };
    SpatialExtent?: {
      HorizontalSpatialDomain?: {
        Geometry?: {
          GPolygons?: { Boundary: { Points: { Latitude: number; Longitude: number }[] } }[];
        };
      };
    };
    OrbitCalculatedSpatialDomains?: { OrbitNumber?: number }[];
    AdditionalAttributes?: { Name: string; Values: string[] }[];
    CollectionReference?: { ShortName?: string; Version?: string };
    DataGranule?: {
      ArchiveAndDistributionInformation?: { Name: string; SizeInBytes?: number }[];
    };
    RelatedUrls?: { URL: string; Type: string; Subtype?: string }[];
  };
}

const CYCLE_RE = /^NISAR_L2_[A-Z]{2}_GCOV_(\d{3})_(\d{3})_([AD])_(\d{3})_/;

const pad3 = (n: number) => String(n).padStart(3, '0');

function ringFromPoints(points: { Latitude: number; Longitude: number }[]): Position[] {
  const ring: Position[] = points.map((p) => [p.Longitude, p.Latitude]);
  const first = ring[0];
  const last = ring[ring.length - 1];
  if (first && last && (first[0] !== last[0] || first[1] !== last[1])) ring.push([...first]);
  return ring;
}

export function bboxOfRings(rings: Position[][]): BBox {
  let w = Infinity, s = Infinity, e = -Infinity, n = -Infinity;
  for (const ring of rings)
    for (const [x, y] of ring) {
      if (x === undefined || y === undefined) continue;
      if (x < w) w = x;
      if (x > e) e = x;
      if (y < s) s = y;
      if (y > n) n = y;
    }
  return [w, s, e, n];
}

const httpsUrl = (urls: { URL: string; Type: string }[], type: string, re: RegExp) =>
  urls.find((u) => u.Type === type && u.URL.startsWith('https://') && re.test(u.URL))?.URL ?? null;

/**
 * Convert one CMR UMM-G GCOV record into a Pass. Returns null when the record lacks
 * the fields we need (time, footprint, track/frame) - such records are skipped, not guessed.
 */
export function normalizeGcov(item: UmmItem, maturity: Maturity): Pass | null {
  const u = item.umm;
  const time = u.TemporalExtent?.RangeDateTime;
  const polys = u.SpatialExtent?.HorizontalSpatialDomain?.Geometry?.GPolygons ?? [];
  if (!time || polys.length === 0) return null;

  const attrs = new Map((u.AdditionalAttributes ?? []).map((a) => [a.Name, a.Values]));
  const attr = (name: string) => attrs.get(name)?.[0];
  const nameMatch = CYCLE_RE.exec(u.GranuleUR);

  const track = Number(attr('TRACK_NUMBER') ?? nameMatch?.[2]);
  const frame = Number(attr('FRAME_NUMBER') ?? nameMatch?.[4]);
  const dirRaw = attr('ASCENDING_DESCENDING') ?? (nameMatch?.[3] === 'A' ? 'ASCENDING' : nameMatch?.[3] === 'D' ? 'DESCENDING' : undefined);
  if (!Number.isFinite(track) || !Number.isFinite(frame) || !dirRaw) return null;
  const direction: Direction = dirRaw.toUpperCase().startsWith('A') ? 'ascending' : 'descending';

  const rings = polys.map((p) => ringFromPoints(p.Boundary.Points));
  const footprint: Polygon | MultiPolygon =
    rings.length === 1
      ? { type: 'Polygon', coordinates: [rings[0] as Position[]] }
      : { type: 'MultiPolygon', coordinates: rings.map((r) => [r]) };

  const urls = u.RelatedUrls ?? [];
  const h5 = (u.DataGranule?.ArchiveAndDistributionInformation ?? []).find((f) => f.Name.endsWith('.h5'));
  const bandwidth = Number(attr('FREQUENCY_A_RANGE_BANDWIDTH'));

  return {
    id: u.GranuleUR,
    conceptId: item.meta['concept-id'],
    product: 'GCOV',
    collection: u.CollectionReference?.ShortName ?? 'unknown',
    maturity,
    productVersion: attr('PRODUCT_VERSION') ?? null,
    start: time.BeginningDateTime,
    end: time.EndingDateTime,
    date: time.BeginningDateTime.slice(0, 10),
    cycle: nameMatch ? Number(nameMatch[1]) : null,
    orbit: u.OrbitCalculatedSpatialDomains?.[0]?.OrbitNumber ?? null,
    track,
    frame,
    direction,
    stackId: attr('STACK_ID') ?? `${pad3(track)}_${direction === 'ascending' ? 'A' : 'D'}_${pad3(frame)}`,
    fullFrame: attr('FULL_FRAME') === 'TRUE',
    frequencies: attrs.get('FREQUENCIES') ?? [],
    polarizations: attrs.get('FREQUENCY_A_POLARIZATION') ?? [],
    rangeBandwidthMHz: Number.isFinite(bandwidth) ? bandwidth : null,
    sizeBytes: h5?.SizeInBytes ?? null,
    footprint,
    bbox: bboxOfRings(rings),
    browse: {
      latlon: httpsUrl(urls, 'GET RELATED VISUALIZATION', /_LATLON\.png$/),
      thumbnail: httpsUrl(urls, 'GET RELATED VISUALIZATION', /_LATLON_thumbnail\.png$/),
    },
    download: httpsUrl(urls, 'GET DATA', /\.h5$/),
    qaReport: httpsUrl(urls, 'VIEW RELATED INFORMATION', /_QA_REPORT\.pdf$/),
  };
}
