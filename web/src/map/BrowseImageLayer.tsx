import { useEffect, useMemo, useState } from "react";
import { Layer, Source } from "react-map-gl/maplibre";
import { describeError } from "../api/client";
import { useBrowse } from "../api/hooks";
import type { Georef } from "../api/types";
import { browseAvailability, loadBrowseImage } from "./browseImage";
import { useLabelLayerId } from "./layers";

export type BrowseImageState =
  | { status: "idle" }
  | { status: "loading-info" }
  | { status: "loading-image"; progress: number | null; georef: Georef }
  | { status: "ready"; imageUrl: string; georef: Georef }
  | { status: "unavailable"; reason: "no-georef" | "low-quality"; message: string }
  | { status: "error"; message: string };

/**
 * Fetches /api/passes/:id/browse, checks the georeferencing and downloads the PNG with progress.
 * Feed the result to <BrowseImageLayer image={...}/> (inside the map) and
 * <BrowseImageStatus image={...}/> (outside the map, or in BaseMap's `overlay`).
 */
export function useBrowseImage(passId: string | undefined): BrowseImageState {
  const browse = useBrowse(passId);
  const availability = useMemo(() => (browse.data ? browseAvailability(browse.data) : null), [browse.data]);
  const [image, setImage] = useState<{ url: string; blobUrl?: string; progress: number | null; error?: string }>();

  const pngUrl = availability?.ok ? availability.url : undefined;

  useEffect(() => {
    if (!pngUrl) return;
    let alive = true;
    setImage({ url: pngUrl, progress: 0 });
    const { promise, unsubscribe } = loadBrowseImage(pngUrl, (progress) => {
      if (alive) setImage((prev) => (prev?.url === pngUrl && !prev.blobUrl ? { ...prev, progress } : prev));
    });
    promise.then(
      (blobUrl) => {
        if (alive) setImage({ url: pngUrl, blobUrl, progress: 1 });
      },
      (err: unknown) => {
        if (alive)
          setImage({
            url: pngUrl,
            progress: null,
            error: err instanceof Error ? err.message : "Could not download the image from ASF.",
          });
      },
    );
    return () => {
      alive = false;
      unsubscribe();
    };
  }, [pngUrl]);

  if (!passId) return { status: "idle" };
  if (browse.isError) return { status: "error", message: describeError(browse.error) };
  if (!availability) return { status: "loading-info" };
  if (!availability.ok) return { status: "unavailable", reason: availability.reason, message: availability.message };
  const current = image?.url === availability.url ? image : undefined;
  if (current?.error) return { status: "error", message: current.error };
  if (current?.blobUrl) return { status: "ready", imageUrl: current.blobUrl, georef: availability.georef };
  return { status: "loading-image", progress: current?.progress ?? 0, georef: availability.georef };
}

export interface BrowseImageLayerProps {
  image: BrowseImageState;
  /** Unique id when there is more than one image on the same map (e.g. before and after). */
  id?: string;
  opacity?: number;
  /** Layer the image is inserted under. Default: just below the basemap labels. */
  beforeId?: string;
}

/**
 * Draws the browse image as a MapLibre `image` source, positioned by `georef.corners`
 * (top-left, top-right, bottom-right, bottom-left). Draws only when `image.status === "ready"`.
 */
export function BrowseImageLayer({ image, id = "browse", opacity = 1, beforeId }: BrowseImageLayerProps) {
  const labelLayerId = useLabelLayerId();
  if (image.status !== "ready") return null;
  return (
    <Source id={`${id}-source`} type="image" url={image.imageUrl} coordinates={image.georef.corners}>
      <Layer
        id={`${id}-layer`}
        type="raster"
        beforeId={beforeId ?? labelLayerId}
        paint={{ "raster-opacity": opacity, "raster-fade-duration": 0, "raster-resampling": "linear" }}
      />
    </Source>
  );
}
