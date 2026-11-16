import "maplibre-gl/dist/maplibre-gl.css";
import "./maplibreSetup";
import { forwardRef, useMemo, type ReactNode, useState } from "react";
import Map, { AttributionControl, NavigationControl, type MapProps, type MapRef } from "react-map-gl/maplibre";
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "../api/client";
import type { RegionsGeoJSON } from "../api/types";
import type { Polygon, MultiPolygon } from "geojson";
import { TerritoryClip } from "./TerritoryClip";
import type { BBox } from "../api/types";
import type { StyleSpecification } from "maplibre-gl";

const TERRITORY_STYLE: StyleSpecification = {version:8,sources:{},layers:[{id:"ground",type:"background",paint:{"background-color":"#111827"}}]};
import { BASEMAP_STYLE_URL, BRAZIL_BBOX, DATA_ATTRIBUTION, bboxToBounds } from "./basemapConfig";

export interface BaseMapProps extends Omit<MapProps, "mapStyle" | "initialViewState" | "attributionControl"> {
  /** Initial area. Default: all of Brazil. */
  initialBbox?: BBox;
  territory?: (Polygon | MultiPolygon)[];
  /** Padding in px when fitting `initialBbox`. */
  initialPadding?: number;
  /** HTML on top of the map (legend, notices, tooltip). Lives in an absolute layer that does not block the map;
   *  give interactive children `pointer-events-auto`. */
  overlay?: ReactNode;
  className?: string;
  children?: ReactNode;
}

/**
 * Basemap shared by every page. Anything that goes *inside* MapLibre (Source, Layer, Marker,
 * BrowseImageLayer) is a child; HTML on top of the map goes in `overlay`.
 */
export const BaseMap = forwardRef<MapRef, BaseMapProps>(function BaseMap(
  { initialBbox = BRAZIL_BBOX, initialPadding = 24, territory, overlay, className, children, onError, ...rest },
  ref,
) {
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const country = useQuery({queryKey:["regions-geojson","country"], queryFn:({signal})=>apiGet<RegionsGeoJSON>("/regions/geojson",{kind:"country"},signal), enabled:territory===undefined, staleTime:Infinity});
  // Camera bounds include neutral margins: tight maxBounds would crop tall countries on wide screens.
  const cameraBounds: BBox = territory ? [Math.max(-180,initialBbox[0]-(initialBbox[2]-initialBbox[0])),Math.max(-85,initialBbox[1]-(initialBbox[3]-initialBbox[1])),Math.min(180,initialBbox[2]+(initialBbox[2]-initialBbox[0])),Math.min(85,initialBbox[3]+(initialBbox[3]-initialBbox[1]))] : BRAZIL_BBOX;
  const clipGeometry = useMemo(()=>territory ?? country.data?.features.map(f=>f.geometry) ?? [],[territory,country.data]);
  const handleError: NonNullable<MapProps["onError"]> = (event) => {
    if (event.target === null) {
      setFailed(true);
    }
    onError?.(event);
  };
  if (failed) {
    return (
      <div role="alert" className={`relative h-full w-full bg-paper p-4 text-ink ${className ?? ""}`}>
        <span className="block sm:inline">Não foi possível iniciar o mapa. Os detalhes continuam disponíveis nesta página.</span>
        <button type="button" onClick={() => { setFailed(false); setAttempt(value => value + 1); }} className="ml-4 rounded border border-current px-2 py-1 underline focus-visible:outline-2 focus-visible:outline-offset-2">Tentar novamente</button>
      </div>
    );
  }
  return (
    <div className={`territorial-map relative h-full w-full overflow-hidden bg-paper ${className ?? ""}`}>
      <Map
        ref={ref}
        mapStyle={territory ? TERRITORY_STYLE : BASEMAP_STYLE_URL}
        maxBounds={cameraBounds}
        renderWorldCopies={false}
        initialViewState={{ bounds: bboxToBounds(initialBbox), fitBoundsOptions: { padding: initialPadding } }}
        attributionControl={false}
        dragRotate={false}
        pitchWithRotate={false}
        touchPitch={false}
        minZoom={territory ? 0 : 2}
        maxZoom={13}
        style={{ position: "absolute", inset: 0 }}
        onError={handleError}
        key={attempt}
        {...rest}
      >
        <AttributionControl position="bottom-right" compact customAttribution={DATA_ATTRIBUTION} />
        <NavigationControl position="top-right" showCompass={false} />
        {children}
        <TerritoryClip geometries={clipGeometry} bbox={initialBbox}/>
      </Map>
      {overlay ? <div className="pointer-events-none absolute inset-0">{overlay}</div> : null}
    </div>
  );
});
