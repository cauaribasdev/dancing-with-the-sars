// Run from the repository root with Vite on port 5173. API responses are synthetic fixtures.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
const require = createRequire(import.meta.url);
const { PNG } = require("pngjs");

const passes = [
  { id: "before", date: "2026-07-11", start: "2026-07-11T21:00:00Z", end: "2026-07-11T21:05:00Z", stackId: "053_D_103", track: 53, frame: 103, direction: "descending", maturity: "validated", productVersion: "1", sizeBytes: 1_000, frequencies: ["A"], polarizations: ["HH"], bbox: [-53, -30, -51, -28] },
  { id: "after", date: "2026-07-23", start: "2026-07-23T09:00:00Z", end: "2026-07-23T09:05:00Z", stackId: "103_A_162", track: 103, frame: 162, direction: "ascending", maturity: "validated", productVersion: "1", sizeBytes: 1_000, frequencies: ["A"], polarizations: ["HH"], bbox: [-53, -30, -51, -28] },
];
const corners = [[-53, -28], [-51, -28], [-51, -30], [-53, -30]];
const georef = { bounds: [-53, -30, -51, -28], corners, projection: "EPSG:3857", width: 1, height: 1, rmsErrorPx: 0, pixelAspect: 1, clippedCorners: [], quality: "good" };
const pngImage = new PNG({ width: 8, height: 8 });
for (let i = 0; i < pngImage.data.length; i += 4) {
  pngImage.data[i] = 50;
  pngImage.data[i + 1] = 150;
  pngImage.data[i + 2] = 200;
  pngImage.data[i + 3] = 255;
}
const png = PNG.sync.write(pngImage);
const browser = await chromium.launch({ headless: true, args: ["--no-sandbox", "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript(() => {
    const originalGetContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (contextType) {
      if (contextType === "webgl" || contextType === "webgl2" || contextType === "experimental-webgl") {
        return null;
      }
      return originalGetContext.apply(this, arguments);
    };
  });
  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    if (!url.pathname.startsWith("/api/")) return route.continue();
    if (url.pathname.startsWith("/api/passes/") && url.pathname.endsWith("/browse")) {
      const id = url.pathname.includes("/before/") ? "before" : "after";
      return route.fulfill({ json: { passId: id, url: `https://example.test/preview-${id}.png`, thumbnail: "", georef } });
    }
    const pass = passes.find((item) => url.pathname === `/api/passes/${item.id}`);
    if (pass) return route.fulfill({ json: { dataSource: "cache", pass } });
    if (url.pathname === "/api/regions/geojson") return route.fulfill({ json: { type: "FeatureCollection", features: [] } });
    return route.fulfill({ status: 404, json: { error: { code: "not_found", message: "fixture" } } });
  });
  await page.route("https://example.test/preview-*.png", route => route.fulfill({status:200,contentType:"image/png",headers:{"access-control-allow-origin":"*"},body:png}));
  await page.goto("http://localhost:5173/compare?before=before&after=after");
  await page.getByRole("heading", { name: "Antes e depois" }).waitFor();
  const warning = page.getByRole("note");
  await warning.waitFor();
  assert.match(await warning.innerText(), /geometrias de observação diferentes.*Track 53.*Track 103/s);
  await page.getByText(/Não foi possível iniciar o mapa/).waitFor();
  await page.getByRole("alert").filter({hasText:"Não foi possível iniciar o mapa"}).getByRole("button", {name:"Tentar novamente"}).click();
  await page.getByText(/Não foi possível iniciar o mapa/).waitFor();
  await page.getByRole("heading", { name: "Antes e depois" }).waitFor();
  assert.deepEqual(errors, []);
  console.log("PASS: unavailable WebGL shows retry and preserves comparison details");
} finally {
  await browser.close();
}
