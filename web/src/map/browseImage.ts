// Rules and loading for browse images (PNG on ASF, 2-7 MB).
import type { BrowseInfo, Georef } from "../api/types";

export type BrowseAvailability =
  | { ok: true; url: string; corners: Georef["corners"]; georef: Georef }
  | { ok: false; reason: "no-georef" | "low-quality"; message: string };

/**
 * Decides whether the image may go on the map. Position ALWAYS comes from `georef.corners`;
 * never from the pass footprint or bbox, which are 7-11% off (see the API README).
 */
export function browseAvailability(info: BrowseInfo): BrowseAvailability {
  const g = info.georef;
  if (!g) {
    return {
      ok: false,
      reason: "no-georef",
      message:
        "We could not work out where this image sits on the map, so it is not shown. The rest of the pass information still applies.",
    };
  }
  if (g.quality === "low") {
    return {
      ok: false,
      reason: "low-quality",
      message: `The computed position of this image is not reliable (off by ${g.rmsErrorPx.toFixed(1)} px), so it is not shown, to avoid drawing water in the wrong place.`,
    };
  }
  return { ok: true, url: info.url, corners: g.corners, georef: g };
}

// --- Loading with progress and an in-memory cache ------------------------------------------

const MAX_CACHED = 8;

interface Entry {
  promise: Promise<string>; // blob: URL
  progress: number | null; // 0..1, or null when the server does not send a size
  listeners: Set<(fraction: number | null) => void>;
}
const cache = new Map<string, Entry>(); // PNG url -> download

/**
 * Downloads the PNG with progress and returns a `blob:` URL for the MapLibre `image` source.
 * Downloaded images stay in memory (up to 8), so switching between before and after does not download again.
 * Two components asking for the same image share one download and one progress value.
 */
export function loadBrowseImage(
  url: string,
  onProgress?: (fraction: number | null) => void,
): { promise: Promise<string>; unsubscribe: () => void } {
  let entry = cache.get(url);
  if (entry) {
    cache.delete(url); // move to the end (LRU)
    cache.set(url, entry);
  } else {
    const e: Entry = { promise: Promise.resolve(""), progress: 0, listeners: new Set() };
    e.promise = download(url, (f) => {
      e.progress = f;
      e.listeners.forEach((l) => l(f));
    });
    e.promise.catch(() => cache.delete(url));
    cache.set(url, e);
    entry = e;
    evict();
  }
  const current = entry;
  if (onProgress) {
    current.listeners.add(onProgress);
    onProgress(current.progress);
  }
  return { promise: current.promise, unsubscribe: () => onProgress && current.listeners.delete(onProgress) };
}

function evict() {
  while (cache.size > MAX_CACHED) {
    const [oldUrl, old] = cache.entries().next().value as [string, Entry];
    cache.delete(oldUrl);
    old.promise.then((blobUrl) => URL.revokeObjectURL(blobUrl)).catch(() => {});
  }
}

async function download(url: string, onProgress?: (fraction: number | null) => void): Promise<string> {
  const res = await fetch(url, { mode: "cors" });
  if (!res.ok) throw new Error(`ASF answered ${res.status} when downloading the image.`);

  const total = Number(res.headers.get("content-length")) || 0;
  let blob: Blob;
  if (res.body && total > 0) {
    const reader = res.body.getReader();
    const chunks: Uint8Array<ArrayBuffer>[] = [];
    let received = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      received += value.byteLength;
      onProgress?.(Math.min(1, received / total));
    }
    // ASF serves these as binary/octet-stream; the explicit type makes sure they decode as PNG.
    blob = new Blob(chunks, { type: "image/png" });
  } else {
    onProgress?.(null);
    blob = new Blob([await res.arrayBuffer()], { type: "image/png" });
  }
  return URL.createObjectURL(blob);
}
