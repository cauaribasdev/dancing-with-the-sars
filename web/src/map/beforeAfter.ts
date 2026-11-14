// Pure rules for the before/after viewer (no React, no MapLibre), so they can be unit tested.
import type { BBox, LonLat } from "../api/types";

export type Side = "before" | "after";

export function otherSide(side: Side): Side {
  return side === "before" ? "after" : "before";
}

/** The parts of a keyboard event the viewer looks at. */
export interface KeyInput {
  key: string;
  altKey?: boolean;
  ctrlKey?: boolean;
  metaKey?: boolean;
  /** Tag name of the focused element (event.target), upper case as the DOM gives it. */
  targetTag?: string;
  targetEditable?: boolean;
}

/**
 * Keyboard shortcuts of the viewer, active anywhere on the page:
 * Space flips, B shows before, A shows after.
 * Returns null when the key is not ours or belongs to something else (typing in a field, a focused button
 * or link where Space already means "press", or a browser shortcut with a modifier).
 */
export function keyToSide(input: KeyInput, current: Side): Side | null {
  if (input.altKey || input.ctrlKey || input.metaKey) return null;
  const tag = input.targetTag?.toUpperCase();
  if (input.targetEditable || tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return null;
  const key = input.key.length === 1 ? input.key.toLowerCase() : input.key;
  if (key === " " || key === "Spacebar") {
    if (tag === "BUTTON" || tag === "A" || tag === "SUMMARY") return null;
    return otherSide(current);
  }
  if (key === "b") return "before";
  if (key === "a") return "after";
  return null;
}

/** Smallest bbox holding both. */
export function bboxUnion(a: BBox, b: BBox): BBox {
  return [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[2], b[2]), Math.max(a[3], b[3])];
}

/** Bbox around a set of points, padded by `pad` degrees on every side. Null for an empty list. */
export function bboxAround(points: LonLat[], pad = 0): BBox | null {
  if (points.length === 0) return null;
  let [w, s, e, n] = [Infinity, Infinity, -Infinity, -Infinity];
  for (const [lon, lat] of points) {
    w = Math.min(w, lon);
    s = Math.min(s, lat);
    e = Math.max(e, lon);
    n = Math.max(n, lat);
  }
  return [w - pad, s - pad, e + pad, n + pad];
}

/**
 * Plain description of a pass's viewing geometry (what the API calls stackId): "Track 53, frame 103, descending".
 * Two passes can be compared only when this is the same.
 */
export function describeGeometry(p: { track: number; frame: number; direction: string }): string {
  return `Track ${p.track}, frame ${p.frame}, ${p.direction}`;
}

/**
 * Grows a bbox southward by `fraction` of its height. The viewer's switch covers the bottom of the map,
 * so framing a slightly taller area keeps the place of interest above it.
 */
export function extendSouth(b: BBox, fraction: number): BBox {
  return [b[0], b[1] - (b[3] - b[1]) * fraction, b[2], b[3]];
}

/** Overlap of two boxes, or null when they do not touch. */
export function bboxIntersection(a: BBox, b: BBox): BBox | null {
  const w = Math.max(a[0], b[0]);
  const s = Math.max(a[1], b[1]);
  const e = Math.min(a[2], b[2]);
  const n = Math.min(a[3], b[3]);
  return w < e && s < n ? [w, s, e, n] : null;
}
