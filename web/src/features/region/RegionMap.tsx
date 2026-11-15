import type { ExpressionSpecification, FilterSpecification } from "maplibre-gl";
import { useCallback, useEffect, useRef, useState } from "react";
import { Layer, Source, type MapLayerMouseEvent, type MapRef } from "react-map-gl/maplibre";
import type { BBox, FootprintsGeoJSON, IsoDate, Pass, Region, RegionFeature } from "../../api/types";
import { BaseMap } from "../../map/BaseMap";
import { BRAZIL_BBOX, bboxToBounds } from "../../map/basemapConfig";
import { BrowseImageLayer, type BrowseImageState } from "../../map/BrowseImageLayer";
import { DailyImageLayer } from "../../map/DailyImageLayer";
import { BrowseImageStatus } from "../../map/BrowseImageStatus";
import { useLabelLayerId } from "../../map/layers";
import { ANNOTATION_LINE, MAP_COLORS } from "../../map/mapColors";
import { ProgressBar } from "../../ui/feedback";
import { formatDayShort } from "../../ui/format";
import { directionLabel, stripLabel } from "./passText";
import { byStart, formatTimeUtc, uniqueIds } from "./regionLogic";

const FILL_LAYER = "fp-fill";
/** The radar image goes right under the selected outline, above every other outline. */
const SELECTED_CASING_LAYER = "fp-sel-casing";

/** Thinner lines when zoomed out, where hundreds of outlines overlap. */
const casingWidth: ExpressionSpecification = ["interpolate", ["linear"], ["zoom"], 4, 2.2, 7, ANNOTATION_LINE.casingWidth];
const coreWidth: ExpressionSpecification = ["interpolate", ["linear"], ["zoom"], 4, 0.9, 7, ANNOTATION_LINE.coreWidth];

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

interface Props {
  region: Region | undefined;
  outline: RegionFeature | undefined;
  footprints: FootprintsGeoJSON | undefined;
  passesById: Map<string, Pass>;
  selectedDay: IsoDate | null;
  selectedPassId: string | null;
  /** Outlines on screen belong to the previous period while the new one loads. */
  pending: boolean;
  loading: boolean;
  image: BrowseImageState;
  dailyPassIds?: string[];
  dailyOpacity?: number;
  onSelectPass: (pass: Pass) => void;
  /** Frames this bbox when `n` changes (selection from the list). Camera only: never used to place an image. */
  focus: { bbox: BBox; n: number } | null;
}

function FootprintLayers({
  data,
  selectedDay,
  selectedPassId,
  pending,
}: {
  data: FootprintsGeoJSON;
  selectedDay: IsoDate | null;
  selectedPassId: string | null;
  pending: boolean;
}) {
  const beforeId = useLabelLayerId();
  // Every outline has an id, so ["has", "id"] means "all days" (MapLibre rejects an undefined filter).
  const dayFilter: FilterSpecification = selectedDay ? ["==", ["get", "date"], selectedDay] : ["has", "id"];
  const otherFilter: FilterSpecification = ["!=", ["get", "date"], selectedDay ?? ""];
  const selectedFilter: FilterSpecification = ["==", ["get", "id"], selectedPassId ?? ""];
  const opacity = pending ? 0.3 : 1;
  return (
    <Source id="footprints" type="geojson" data={data}>
      {/* Invisible fill: makes the inside of each outline clickable. Only the shown day is clickable. */}
      <Layer id={FILL_LAYER} type="fill" beforeId={beforeId} filter={dayFilter} paint={{ "fill-color": MAP_COLORS.signal, "fill-opacity": 0 }} />
      {/* Other days, when a day is chosen: quiet ink hairlines for context. */}
      <Layer
        id="fp-other"
        type="line"
        beforeId={beforeId}
        filter={otherFilter}
        layout={{ visibility: selectedDay ? "visible" : "none", "line-join": "round" }}
        paint={{ "line-color": MAP_COLORS.ink3, "line-width": 0.8, "line-opacity": 0.45 * opacity }}
      />
      {/* Shown passes: yellow over an ink casing (annotation style). */}
      <Layer
        id="fp-casing"
        type="line"
        beforeId={beforeId}
        filter={dayFilter}
        layout={{ "line-join": "round" }}
        paint={{ "line-color": MAP_COLORS.ink, "line-width": casingWidth, "line-opacity": opacity }}
      />
      <Layer
        id="fp-core"
        type="line"
        beforeId={beforeId}
        filter={dayFilter}
        layout={{ "line-join": "round" }}
        paint={{ "line-color": MAP_COLORS.signal, "line-width": coreWidth, "line-opacity": opacity }}
      />
      <Layer
        id={SELECTED_CASING_LAYER}
        type="line"
        beforeId={beforeId}
        filter={selectedFilter}
        layout={{ "line-join": "round" }}
        paint={{ "line-color": MAP_COLORS.ink, "line-width": 7 }}
      />
      <Layer
        id="fp-sel-core"
        type="line"
        beforeId={beforeId}
        filter={selectedFilter}
        layout={{ "line-join": "round" }}
        paint={{ "line-color": MAP_COLORS.signal, "line-width": 3.5 }}
      />
    </Source>
  );
}

function RegionOutline({ feature }: { feature: RegionFeature }) {
  const beforeId = useLabelLayerId();
  return (
    <Source id="region-outline" type="geojson" data={feature}>
      <Layer id="region-halo" type="line" beforeId={beforeId} layout={{ "line-join": "round" }} paint={{ "line-color": MAP_COLORS.paper, "line-width": 5, "line-opacity": 0.85 }} />
      <Layer id="region-line" type="line" beforeId={beforeId} layout={{ "line-join": "round" }} paint={{ "line-color": MAP_COLORS.ink, "line-width": 1.6 }} />
    </Source>
  );
}

interface Chooser {
  x: number;
  y: number;
  passes: Pass[];
}

/** Region map: region outline, pass outlines, the selected pass's radar image, and a chooser for overlapping outlines. */
export function RegionMap({
  region,
  outline,
  footprints,
  passesById,
  selectedDay,
  selectedPassId,
  pending,
  loading,
  image,
  dailyPassIds = [],
  dailyOpacity = 0.65,
  onSelectPass,
  focus,
}: Props) {
  const mapRef = useRef<MapRef>(null);
  const [imageStatuses,setImageStatuses]=useState<Record<string,string>>({});
  const onImageStatus=useCallback((id:string,status:string)=>setImageStatuses(prev=>prev[id]===status?prev:{...prev,[id]:status}),[]);
  const readyCount=dailyPassIds.filter(id=>imageStatuses[id]==='ready').length;
  const excludedCount=dailyPassIds.filter(id=>['error','unavailable'].includes(imageStatuses[id])).length;
  const [chooser, setChooser] = useState<Chooser | null>(null);
  const [hovering, setHovering] = useState(false);

  useEffect(() => {
    if (!focus || !mapRef.current) return;
    mapRef.current.fitBounds(bboxToBounds(focus.bbox), {
      padding: 56,
      maxZoom: 7.5,
      duration: prefersReducedMotion() ? 0 : 900,
    });
  }, [focus]);

  // A new day, period or selection closes the chooser.
  useEffect(() => setChooser(null), [selectedDay, selectedPassId, footprints]);

  useEffect(() => {
    if (!chooser) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setChooser(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [chooser]);

  const onClick = (e: MapLayerMouseEvent) => {
    if (pending) return;
    const ids = uniqueIds((e.features ?? []).map((f) => f.properties?.id as string).filter(Boolean));
    const hits = ids.map((id) => passesById.get(id)).filter((p): p is Pass => !!p).sort(byStart);
    if (hits.length === 0) setChooser(null);
    else if (hits.length === 1) onSelectPass(hits[0]);
    else setChooser({ x: e.point.x, y: e.point.y, passes: hits });
  };

  const bbox = region ? (region.kind === "country" ? BRAZIL_BBOX : region.bbox) : BRAZIL_BBOX;

  const overlay = (
    <>
      {loading ? (
        <div className="absolute inset-x-0 top-0">
          <ProgressBar label="Loading pass outlines" />
        </div>
      ) : null}
      <div className="absolute left-3 top-3">
        {dailyPassIds.length ? <div className="daily-map-status" role="status">{readyCount}/{dailyPassIds.length} imagens prontas{excludedCount>0 && <span> · {excludedCount} indisponíveis (falha ou georreferência inadequada)</span>}</div> : <BrowseImageStatus image={image} />}
      </div>
      <div className="absolute bottom-9 left-3 flex max-w-[260px] flex-col gap-1.5 rounded-[4px] bg-sheet/95 px-3 py-2 text-[12px] leading-snug text-ink shadow-[0_0_0_1px_var(--color-rule)] sm:left-4">
        <span className="flex items-center gap-2">
          <svg aria-hidden viewBox="0 0 24 12" className="h-3 w-6 shrink-0">
            <rect x="1.5" y="1.5" width="21" height="9" rx="1" fill="none" stroke={MAP_COLORS.ink} strokeWidth="3.5" />
            <rect x="1.5" y="1.5" width="21" height="9" rx="1" fill="none" stroke={MAP_COLORS.signal} strokeWidth="1.5" />
          </svg>
          Area seen by one pass
        </span>
        <span className="text-ink-2">
          {selectedPassId ? "The thick outline is the chosen pass." : "Click an outline to see its radar image."}
        </span>
      </div>
      {chooser ? (
        <div
          role="dialog"
          aria-label="Choose a pass"
          className="pointer-events-auto absolute z-10 flex max-h-[min(320px,70%)] w-[260px] flex-col rounded-[4px] bg-sheet text-[13px] shadow-[0_0_0_1px_var(--color-rule),0_6px_16px_-8px_rgb(22_32_42/0.35)]"
          style={{
            left: chooser.x + 10,
            top: chooser.y + 10,
            transform: `translate(${chooser.x > 300 ? "calc(-100% - 20px)" : "0"}, ${chooser.y > 260 ? "calc(-100% - 20px)" : "0"})`,
          }}
        >
          <div className="flex items-baseline justify-between gap-2 border-b border-rule px-3 py-2">
            <p className="font-[650]">{chooser.passes.length} passes overlap here</p>
            <button type="button" onClick={() => setChooser(null)} className="link text-[12px]">
              Close
            </button>
          </div>
          <ul className="overflow-y-auto">
            {chooser.passes.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => onSelectPass(p)}
                  className="flex w-full flex-col px-3 py-1.5 text-left hover:bg-signal-wash"
                >
                  <span className="num font-[600] text-ink">
                    {formatDayShort(p.date)}, {formatTimeUtc(p.start)}
                  </span>
                  <span className="text-ink-2">
                    {directionLabel(p.direction)}, {stripLabel(p.stackId)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </>
  );

  return (
    <BaseMap
      key={region?.id ?? "none"}
      territory={outline ? [outline.geometry] : []}
      ref={mapRef}
      initialBbox={bbox}
      initialPadding={region?.kind === "state" ? 48 : 24}
      interactiveLayerIds={footprints ? [FILL_LAYER] : []}
      onClick={onClick}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      cursor={hovering && !pending ? "pointer" : "grab"}
      overlay={overlay}
    >
      {outline ? <RegionOutline feature={outline} /> : null}
      {footprints && outline && !pending ? (
        <>
          <FootprintLayers data={footprints} selectedDay={selectedDay} selectedPassId={selectedPassId} pending={pending} />
          {dailyPassIds.length ? dailyPassIds.map(id=><DailyImageLayer key={id} passId={id} opacity={dailyOpacity} beforeId={SELECTED_CASING_LAYER} onStatus={onImageStatus}/>) : <BrowseImageLayer image={image} beforeId={SELECTED_CASING_LAYER} />}
        </>
      ) : null}
    </BaseMap>
  );
}
