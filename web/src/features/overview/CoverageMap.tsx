import type { FilterSpecification } from "maplibre-gl";
import { useEffect, useMemo, useRef, useState } from "react";
import { Layer, Source, type MapLayerMouseEvent, type MapRef } from "react-map-gl/maplibre";
import type { CoverageResponse, Region, RegionsGeoJSON, StateCoverage, StoryListItem, StoryPlace } from "../../api/types";
import { regionName } from "../../api/regionNames";
import { BaseMap } from "../../map/BaseMap";
import { BRAZIL_BBOX, bboxToBounds } from "../../map/basemapConfig";
import { useLabelLayerId } from "../../map/layers";
import { ANNOTATION_LINE, MAP_COLORS } from "../../map/mapColors";
import { ErrorMessage, ProgressBar } from "../../ui/feedback";
import { formatDayShort, formatMonth, plural } from "../../ui/format";
import { CoverageLegend } from "./CoverageLegend";
import { coverageFillExpression } from "./coverageScale";
import { StoryMarker } from "./StoryMarker";

interface Props {
  geo: RegionsGeoJSON | undefined;
  geoError: string | null;
  coverage: CoverageResponse | undefined;
  coverageLoading: boolean;
  /** No data for the chosen month yet: colors on screen belong to the previous month (or none). */
  coveragePending: boolean;
  month: string;
  regions: Region[];
  selectedId: string;
  onSelect: (regionId: string) => void;
  story?: StoryListItem;
  storyPlace?: StoryPlace;
}

const FILL_LAYER = "states-fill";

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Joins the month's coverage onto each polygon's properties (days = distinctDates). */
function joinCoverage(geo: RegionsGeoJSON, coverage: CoverageResponse | undefined) {
  const byId = new Map<string, StateCoverage>(coverage?.states.map((s) => [s.id, s]));
  return {
    ...geo,
    features: geo.features.map((f) => {
      const c = byId.get(f.properties.id);
      return {
        ...f,
        properties: {
          ...f.properties,
          bbox: undefined, // arrays in properties become strings in MapLibre; not needed here
          days: c ? c.distinctDates : null,
          hasData: c ? 1 : 0,
        },
      };
    }),
  };
}

function CoverageLayers({
  data,
  selectedId,
  hoverId,
  dimmed,
  hasCoverage,
}: {
  data: ReturnType<typeof joinCoverage>;
  selectedId: string;
  hoverId: string | null;
  dimmed: boolean;
  hasCoverage: boolean;
}) {
  const beforeId = useLabelLayerId();
  const selectedFilter: FilterSpecification = [
    "any",
    ["==", ["get", "id"], selectedId],
    ["==", ["get", "parentId"], selectedId],
  ];
  return (
    <Source id="states" type="geojson" data={data}>
      <Layer
        id={FILL_LAYER}
        type="fill"
        beforeId={beforeId}
        paint={{
          "fill-color": coverageFillExpression("days"),
          "fill-opacity": dimmed ? 0.3 : 0.92,
          "fill-opacity-transition": { duration: 250 },
        }}
      />
      {/* 1 px of paper between neighboring states instead of a dark border */}
      <Layer
        id="states-gap"
        type="line"
        beforeId={beforeId}
        paint={{ "line-color": MAP_COLORS.paper, "line-width": 1, "line-opacity": 0.9 }}
      />
      {/* State with no pass: dashed outline (the legend shows the same) */}
      <Layer
        id="states-none"
        type="line"
        beforeId={beforeId}
        filter={["all", ["==", ["get", "hasData"], 1], ["<", ["get", "days"], 1]]}
        layout={{ visibility: hasCoverage && !dimmed ? "visible" : "none" }}
        paint={{ "line-color": MAP_COLORS.ink3, "line-width": 1, "line-dasharray": [2, 2] }}
      />
      <Layer
        id="states-hover"
        type="line"
        beforeId={beforeId}
        filter={["==", ["get", "id"], hoverId ?? ""]}
        paint={{ "line-color": MAP_COLORS.ink, "line-width": 1.5 }}
      />
      {/* Selection: yellow core over an ink casing */}
      <Layer
        id="states-selected-casing"
        type="line"
        beforeId={beforeId}
        filter={selectedFilter}
        layout={{ "line-join": "round" }}
        paint={{ "line-color": MAP_COLORS.ink, "line-width": ANNOTATION_LINE.casingWidth }}
      />
      <Layer
        id="states-selected"
        type="line"
        beforeId={beforeId}
        filter={selectedFilter}
        layout={{ "line-join": "round" }}
        paint={{ "line-color": MAP_COLORS.signal, "line-width": ANNOTATION_LINE.coreWidth }}
      />
    </Source>
  );
}

interface Hover {
  id: string;
  x: number;
  y: number;
}

/** Overview map: states colored by days with a pass, hover, click, and the story marker. */
export function CoverageMap({
  geo,
  geoError,
  coverage,
  coverageLoading,
  coveragePending,
  month,
  regions,
  selectedId,
  onSelect,
  story,
  storyPlace,
}: Props) {
  const mapRef = useRef<MapRef>(null);
  const [hover, setHover] = useState<Hover | null>(null);
  const data = useMemo(() => (geo ? joinCoverage(geo, coverage) : undefined), [geo, coverage]);
  const statesById = useMemo(() => new Map(coverage?.states.map((s) => [s.id, s])), [coverage]);
  const regionById = useMemo(() => new Map(regions.map((r) => [r.id, r])), [regions]);

  // Frame the chosen region (picked on the map or from the list).
  const firstFit = useRef(true);
  useEffect(() => {
    const map = mapRef.current;
    const region = regionById.get(selectedId);
    if (!map || !region) return;
    const bbox = region.kind === "country" ? BRAZIL_BBOX : region.bbox;
    const instant = firstFit.current || prefersReducedMotion();
    firstFit.current = false;
    map.fitBounds(bboxToBounds(bbox), {
      padding: region.kind === "state" ? 72 : 40,
      maxZoom: 7,
      duration: instant ? 0 : 900,
    });
  }, [selectedId, regionById]);

  const onMove = (e: MapLayerMouseEvent) => {
    const f = e.features?.[0];
    const id = f?.properties?.id as string | undefined;
    setHover(id ? { id, x: e.point.x, y: e.point.y } : null);
  };

  const onClick = (e: MapLayerMouseEvent) => {
    // Clicks on HTML markers (the story tag) bubble to the map; let the link handle them alone.
    const target = e.originalEvent.target;
    if (target instanceof Element && target.closest(".maplibregl-marker")) return;
    const id = e.features?.[0]?.properties?.id as string | undefined;
    // Clicking outside any state, or on the selected one, goes back to Brazil.
    onSelect(id && id !== selectedId ? id : "br");
  };

  const hoverRegion = hover ? regionById.get(hover.id) : undefined;
  const hoverCov = hover ? statesById.get(hover.id) : undefined;

  const overlay = (
    <>
      {coverageLoading ? (
        <div className="absolute inset-x-0 top-0">
          <ProgressBar label={`Loading coverage for ${formatMonth(month)}`} />
        </div>
      ) : null}
      {geoError ? (
        <div className="pointer-events-auto absolute left-4 top-4 max-w-sm rounded-[4px] bg-sheet p-3 shadow-[0_0_0_1px_var(--color-rule)]">
          <ErrorMessage>Could not load the state outlines. {geoError}</ErrorMessage>
        </div>
      ) : null}
      {/* Lifted above the attribution line, which spans most of the map width when expanded. */}
      <div className="absolute bottom-9 left-3 sm:left-4">
        <CoverageLegend month={month} dimmed={coveragePending} />
      </div>
      {hover && hoverRegion ? (
        <div
          className="absolute z-10 hidden w-max max-w-[240px] rounded-[4px] bg-sheet px-3 py-2 text-[13px] shadow-[0_0_0_1px_var(--color-rule),0_6px_16px_-8px_rgb(22_32_42/0.35)] [@media(hover:hover)]:block"
          style={{
            left: hover.x + 14,
            top: hover.y + 14,
            transform: `translate(${hover.x > 260 ? "calc(-100% - 28px)" : "0"}, 0)`,
          }}
        >
          <p className="place text-[17px] leading-tight text-ink">{regionName(hoverRegion)}</p>
          {coveragePending || !hoverCov ? (
            <p className="text-ink-3">Counting passes…</p>
          ) : (
            <>
              <p className="num font-[650] text-ink">{plural(hoverCov.distinctDates, "day with a pass", "days with a pass")}</p>
              <p className="num text-ink-2">
                {plural(hoverCov.acquisitions, "pass", "passes")}
                {hoverCov.lastDate ? `, latest on ${formatDayShort(hoverCov.lastDate)}` : ""}
              </p>
            </>
          )}
        </div>
      ) : null}
    </>
  );

  return (
    <BaseMap
      ref={mapRef}
      interactiveLayerIds={[FILL_LAYER]}
      onMouseMove={onMove}
      onMouseLeave={() => setHover(null)}
      onClick={onClick}
      cursor={hover ? "pointer" : "grab"}
      overlay={overlay}
      initialPadding={32}
    >
      {data ? (
        <CoverageLayers
          data={data}
          selectedId={selectedId}
          hoverId={hover?.id ?? null}
          dimmed={coveragePending}
          hasCoverage={!!coverage}
        />
      ) : null}
      {story ? <StoryMarker story={story} place={storyPlace} region={regionById.get(story.regionId)} /> : null}
    </BaseMap>
  );
}
