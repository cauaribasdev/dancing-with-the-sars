import "maplibre-gl/dist/maplibre-gl.css";
import "./maplibreSetup";
import { forwardRef, type ReactNode } from "react";
import Map, { AttributionControl, NavigationControl, type MapProps, type MapRef } from "react-map-gl/maplibre";
import type { BBox } from "../api/types";
import { BASEMAP_STYLE_URL, BRAZIL_BBOX, DATA_ATTRIBUTION, bboxToBounds } from "./basemapConfig";

export interface BaseMapProps extends Omit<MapProps, "mapStyle" | "initialViewState" | "attributionControl"> {
  /** Initial area. Default: all of Brazil. */
  initialBbox?: BBox;
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
  { initialBbox = BRAZIL_BBOX, initialPadding = 24, overlay, className, children, ...rest },
  ref,
) {
  return (
    <div className={`relative h-full w-full overflow-hidden bg-paper ${className ?? ""}`}>
      <Map
        ref={ref}
        mapStyle={BASEMAP_STYLE_URL}
        initialViewState={{ bounds: bboxToBounds(initialBbox), fitBoundsOptions: { padding: initialPadding } }}
        attributionControl={false}
        dragRotate={false}
        pitchWithRotate={false}
        touchPitch={false}
        minZoom={2}
        maxZoom={13}
        style={{ position: "absolute", inset: 0 }}
        {...rest}
      >
        <AttributionControl position="bottom-right" compact customAttribution={DATA_ATTRIBUTION} />
        <NavigationControl position="top-right" showCompass={false} />
        {children}
      </Map>
      {overlay ? <div className="pointer-events-none absolute inset-0">{overlay}</div> : null}
    </div>
  );
});
