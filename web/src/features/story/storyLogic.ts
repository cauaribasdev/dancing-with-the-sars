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

/** Datas das duas passagens em português. */
export function pairDates(p: Pick<StoryPair, "before" | "after">): string {
  return `${formatDayShort(p.before.date)} e ${formatDayShort(p.after.date)}`;
}

/** Distância das passagens em relação à data do evento. */
export function pairTiming(p: Pick<StoryPair, "daysBeforeEvent" | "daysAfterEvent">): string {
  const before = p.daysBeforeEvent === 0 ? "Na data do evento" : `${plural(p.daysBeforeEvent, "dia", "dias")} antes do evento`;
  const after = p.daysAfterEvent === 0 ? "na data do evento" : `${plural(p.daysAfterEvent, "dia", "dias")} depois`;
  return `${before} e ${after}`;
}

/**
 * Área coberta por um par, a partir dos contornos das passagens. Usada apenas para enquadrar o mapa: as imagens são sempre
 * posicionadas por georef.corners. (Os limites do PNG são maiores que os dados porque a faixa fica inclinada dentro deles.)
 */
export function pairArea(p: Pick<StoryPair, "before" | "after">): BBox {
  return bboxUnion(p.before.bbox, p.after.bbox);
}

/** Área a enquadrar ao escolher um par: a parte coberta da área inicial da história ou o par inteiro. */
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
