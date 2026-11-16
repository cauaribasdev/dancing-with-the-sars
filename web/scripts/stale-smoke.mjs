// Run from repository root with Vite on 5173. All stale data below is synthetic.
import assert from "node:assert/strict";
import fs from "node:fs";
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");

const geo = JSON.parse(fs.readFileSync("server/data/regions.geojson", "utf8"));
const states = geo.features.filter((feature) => feature.properties.kind === "state");
for (const feature of states) {
  const points = feature.geometry.coordinates.flat(feature.geometry.type === "MultiPolygon" ? 2 : 1);
  feature.properties.bbox = [
    Math.min(...points.map((point) => point[0])), Math.min(...points.map((point) => point[1])),
    Math.max(...points.map((point) => point[0])), Math.max(...points.map((point) => point[1])),
  ];
}
const summary = { acquisitions: 4, distinctDates: 3, stacks: 2, firstDate: "2026-11-02", lastDate: "2026-11-14", medianGapDays: 6 };
const organization = states.find((feature) => feature.properties.id === "sc").properties;

const browser = await chromium.launch({
  headless: true,
  ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
  args: ["--no-sandbox", "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
});
try {
  async function mockApi(page) {
    let coverageRequests = 0;
    let postRequests = 0;
    await page.route("**/api/**", async (route) => {
      const url = new URL(route.request().url());
      if (!url.pathname.startsWith("/api/")) return route.continue();
      if (url.pathname === "/api/regions") return route.fulfill({ json: { regions: states.map((feature) => feature.properties) } });
      if (url.pathname === "/api/regions/geojson") return route.fulfill({ json: { ...geo, features: states } });
      if (url.pathname === "/api/stories") return route.fulfill({ json: { stories: [] } });
      if (url.pathname === "/api/coverage") {
        coverageRequests++;
        const start = url.searchParams.get("start") ?? "2026-11-01";
        const end = url.searchParams.get("end") ?? "2026-11-15";
        return route.fulfill({ json: {
          dataSource: "stale", query: { start, end, product: "GCOV" }, total: summary,
          states: states.map((feature) => ({ ...feature.properties, ...summary,
            acquisitions: feature.properties.id === "sc" ? 4 : 0,
            distinctDates: feature.properties.id === "sc" ? 3 : 0,
          })),
        } });
      }
      if (url.pathname === "/api/regions/sc/posts") {
        postRequests++;
        return route.fulfill({ json: {
          dataSource: "stale", region: organization, nextCursor: null,
          posts: [{ id: "post-stale-1", title: "Publicação preservada", text: "Conteúdo da última cópia salva.", date: "2026-11-14", link: { page: "story", storyId: "rs-flood-jul-2026" } }],
        } });
      }
      return route.fulfill({ status: 503, json: { error: { code: "upstream_unavailable", message: "Fixture indisponível" } } });
    });
    return { get coverageRequests() { return coverageRequests; }, get postRequests() { return postRequests; } };
  }

  const overview = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const overviewApi = await mockApi(overview);
  await overview.goto("http://localhost:5173/explore?region=sc&month=2026-11");
  const dataPanel = overview.getByRole("region", { name: "Dados do território" });
  await dataPanel.getByText(/última cópia salva/).waitFor();
  assert.equal(await dataPanel.locator("dd").first().innerText(), "4", "stale Overview data remains visible");
  await overview.waitForTimeout(400);
  const coverageBeforeRefresh = overviewApi.coverageRequests;
  const coverageRefresh = overview.waitForResponse((response) => response.url().includes("/api/coverage") && response.status() === 200);
  await overview.getByRole("button", { name: "Atualizar dados" }).click();
  await coverageRefresh;
  assert.equal(overviewApi.coverageRequests, coverageBeforeRefresh + 1, "stale Overview data has an explicit refresh action");
  assert.equal(await dataPanel.locator("dd").first().innerText(), "4", "refresh keeps the preserved coverage visible");
  await overview.close();

  const posts = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const postsApi = await mockApi(posts);
  await posts.goto("http://localhost:5173/region/sc?tab=posts");
  await posts.getByText("Publicação preservada").waitFor();
  await posts.getByText("Dados desatualizados.").waitFor();
  await posts.waitForTimeout(400);
  const postsBeforeRefresh = postsApi.postRequests;
  const postRefresh = posts.waitForResponse((response) => response.url().includes("/api/regions/sc/posts") && response.status() === 200);
  await posts.getByRole("button", { name: "Atualizar", exact: true }).click();
  await postRefresh;
  assert.equal(postsApi.postRequests, postsBeforeRefresh + 1, "stale Posts data has an explicit refresh action");
  await posts.getByText("Publicação preservada").waitFor();
  await posts.close();

  console.log("PASS: stale Overview and Posts retain their data and provide working refresh actions");
} finally {
  await browser.close();
}
