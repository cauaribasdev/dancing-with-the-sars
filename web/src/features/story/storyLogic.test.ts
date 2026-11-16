import { describe, expect, it } from "vitest";
import type { BBox, Pass, StoryPair } from "../../api/types";
import { featuredPairs, otherPairs, pairArea, pairDates, pairFocus, pairKey, pairTiming, storyOpeningArea } from "./storyLogic";

function pass(id: string, date: string, bbox: BBox): Pass {
  return { id, date, bbox } as Pass;
}

function pair(over: Partial<StoryPair> & { id: string }): StoryPair {
  return {
    stackId: "053_D_103",
    track: 53,
    frame: 103,
    direction: "descending",
    before: pass(`${over.id}-b`, "2026-07-11", [-53, -30, -50, -27]),
    after: pass(`${over.id}-a`, "2026-07-23", [-53.2, -30.1, -50.1, -27.1]),
    daysApart: 12,
    daysBeforeEvent: 11,
    daysAfterEvent: 1,
    placesCovered: [],
    featured: false,
    ...over,
  };
}

describe("featured and other pairs", () => {
  const pairs = [pair({ id: "x" }), pair({ id: "f1", featured: true }), pair({ id: "y" }), pair({ id: "f2", featured: true })];

  it("keeps API order for featured pairs", () => {
    expect(featuredPairs({ pairs }).map((p) => p.before.id)).toEqual(["f1-b", "f2-b"]);
  });

  it("lists the rest", () => {
    expect(otherPairs({ pairs }).map((p) => p.before.id)).toEqual(["x-b", "y-b"]);
  });

  it("builds a key from both pass ids", () => {
    expect(pairKey(pairs[0])).toBe("x-b|x-a");
  });
});

describe("pair text", () => {
  it("names both dates", () => {
    expect(pairDates(pair({ id: "p" }))).toBe("11 de jul. e 23 de jul.");
  });

  it("says how far each pass is from the event", () => {
    expect(pairTiming({ daysBeforeEvent: 11, daysAfterEvent: 1 })).toBe("11 dias antes do evento e 1 dia depois");
    expect(pairTiming({ daysBeforeEvent: 12, daysAfterEvent: 0 })).toBe("12 dias antes do evento e na data do evento");
    expect(pairTiming({ daysBeforeEvent: 1, daysAfterEvent: 5 })).toBe("1 dia antes do evento e 5 dias depois");
  });
});

describe("pairArea and pairFocus", () => {
  it("joins the two passes' outlines", () => {
    expect(pairArea(pair({ id: "n" }))).toEqual([-53.2, -30.1, -50, -27]);
  });

  it("frames the part of the opening area the pair covers", () => {
    const p = pair({
      id: "s",
      before: pass("b", "2026-07-15", [-52.6, -32.3, -49.5, -29.8]),
      after: pass("a", "2026-07-27", [-52.6, -32.3, -49.5, -29.8]),
    });
    expect(pairFocus(p, [-52.08, -30.35, -51.11, -29.35])).toEqual([-52.08, -30.35, -51.11, -29.8]);
  });

  it("frames the whole pair when it misses the opening area", () => {
    expect(pairFocus(pair({ id: "m" }), [-40, -10, -39, -9])).toEqual([-53.2, -30.1, -50, -27]);
  });
});

describe("storyOpeningArea", () => {
  it("pads the box around the places", () => {
    const area = storyOpeningArea(
      [
        { name: "Porto Alegre", lon: -51.23, lat: -30.03 },
        { name: "Lajeado", lon: -51.96, lat: -29.47 },
      ],
      [-57, -33, -49, -27],
      0.2,
    );
    expect(area.map((v) => Number(v.toFixed(2)))).toEqual([-52.16, -30.23, -51.03, -29.27]);
  });

  it("falls back to the region without places", () => {
    expect(storyOpeningArea([], [-57, -33, -49, -27])).toEqual([-57, -33, -49, -27]);
  });
});
