// MapLibre GL 6 is ESM-only and loads its Web Worker from a separate file, found with
// `new URL("./maplibre-gl-worker.mjs", import.meta.url)`. Once Vite pre-bundles (dev) or re-bundles (build)
// maplibre-gl, that relative file is no longer next to the module and the map stays blank with
// "Worker failed to load". Importing the worker with `?url` makes Vite serve it in dev and emit it as an
// asset in the build; setWorkerUrl points MapLibre at it. The worker file has no imports, so emitting it as is works.
import { setWorkerUrl } from "maplibre-gl";
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?url";

setWorkerUrl(workerUrl);
