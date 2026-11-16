import type { Polygon, MultiPolygon } from 'geojson';

/** SVG even-odd path retains islands and holes; projection is the live MapLibre camera. */
export function territoryPath(geometries: (Polygon | MultiPolygon)[], project: (p: [number, number]) => {x:number;y:number}): string {
  return geometries.flatMap(g => g.type === 'Polygon' ? [g.coordinates] : g.coordinates).flatMap(polygon => polygon.map(ring => ring.map((p,i) => {
    const point=project([p[0],p[1]]);
    return `${i?'L':'M'}${point.x},${point.y}`;
  }).join(' ')+' Z')).join(' ');
}
