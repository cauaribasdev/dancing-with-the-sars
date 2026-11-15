// Page addresses. Use these helpers in every <Link> so URLs stay the same everywhere.
import type { DateWindow } from "../api/types";

export const paths = {
  home: () => "/",
  /** Overview. `month` = "YYYY-MM", `region` = selected region id. */
  overview: (opts?: { month?: string; region?: string }) =>
    withQuery("/explore", { month: opts?.month, region: opts?.region }),

  /** Region page. `start`/`end` (YYYY-MM-DD) are optional; the page picks a default. */
  region: (regionId: string, period?: DateWindow) =>
    withQuery(`/region/${encodeURIComponent(regionId)}`, { start: period?.start, end: period?.end }),

  story: (storyId: string) => `/story/${encodeURIComponent(storyId)}`,

  /** Before/after comparison. Both passes must share the same stackId. */
  compare: (beforePassId: string, afterPassId: string) =>
    withQuery("/compare", { before: beforePassId, after: afterPassId }),
};

function withQuery(path: string, params: Record<string, string | undefined>): string {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v) q.set(k, v);
  const s = q.toString();
  return s ? `${path}?${s}` : path;
}
