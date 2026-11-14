import { describe, expect, it } from "vitest";
import { bboxAround, bboxIntersection, bboxUnion, describeGeometry, extendSouth, keyToSide, otherSide } from "./beforeAfter";

describe("keyToSide", () => {
  it("flips with Space", () => {
    expect(keyToSide({ key: " " }, "before")).toBe("after");
    expect(keyToSide({ key: " " }, "after")).toBe("before");
    expect(keyToSide({ key: " ", targetTag: "CANVAS" }, "after")).toBe("before");
  });

  it("picks a side with B and A, in either case", () => {
    expect(keyToSide({ key: "b" }, "after")).toBe("before");
    expect(keyToSide({ key: "B" }, "after")).toBe("before");
    expect(keyToSide({ key: "a" }, "before")).toBe("after");
    expect(keyToSide({ key: "A" }, "after")).toBe("after");
  });

  it("leaves Space alone on buttons and links, where it already means press", () => {
    expect(keyToSide({ key: " ", targetTag: "BUTTON" }, "before")).toBeNull();
    expect(keyToSide({ key: " ", targetTag: "A" }, "before")).toBeNull();
    // but B and A still work there
    expect(keyToSide({ key: "b", targetTag: "BUTTON" }, "after")).toBe("before");
  });

  it("ignores typing in fields and browser shortcuts", () => {
    expect(keyToSide({ key: "a", targetTag: "INPUT" }, "before")).toBeNull();
    expect(keyToSide({ key: "b", targetTag: "textarea" }, "after")).toBeNull();
    expect(keyToSide({ key: "a", targetTag: "SELECT" }, "before")).toBeNull();
    expect(keyToSide({ key: "b", targetEditable: true }, "after")).toBeNull();
    expect(keyToSide({ key: "a", ctrlKey: true }, "before")).toBeNull();
    expect(keyToSide({ key: "b", metaKey: true }, "after")).toBeNull();
    expect(keyToSide({ key: " ", altKey: true }, "after")).toBeNull();
  });

  it("ignores other keys, including arrows (the map uses them to pan)", () => {
    expect(keyToSide({ key: "ArrowLeft" }, "after")).toBeNull();
    expect(keyToSide({ key: "x" }, "after")).toBeNull();
    expect(keyToSide({ key: "Enter" }, "after")).toBeNull();
  });
});

describe("otherSide", () => {
  it("swaps", () => {
    expect(otherSide("before")).toBe("after");
    expect(otherSide("after")).toBe("before");
  });
});

describe("describeGeometry", () => {
  it("names track, frame and direction", () => {
    expect(describeGeometry({ track: 53, frame: 103, direction: "descending" })).toBe("Track 53, frame 103, descending");
  });
});

describe("bbox helpers", () => {
  it("unions two boxes", () => {
    expect(bboxUnion([-53, -30, -50, -27], [-52, -32, -49, -29])).toEqual([-53, -32, -49, -27]);
  });

  it("pads a box around points", () => {
    const b = bboxAround(
      [
        [-51.23, -30.03],
        [-51.96, -29.47],
      ],
      0.1,
    );
    expect(b?.map((v) => Number(v.toFixed(2)))).toEqual([-52.06, -30.13, -51.13, -29.37]);
  });

  it("extends a box southward by a fraction of its height", () => {
    expect(extendSouth([-52, -30, -51, -29], 0.25)).toEqual([-52, -30.25, -51, -29]);
  });

  it("intersects boxes", () => {
    expect(bboxIntersection([-53, -30, -50, -27], [-52, -32, -49, -29])).toEqual([-52, -30, -50, -29]);
    expect(bboxIntersection([-53, -30, -50, -27], [-49, -32, -48, -29])).toBeNull();
  });

  it("returns null without points", () => {
    expect(bboxAround([])).toBeNull();
  });

});
