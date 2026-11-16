import { expect,it } from 'vitest';
import { territoryPath } from './territory';
import type { Polygon,MultiPolygon } from 'geojson';
const outer=[[0,0],[10,0],[10,10],[0,10],[0,0]];
const hole=[[2,2],[4,2],[4,4],[2,4],[2,2]];
it('preserves complex polygon holes instead of bounding rectangles',()=>{
 const geometry:Polygon={type:'Polygon',coordinates:[outer,hole]};
 const path=territoryPath([geometry],p=>({x:p[0]*2,y:p[1]*3}));
 expect(path).toBe('M0,0 L20,0 L20,30 L0,30 L0,0 Z M4,6 L8,6 L8,12 L4,12 L4,6 Z');
});
it('preserves disconnected islands and reprojects after camera changes',()=>{
 const geometry:MultiPolygon={type:'MultiPolygon',coordinates:[[outer],[hole]]};
 expect(territoryPath([geometry],p=>({x:p[0]+100,y:p[1]}))).toContain('M102,2');
 expect(territoryPath([],p=>({x:p[0],y:p[1]}))).toBe('');
});

// Actual IBGE geometries shipped by the project, including disconnected coastal polygons.
import { readFileSync } from 'node:fs';
import type { FeatureCollection } from 'geojson';
const administrative = JSON.parse(readFileSync(new URL('../../../server/data/regions.geojson', import.meta.url),'utf8')) as FeatureCollection<Polygon|MultiPolygon>;
it('builds paths for every supplied state, including SC and complex coastal islands',()=>{
 const states=administrative.features.filter(f=>f.properties?.kind==='state');
 expect(states).toHaveLength(27);
 for(const state of states){
   const path=territoryPath([state.geometry],p=>({x:p[0],y:p[1]}));
   expect(path).not.toMatch(/NaN|Infinity/);
   expect(path.startsWith('M')).toBe(true);
   const polygons=state.geometry.type==='Polygon'?[state.geometry.coordinates]:state.geometry.coordinates;
   expect(path.match(/Z/g)?.length).toBe(polygons.reduce((n,p)=>n+p.length,0));
 }
 expect(states.some(f=>f.properties?.id==='sc')).toBe(true);
});
