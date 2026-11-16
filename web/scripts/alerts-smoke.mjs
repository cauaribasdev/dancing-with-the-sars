// Run from the repository root with Vite on port 5173. All API responses are synthetic fixtures.
import assert from "node:assert/strict";
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");

const browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, timezoneId: "America/Sao_Paulo" });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const regions = [
    { id: "rs", kind: "state", code: "RS", name: "Rio Grande do Sul", ibgeCode: 43, parentId: "sul", bbox: [-57, -34, -49, -27] },
    { id: "sc", kind: "state", code: "SC", name: "Santa Catarina", ibgeCode: 42, parentId: "sul", bbox: [-54, -30, -48, -25] },
  ];
  const active = {
    id: "a1", sent: "2026-11-15T10:00:00.000Z", event: "Chuva", severity: "severe", color: "#ff0000",
    onset: "2026-11-15T02:30:00.000Z", expires: "2026-11-15T12:01:00.000Z", headline: "Alerta ativo de chuva",
    description: `Descrição oficial. ${Array.from({ length: 30 }, (_, index) => `Orientação ${index + 1} para proteção local.`).join(" ")}`,
    instruction: "Procure abrigo.", url: "https://avisos.inmet.gov.br/a1",
    municipalities: [{ code: "4314902", name: "Porto Alegre" }], municipalityCountTotal: 1, geometry: null, status: "active",
  };
  const expired = {
    ...active, id: "a2", headline: "Alerta encerrado de vento", severity: "moderate",
    expires: "2026-11-12T12:00:00.000Z", status: "expired",
  };
  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    if (!url.pathname.startsWith("/api/")) return route.continue();
    if (url.pathname === "/api/regions") return route.fulfill({ json: { regions } });
    if (["/api/regions/br/alerts", "/api/regions/rs/alerts"].includes(url.pathname)) {
      if (url.pathname.endsWith("/br/alerts") && url.searchParams.get("include") === "history") {
        return route.fulfill({ json: {
          dataSource: "cache", region: { id: "br", kind: "country", code: "BR", name: "Brasil" }, updatedAt: "2026-11-15T12:00:00.000Z",
          summary: { active: 1, highestSeverity: "severe" }, alerts: [],
        } });
      }
      return route.fulfill({ json: {
        dataSource: url.pathname.endsWith("/rs/alerts") ? "stale" : "cache", region: regions[0], updatedAt: "2026-11-15T12:00:00.000Z",
        summary: { active: 1, highestSeverity: "severe" }, alerts: [active, expired],
      } });
    }
    if (url.pathname === "/api/regions/sc/alerts") return route.fulfill({ json: {
      dataSource: "cache", region: regions[1], updatedAt: "2026-11-15T12:00:00.000Z",
      summary: { active: 0, highestSeverity: null }, alerts: [],
    } });
    return route.fulfill({ status: 503, json: { error: { code: "upstream_unavailable", message: "Fixture indisponível" } } });
  });
  await page.clock.install({ time: new Date("2026-11-15T12:00:00.000Z") });
  await page.goto("http://localhost:5173/");
  await page.keyboard.press("Tab");
  assert.equal(await page.evaluate(() => document.activeElement?.textContent?.trim()), "Pular para o conteúdo");
  for (let i = 0; i < 4; i++) await page.keyboard.press("Tab");
  assert.equal(await page.evaluate(() => document.activeElement?.getAttribute("href")), "/alerts");
  await page.keyboard.press("Enter");
  await page.waitForURL("**/alerts");
  await page.getByRole("heading", { name: "Alertas meteorológicos" }).waitFor();
  await page.getByText("Alerta ativo de chuva").waitFor();
  await page.getByText("Alerta encerrado de vento").waitFor();
  await page.getByText(/consulta completa não trouxe os alertas ativos/i).waitFor();
  const onset = page.locator('time[datetime="2026-11-15T02:30:00.000Z"]').first();
  await onset.waitFor();
  assert.match(await onset.innerText(), /15\/11\/2026, 02:30 UTC/, "CAP timestamps must stay on the UTC date across the local midnight");
  await page.getByText("Detalhes e orientações").first().focus();
  await page.keyboard.press("Enter");
  await page.getByText("Descrição oficial.").first().waitFor();

  // The page reclassifies the alert at expiration without another API request.
  await page.clock.fastForward(60_000);
  await page.getByText("Nenhum alerta ativo foi retornado para Brasil.").waitFor();
  await page.getByText("Alerta ativo de chuva").waitFor();
  await page.getByText("Detalhes e orientações").last().focus();
  await page.keyboard.press("Enter");
  await page.getByText("Descrição oficial.").last().waitFor();
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    await page.evaluate(() => document.fonts.ready);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `No horizontal overflow at ${width}px with expanded official text`);
    const nav = page.getByRole("navigation", { name: "Navegação principal" });
    for (const label of ["Início", "Mapa", "Alertas"]) await nav.getByRole("link", { name: label }).waitFor({ state: "visible" });
  }
  await page.setViewportSize({ width: 1280, height: 900 });

  await page.getByLabel("Filtrar alertas por estado").selectOption("rs");
  await page.waitForURL("**/alerts?region=rs");
  await page.waitForTimeout(1_000);
  assert.equal(await page.getByRole("combobox", { name: "Filtrar alertas por estado" }).inputValue(), "rs");
  await page.getByText("O catálogo do INMET não respondeu agora.").waitFor();
  await page.getByLabel("Filtrar alertas por estado").selectOption("sc");
  await page.waitForURL("**/alerts?region=sc");
  await page.getByText("Nenhum alerta ativo foi retornado para Santa Catarina.").waitFor();
  await page.getByText("Ainda não há alertas encerrados neste período.").waitFor();
  assert.equal(await page.getByText("Alerta ativo de chuva").count(), 0, "Alertas da UF anterior must not remain visible");
  await page.setViewportSize({ width: 320, height: 844 });
  await page.evaluate(() => document.fonts.ready);
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "No horizontal overflow at 320px");
  assert.deepEqual(errors, []);

  const radar = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  let alertRequests = 0;
  await radar.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    if (!url.pathname.startsWith("/api/")) return route.continue();
    if (url.pathname === "/api/regions") return route.fulfill({ json: { regions } });
    if (url.pathname === "/api/regions/geojson") return route.fulfill({ json: { type: "FeatureCollection", features: [] } });
    if (url.pathname === "/api/regions/rs/alerts") {
      alertRequests++;
      return route.fulfill({ status: 503, json: { error: { code: "upstream_unavailable", message: "fixture" } } });
    }
    if (url.pathname === "/api/regions/rs/passes") return route.fulfill({ json: {
      dataSource: "cache", region: regions[0], query: { start: "2026-10-17", end: "2026-11-15", product: "GCOV" },
      summary: { acquisitions: 0, distinctDates: 0, stacks: 0, firstDate: null, lastDate: null, medianGapDays: null }, timeline: [], passes: [],
    } });
    if (url.pathname === "/api/regions/rs/footprints") return route.fulfill({ json: { type: "FeatureCollection", features: [] } });
    if (url.pathname === "/api/regions/rs/pairs") return route.fulfill({ json: {
      dataSource: "cache", region: regions[0], query: { start: "2026-10-17", end: "2026-11-15", product: "GCOV" }, count: 0, pairs: [],
    } });
    if (url.pathname === "/api/stories") return route.fulfill({ json: { stories: [] } });
    return route.fulfill({ status: 503, json: { error: { code: "upstream_unavailable", message: "fixture" } } });
  });
  await radar.goto("http://localhost:5173/region/rs?tab=alerts");
  await radar.getByRole("alert").waitFor();
  const requestsBeforeRetry = alertRequests;
  const retry = radar.waitForResponse((response) => response.url().includes("/api/regions/rs/alerts") && response.status() === 503);
  await radar.getByRole("button", { name: "Tentar novamente" }).click();
  await retry;
  assert.equal(alertRequests, requestsBeforeRetry + 1, "Retry should re-request only the unavailable alerts feed");
  await radar.getByRole("navigation", { name: "Seções do estado" }).getByRole("link", { name: /Radar/ }).click();
  await radar.waitForURL((url) => url.pathname === "/region/rs" && url.searchParams.get("tab") === "radar");
  await radar.getByRole("heading", { name: "Rio Grande do Sul" }).waitFor();
  await radar.close();

  const race = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  let requestRsStarted;
  let releaseRs;
  let rsResponseAttempted;
  let rsResponseDelivered = false;
  const rsStarted = new Promise((resolve) => { requestRsStarted = resolve; });
  const rsGate = new Promise((resolve) => { releaseRs = resolve; });
  const rsAttempted = new Promise((resolve) => { rsResponseAttempted = resolve; });
  await race.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    if (!url.pathname.startsWith("/api/")) return route.continue();
    if (url.pathname === "/api/regions") return route.fulfill({ json: { regions } });
    if (url.pathname === "/api/regions/rs/alerts") {
      requestRsStarted();
      await rsGate;
      try {
        await route.fulfill({ json: {
          dataSource: "cache", region: regions[0], updatedAt: "2026-11-15T12:00:00.000Z",
          summary: { active: 1, highestSeverity: "severe" }, alerts: [{ ...active, headline: "Resposta atrasada de RS" }],
        } });
        rsResponseDelivered = true;
      } catch { /* Query cancellation can abort the obsolete request before the delayed response is delivered. */ }
      finally { rsResponseAttempted(); }
      return;
    }
    if (url.pathname === "/api/regions/sc/alerts") return route.fulfill({ json: {
      dataSource: "cache", region: regions[1], updatedAt: "2026-11-15T12:00:00.000Z",
      summary: { active: 0, highestSeverity: null }, alerts: [],
    } });
    return route.fulfill({ status: 503, json: { error: { code: "upstream_unavailable", message: "fixture" } } });
  });
  await race.goto("http://localhost:5173/alerts?region=rs");
  await rsStarted;
  await race.getByLabel("Filtrar alertas por estado").selectOption("sc");
  await race.waitForURL("**/alerts?region=sc");
  await race.getByText("Nenhum alerta ativo foi retornado para Santa Catarina.").waitFor();
  releaseRs();
  await rsAttempted;
  assert.equal(rsResponseDelivered, true, "The delayed RS response must be released after the SC response");
  await race.waitForTimeout(250);
  assert.equal(await race.getByText("Resposta atrasada de RS").count(), 0, "A late response from the previous state must not replace current data");
  assert.equal(await race.getByRole("combobox", { name: "Filtrar alertas por estado" }).inputValue(), "sc");
  await race.close();
  console.log("PASS: keyboard navigation, active/history/empty/stale states, UTC, expiry, retries, state races and 320px layout");
} finally {
  await browser.close();
}
