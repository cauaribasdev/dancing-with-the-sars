// TanStack Query hooks for each API route. Pages use only these hooks, never fetch directly.
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { apiGet } from "./client";
import type {
  BrowseInfo,
  CoverageResponse,
  DateWindow,
  FootprintsGeoJSON,
  IsoDate,
  PassResponse,
  RegionKind,
  RegionPairsResponse,
  RegionPassesResponse,
  RegionsGeoJSON,
  RegionsResponse,
  StoriesResponse,
  Story,
} from "./types";

const HOUR = 60 * 60 * 1000;

/** Cache keys, exported for anyone who needs to invalidate or prefetch. */
export const queryKeys = {
  regions: (kind?: RegionKind) => ["regions", kind ?? "all"] as const,
  regionsGeo: (kind: RegionKind) => ["regions-geojson", kind] as const,
  coverage: (w: DateWindow) => ["coverage", w.start, w.end] as const,
  stories: () => ["stories"] as const,
  story: (id: string) => ["story", id] as const,
  pass: (id: string) => ["pass", id] as const,
  browse: (id: string) => ["browse", id] as const,
  regionPasses: (id: string, w: DateWindow) => ["region-passes", id, w.start, w.end] as const,
  regionFootprints: (id: string, w: DateWindow) => ["region-footprints", id, w.start, w.end] as const,
  regionPairs: (id: string, w: DateWindow, eventDate?: IsoDate) =>
    ["region-pairs", id, w.start, w.end, eventDate ?? null] as const,
};

/** Region list (Brazil, 5 macro-regions, 27 states) with bbox. Rarely changes. */
export function useRegions(kind?: RegionKind) {
  return useQuery({
    queryKey: queryKeys.regions(kind),
    queryFn: ({ signal }) => apiGet<RegionsResponse>("/regions", { kind }, signal),
    select: (d) => d.regions,
    staleTime: Infinity,
  });
}

/** Region polygons for drawing on the map. */
export function useRegionsGeoJSON(kind: RegionKind = "state") {
  return useQuery({
    queryKey: queryKeys.regionsGeo(kind),
    queryFn: ({ signal }) => apiGet<RegionsGeoJSON>("/regions/geojson", { kind }, signal),
    staleTime: Infinity,
  });
}

/**
 * Coverage per state across Brazil (max 31 days). Cold request ~3 s, cached ~0.2 s.
 * Keeps the previous month on screen while the new one loads (`isPlaceholderData`).
 */
export function useCoverage(window: DateWindow) {
  return useQuery({
    queryKey: queryKeys.coverage(window),
    queryFn: ({ signal }) => apiGet<CoverageResponse>("/coverage", { ...window }, signal),
    placeholderData: keepPreviousData,
    staleTime: HOUR,
  });
}

export function useStories() {
  return useQuery({
    queryKey: queryKeys.stories(),
    queryFn: ({ signal }) => apiGet<StoriesResponse>("/stories", undefined, signal),
    select: (d) => d.stories,
    staleTime: HOUR,
  });
}

/** Full story: narrative, sources, passes and featured pairs already georeferenced. */
export function useStory(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.story(id ?? ""),
    queryFn: ({ signal }) => apiGet<Story>(`/stories/${encodeURIComponent(id!)}`, undefined, signal),
    enabled: !!id,
    staleTime: HOUR,
  });
}

export function usePass(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.pass(id ?? ""),
    queryFn: ({ signal }) => apiGet<PassResponse>(`/passes/${encodeURIComponent(id!)}`, undefined, signal),
    enabled: !!id,
    staleTime: HOUR,
  });
}

/** Browse PNG URL + georeferenced corners. Georeferencing is cached permanently on the server. */
export function useBrowse(passId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.browse(passId ?? ""),
    queryFn: ({ signal }) =>
      apiGet<BrowseInfo>(`/passes/${encodeURIComponent(passId!)}/browse`, undefined, signal),
    enabled: !!passId,
    staleTime: Infinity,
  });
}

/** Passes touching the region polygon + timeline + summary. Limits: state 366 days, macro-region 92, country 31. */
export function useRegionPasses(regionId: string | undefined, window: DateWindow) {
  return useQuery({
    queryKey: queryKeys.regionPasses(regionId ?? "", window),
    queryFn: ({ signal }) =>
      apiGet<RegionPassesResponse>(`/regions/${encodeURIComponent(regionId!)}/passes`, { ...window }, signal),
    enabled: !!regionId,
    placeholderData: keepPreviousData,
    staleTime: HOUR,
  });
}

/** The same passes as GeoJSON outlines. Use them only to draw outlines, never to position an image. */
export function useRegionFootprints(regionId: string | undefined, window: DateWindow) {
  return useQuery({
    queryKey: queryKeys.regionFootprints(regionId ?? "", window),
    queryFn: ({ signal }) =>
      apiGet<FootprintsGeoJSON>(`/regions/${encodeURIComponent(regionId!)}/footprints`, { ...window }, signal),
    enabled: !!regionId,
    placeholderData: keepPreviousData,
    staleTime: HOUR,
  });
}

/**
 * Before/after pairs with the same geometry (same stackId).
 * With `eventDate`: the last pass before and the first after the event ("event" mode); without it, consecutive pairs.
 */
export function useRegionPairs(regionId: string | undefined, window: DateWindow, eventDate?: IsoDate) {
  return useQuery({
    queryKey: queryKeys.regionPairs(regionId ?? "", window, eventDate),
    queryFn: ({ signal }) =>
      apiGet<RegionPairsResponse>(
        `/regions/${encodeURIComponent(regionId!)}/pairs`,
        { ...window, eventDate },
        signal,
      ),
    enabled: !!regionId,
    placeholderData: keepPreviousData,
    staleTime: HOUR,
  });
}
