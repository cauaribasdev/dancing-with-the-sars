// Run from the repository root with Vite on port 5173. API responses are synthetic fixtures.
import assert from "node:assert/strict";
import fs from "node:fs";
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");

const geo = JSON.parse(fs.readFileSync("server/data/regions.geojson", "utf8"));
const states = geo.features.filter((feature) => feature.properties.kind === "state");
const region = states.find((feature) => feature.properties.id === "sc").properties;
const unavailable = { error: { code: "upstream_unavailable", message: "fixture" } };
const empty = { region, reference: { lon: -49.5, lat: -27.5, kind: "state" }, total: 0, organizations: [], campaigns: [], campaignsStatus: "empty" };
const withOrganization = {
  ...empty,
  dataSource: "stale",
  total: 1,
  organizations: [{
    id: "osc-1", name: "Organização exemplo", areas: ["5"], municipality: { code: "4205407", name: "Florianópolis" },
    lon: -48.55, lat: -27.6, distanceKm: 5, url: null,
  }],
};

async function routeApi(page, organizationsResponse) {
  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    if (!url.pathname.startsWith("/api/")) return route.continue();
    if (url.pathname === "/api/regions") return route.fulfill({ json: { regions: states.map((feature) => feature.properties) } });
    if (url.pathname === "/api/regions/geojson") return route.fulfill({ json: { ...geo, features: states } });
    if (url.pathname === "/api/stories") return route.fulfill({ json: { stories: [] } });
    if (url.pathname === "/api/regions/sc/organizations") {
      return organizationsResponse === "unavailable"
        ? route.fulfill({ status: 503, json: unavailable })
        : route.fulfill({ json: { ...organizationsResponse, dataSource: organizationsResponse.dataSource ?? "cache", nextCursor: null } });
    }
    return route.fulfill({ status: 503, json: unavailable });
  });
}

const browser = await chromium.launch({ headless: true, args: ["--no-sandbox", "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
try {
  const failed = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await routeApi(failed, "unavailable");
  await failed.goto("http://localhost:5173/region/sc?tab=help");
  await failed.getByRole("heading", { name: "Como ajudar" }).waitFor();
  await failed.getByRole("alert").waitFor();
  await failed.getByRole("button", { name: "Tentar novamente" }).waitFor();
  await failed.close();

  const noResults = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await routeApi(noResults, empty);
  await noResults.goto("http://localhost:5173/region/sc?tab=help");
  await noResults.getByText("Nenhuma organização encontrada para as áreas disponíveis (assistência social e saúde).").waitFor();
  assert.equal(await noResults.getByRole("alert").count(), 0);
  assert.equal(await noResults.getByText(/campanhas indisponíveis|campanhas não configuradas/i).count(), 0);
  await noResults.close();

  const distance = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await routeApi(distance, withOrganization);
  let organizationRequests = 0;
  distance.on("request", (request) => { if (request.url().includes("/api/regions/sc/organizations")) organizationRequests++; });
  await distance.goto("http://localhost:5173/region/sc?tab=help");
  await distance.getByText("Organização exemplo").waitFor();
  await distance.getByText("5.0 km").waitFor();
  await distance.getByText("Dados desatualizados.").waitFor();
  const requestsBeforePan = organizationRequests;
  const map = await distance.locator(".territorial-map").boundingBox();
  assert.ok(map, "Expected the state map");
  await distance.mouse.move(map.x + map.width / 2, map.y + map.height / 2);
  await distance.mouse.down();
  await distance.mouse.move(map.x + map.width / 2 + 70, map.y + map.height / 2 + 30, { steps: 8 });
  await distance.mouse.up();
  assert.equal(await distance.getByText("5.0 km").count(), 1);
  assert.equal(organizationRequests, requestsBeforePan, "Map movement must not refetch or change the distance reference");
  await distance.close();
  console.log("PASS: Help distinguishes unavailable/empty, leaves empty campaigns unexplained and keeps distance stable while panning");
} finally {
  await browser.close();
}
