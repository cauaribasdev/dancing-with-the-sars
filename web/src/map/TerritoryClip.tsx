import { useLayoutEffect } from 'react';
import { useMap } from 'react-map-gl/maplibre';
import type { Polygon, MultiPolygon } from 'geojson';
import { territoryPath } from './territory';
import type { BBox } from '../api/types';
import { bboxToBounds } from './basemapConfig';

/** Clip the entire WebGL canvas, so raster and vector pixels share exactly the same boundary. */
export function TerritoryClip({geometries,bbox}: {geometries: (Polygon|MultiPolygon)[];bbox:BBox}) {
 const {current}=useMap();
 useLayoutEffect(()=>{
   if(!current) return;
   const map=current.getMap();
   const canvas=map.getCanvas();
   const update=()=>{
     const path=territoryPath(geometries,p=>map.project(p));
     canvas.style.clipPath=path ? `path(evenodd, "${path}")` : 'inset(100%)';
   };
   update();
   map.on('render',update);
   const resize=()=>{map.fitBounds(bboxToBounds(bbox),{padding:32,duration:0});update();};
   map.on('resize',resize);
   return ()=>{map.off('render',update);map.off('resize',resize);canvas.style.clipPath='inset(100%)';};
 },[current,geometries,bbox]);
 return null;
}
