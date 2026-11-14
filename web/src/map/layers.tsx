import { useEffect, useState } from "react";
import { Layer, useMap, type MapRef } from "react-map-gl/maplibre";
import { BASEMAP_VECTOR_SOURCE } from "./basemapConfig";
import { MAP_COLORS } from "./mapColors";

function findFirstLabelLayer(map: MapRef | undefined): string | undefined {
  try {
    const layers = map?.getMap().getStyle()?.layers ?? [];
    const first = layers.find((l) => l.type === "symbol" && "source" in l && l.source === BASEMAP_VECTOR_SOURCE);
    return first?.id;
  } catch {
    return undefined; // style still loading
  }
}

/**
 * Id of the basemap's first label layer. Pass it as `beforeId` so your layers (polygons, radar image)
 * sit *below* city and river names. Use inside <BaseMap>.
 */
export function useLabelLayerId(): string | undefined {
  const { current } = useMap();
  const [id, setId] = useState<string | undefined>(() => findFirstLabelLayer(current));

  useEffect(() => {
    if (!current) return;
    const map = current.getMap();
    const update = () => setId(findFirstLabelLayer(current));
    update();
    map.on("styledata", update);
    return () => {
      map.off("styledata", update);
    };
  }, [current]);

  return id;
}

/**
 * The basemap's water outline (rivers, lakes, coast), drawn *on top of* the radar image.
 * Use it to check alignment: water is dark in the radar image and should meet this line.
 */
export function ShorelineOverlay({ visible = true }: { visible?: boolean }) {
  return (
    <Layer
      id="shoreline-check"
      type="line"
      source={BASEMAP_VECTOR_SOURCE}
      source-layer="water"
      layout={{ visibility: visible ? "visible" : "none", "line-join": "round" }}
      paint={{
        "line-color": MAP_COLORS.signal,
        "line-width": ["interpolate", ["linear"], ["zoom"], 5, 0.6, 9, 1.2, 12, 1.8],
        "line-opacity": 0.95,
      }}
    />
  );
}
