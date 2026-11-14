// Pure helpers for the story page.
import type { BBox, Story, StoryPair, StoryPlace } from "../../api/types";
import { bboxAround, bboxIntersection, bboxUnion } from "../../map/beforeAfter";
import { formatDayShort, plural } from "../../ui/format";

/** Featured pairs, in API order. The first one is the default. */
export function featuredPairs(story: Pick<Story, "pairs">): StoryPair[] {
  return story.pairs.filter((p) => p.featured);
}

export function otherPairs(story: Pick<Story, "pairs">): StoryPair[] {
  return story.pairs.filter((p) => !p.featured);
}

/** Stable key for a pair (React keys, selection). */
export function pairKey(p: Pick<StoryPair, "before" | "after">): string {
  return `${p.before.id}|${p.after.id}`;
}

/** "Jul 11 and Jul 23" */
export function pairDates(p: Pick<StoryPair, "before" | "after">): string {
  return `${formatDayShort(p.before.date)} and ${formatDayShort(p.after.date)}`;
}

/** "11 days before the event and 1 day after"; a pass on the event date says so. */
export function pairTiming(p: Pick<StoryPair, "daysBeforeEvent" | "daysAfterEvent">): string {
  const before = p.daysBeforeEvent === 0 ? "On the event date" : `${plural(p.daysBeforeEvent, "day", "days")} before the event`;
  const after = p.daysAfterEvent === 0 ? "on the event date" : `${plural(p.daysAfterEvent, "day", "days")} after`;
  return `${before} and ${after}`;
}

/**
 * Area a pair covers, from the passes' outlines. Only for framing the map: the images themselves are always
 * placed by georef.corners. (The PNG bounds are larger than the data, because the strip is slanted inside them.)
 */
export function pairArea(p: Pick<StoryPair, "before" | "after">): BBox {
  return bboxUnion(p.before.bbox, p.after.bbox);
}

/** What to frame when a pair is chosen: the part of the story's opening area the pair covers, or the whole pair. */
export function pairFocus(p: Pick<StoryPair, "before" | "after">, openingArea: BBox): BBox {
  const area = pairArea(p);
  return bboxIntersection(area, openingArea) ?? area;
}

/**
 * Opening view: the story's places with some room around them (for the July 2026 flood, Lajeado,
 * the lower Taquari and Jacuí, and Lake Guaíba). Falls back to the region when there are no places.
 */
export function storyOpeningArea(places: StoryPlace[], fallback: BBox, pad = 0.12): BBox {
  return bboxAround(
    places.map((p) => [p.lon, p.lat]),
    pad,
  ) ?? fallback;
}
