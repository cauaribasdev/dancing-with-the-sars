// Pure rules for the compare page.
import type { BBox, IsoDate, Pass } from "../../api/types";
import { bboxUnion } from "../../map/beforeAfter";

type PassLike = Pick<Pass, "id" | "start" | "date" | "stackId">;

/** Reads the two ids from the address. Empty values count as missing. */
export function readCompareParams(params: URLSearchParams): { before: string | null; after: string | null } {
  const clean = (v: string | null) => (v && v.trim() ? v.trim() : null);
  return { before: clean(params.get("before")), after: clean(params.get("after")) };
}

/** Puts the earlier pass first. `swapped` is true when the address had them the other way round. */
export function orderPasses<P extends PassLike>(first: P, second: P): { before: P; after: P; swapped: boolean } {
  return first.start <= second.start
    ? { before: first, after: second, swapped: false }
    : { before: second, after: first, swapped: true };
}

/** Whole days between two YYYY-MM-DD dates (UTC), always positive. */
export function daysBetween(a: IsoDate, b: IsoDate): number {
  const ms = Math.abs(Date.parse(b + "T00:00:00Z") - Date.parse(a + "T00:00:00Z"));
  return Math.round(ms / 86_400_000);
}

export interface CompareNotes {
  /** Same track, direction and frame: brightness differences can be read as change on the ground. */
  sameGeometry: boolean;
  samePass: boolean;
}

export function compareNotes(before: PassLike, after: PassLike): CompareNotes {
  return { sameGeometry: before.stackId === after.stackId, samePass: before.id === after.id };
}

/** Area to frame on the map (framing only; images are placed by georef.corners). */
export function compareArea(before: Pick<Pass, "bbox">, after: Pick<Pass, "bbox">): BBox {
  return bboxUnion(before.bbox, after.bbox);
}

/** "21:33 UTC" from an ISO datetime. */
export function formatTimeUtc(iso: string): string {
  const m = /T(\d{2}):(\d{2})/.exec(iso);
  return m ? `${m[1]}:${m[2]} UTC` : "";
}
