import { describe, expect, it } from "vitest";
import type { BrowseInfo, Georef } from "../api/types";
import { browseAvailability } from "./browseImage";

// Real response from /api/passes/<053_D_103 after>/browse (2026-07-23).
const georef: Georef = {
  bounds: [-53.593447, -30.477322, -50.160023, -27.574939],
  corners: [
    [-53.593447, -27.574939],
    [-50.160023, -27.574939],
    [-50.160023, -30.477322],
    [-53.593447, -30.477322],
  ],
  projection: "EPSG:3857",
  width: 1935,
  height: 1871,
  rmsErrorPx: 1.81,
  pixelAspect: 0.999,
  clippedCorners: [],
  quality: "good",
};
const info: BrowseInfo = { passId: "p", url: "https://example.test/p_LATLON.png", thumbnail: "t", georef };

describe("browseAvailability", () => {
  it("uses georef.corners as given (top-left, top-right, bottom-right, bottom-left)", () => {
    const a = browseAvailability(info);
    expect(a.ok).toBe(true);
    if (a.ok) expect(a.corners).toBe(georef.corners);
  });

  it("refuses an image without georeferencing", () => {
    const a = browseAvailability({ ...info, georef: null });
    expect(a).toMatchObject({ ok: false, reason: "no-georef" });
  });

  it("refuses an image with low georeferencing quality and says why", () => {
    const a = browseAvailability({ ...info, georef: { ...georef, quality: "low", rmsErrorPx: 12.3 } });
    expect(a).toMatchObject({ ok: false, reason: "low-quality" });
    if (!a.ok) expect(a.message).toContain("12.3 px");
  });
});
