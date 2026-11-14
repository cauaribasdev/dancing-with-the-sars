import { readFileSync } from 'node:fs';
import { bbox as turfBbox } from '@turf/bbox';
import { booleanIntersects } from '@turf/boolean-intersects';
import { booleanPointInPolygon } from '@turf/boolean-point-in-polygon';
import type { FeatureCollection, MultiPolygon, Polygon } from 'geojson';
import type { RegionRepository } from '../../application/ports';
import type { BBox } from '../../domain/pass';
import type { Region, RegionKind, RegionProperties, RegionSummary } from '../../domain/region';

type Geo = Polygon | MultiPolygon;

const bboxesOverlap = (a: BBox, b: BBox) => a[0] <= b[2] && a[2] >= b[0] && a[1] <= b[3] && a[3] >= b[1];

const KIND_ORDER: Record<RegionKind, number> = { country: 0, region: 1, state: 2 };

/** Brazilian country / macro-regions / states, loaded from data/regions.geojson (IBGE). */
export class RegionIndex implements RegionRepository {
  private readonly byId = new Map<string, Region>();

  constructor(fc: FeatureCollection<Geo, RegionProperties>) {
    for (const f of fc.features) {
      const bbox = turfBbox(f.geometry) as BBox;
      this.byId.set(f.properties.id, { ...f.properties, bbox, geometry: f.geometry });
    }
  }

  static fromFile(file = new URL('../../../data/regions.geojson', import.meta.url)): RegionIndex {
    return new RegionIndex(JSON.parse(readFileSync(file, 'utf8')));
  }

  get(id: string): Region | undefined {
    return this.byId.get(id.toLowerCase());
  }

  list(kind?: RegionKind): RegionSummary[] {
    return [...this.byId.values()]
      .filter((r) => !kind || r.kind === kind)
      .sort((a, b) => KIND_ORDER[a.kind] - KIND_ORDER[b.kind] || a.name.localeCompare(b.name, 'pt-BR'))
      .map(({ geometry: _g, ...rest }) => rest);
  }

  featureCollection(kind?: RegionKind): FeatureCollection<Geo, RegionSummary> {
    return {
      type: 'FeatureCollection',
      features: [...this.byId.values()]
        .filter((r) => !kind || r.kind === kind)
        .map(({ geometry, ...props }) => ({ type: 'Feature', geometry, properties: props })),
    };
  }

  intersects(region: Region, geom: Geo, geomBbox?: BBox): boolean {
    const b = geomBbox ?? (turfBbox(geom) as BBox);
    return bboxesOverlap(region.bbox, b) && booleanIntersects(region.geometry, geom);
  }

  containsPoint(region: Region, lon: number, lat: number): boolean {
    return booleanPointInPolygon([lon, lat], region.geometry);
  }
}
