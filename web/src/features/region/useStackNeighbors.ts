import { useMemo } from "react";
import { describeError } from "../../api/client";
import { useRegionPasses } from "../../api/hooks";
import type { DateWindow, Pass } from "../../api/types";
import { findNeighbors, marginWindows } from "./regionLogic";

export type NeighborState =
  | { status: "found"; pass: Pass }
  | { status: "searching" }
  | { status: "none" }
  | { status: "error"; message: string };

/**
 * Previous and next pass of the selected pass's strip. Looks in the period first; when a side is missing,
 * asks the API for the 24 days just outside the period on that side (one request per side, shared by every pass).
 */
export function useStackNeighbors(
  regionId: string | undefined,
  pass: Pass | undefined,
  periodPasses: Pass[],
  window: DateWindow,
  today: Date,
): { previous: NeighborState; next: NeighborState } {
  const inPeriod = useMemo(
    () => (pass ? findNeighbors(pass, periodPasses) : { previous: undefined, next: undefined }),
    [pass, periodPasses],
  );
  const margins = useMemo(() => marginWindows(window, today), [window, today]);
  const needBefore = !!pass && !inPeriod.previous && !!margins.before;
  const needAfter = !!pass && !inPeriod.next && !!margins.after;
  const before = useRegionPasses(needBefore ? regionId : undefined, margins.before ?? window);
  const after = useRegionPasses(needAfter ? regionId : undefined, margins.after ?? window);

  function side(found: Pass | undefined, need: boolean, q: typeof before, pick: "previous" | "next"): NeighborState {
    if (found) return { status: "found", pass: found };
    if (!pass || !need) return { status: "none" };
    // Placeholder data belongs to another period: ignore it.
    const data = q.isPlaceholderData ? undefined : q.data;
    if (data) {
      const n = findNeighbors(pass, data.passes)[pick];
      return n ? { status: "found", pass: n } : { status: "none" };
    }
    if (q.isError) return { status: "error", message: describeError(q.error) };
    return { status: "searching" };
  }

  return {
    previous: side(inPeriod.previous, needBefore, before, "previous"),
    next: side(inPeriod.next, needAfter, after, "next"),
  };
}
