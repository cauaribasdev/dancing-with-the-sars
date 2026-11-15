import { useCallback, useMemo } from "react";
import { Link, useSearchParams } from "react-router";
import { describeError } from "../../api/client";
import { clampMonth, listMonths, monthRange } from "../../api/dates";
import { useCoverage, useRegions, useRegionsGeoJSON, useStories, useStory } from "../../api/hooks";
import { ErrorMessage, StaleNotice } from "../../ui/feedback";
import { MapPageLayout } from "../../ui/MapPageLayout";
import { paths } from "../../app/paths";
import { CoverageMap } from "./CoverageMap";
import { MonthPicker } from "../../ui/MonthPicker";
import { RegionPicker } from "./RegionPicker";
import { RegionSummary } from "./RegionSummary";
import { PhenomenaNotice } from "../../ui/PhenomenaNotice";
import { StoryCard } from "./StoryCard";

/**
 * Overview: map of Brazil colored by the days NISAR passed over each state in the chosen month.
 * State lives in the URL (?month=YYYY-MM&region=<id>) so the demo can open straight on a month and state.
 */
export function OverviewPage() {
  const [params, setParams] = useSearchParams();
  // "Today" is fixed for the session; the current month runs up to today.
  const today = useMemo(() => new Date(), []);
  const months = useMemo(() => listMonths(today), [today]);
  const month = clampMonth(params.get("month"), months);
  const period = useMemo(() => monthRange(month, today), [month, today]);
  const selectedId = params.get("region") ?? "br";

  const regions = useRegions("state");
  const geo = useRegionsGeoJSON("state");
  const coverage = useCoverage(period);
  const stories = useStories();
  const story = stories.data?.[0];
  // Prefetch the featured story: it gives the marker position and makes the story page instant.
  const storyDetail = useStory(story?.id);

  const update = useCallback(
    (next: { month?: string; region?: string }) => {
      setParams(
        (prev) => {
          const p = new URLSearchParams(prev);
          if (next.month !== undefined) p.set("month", next.month);
          if (next.region !== undefined) {
            if (next.region === "br") p.delete("region");
            else p.set("region", next.region);
          }
          return p;
        },
        { replace: true },
      );
    },
    [setParams],
  );

  const selectedRegion = regions.data?.find((r) => r.id === selectedId);
  // While the new month loads, the previous month's data stays on screen, marked as pending.
  const pending = !coverage.data || coverage.isPlaceholderData;
  const coverageData = coverage.data;

  const selectedCoverage = pending ? undefined : selectedId === "br" ? coverageData?.total : coverageData?.states.find(s=>s.id===selectedId);
  const panel = (
    <div className="explorer-sidebar">
      <header className="explorer-intro"><span className="panel-eyebrow">EXPLORADOR TERRITORIAL</span><h1>Seu território, em foco</h1><p>Escolha um estado e um período para explorar as aquisições NISAR.</p></header>
      <section className="explorer-block" aria-label="Localização">
        <RegionPicker regions={regions.data ?? []} value={selectedId} onChange={region=>update({region})} disabled={!regions.data}/>
        {regions.isError && <ErrorMessage onRetry={()=>regions.refetch()}>{describeError(regions.error)}</ErrorMessage>}
      </section>
      <section className="explorer-block" aria-label="Período analisado"><h2>Período analisado</h2>
        <MonthPicker months={months} value={month} period={period} onChange={m=>update({month:m})} loading={coverage.isFetching} lastDate={pending ? undefined : selectedCoverage?.lastDate}/>
      </section>
      <section className="explorer-block explorer-data" aria-label="Dados do território">
        <div className="panel-heading"><h2>Dados do território</h2><span className="source-badge">NISAR</span></div>
        <p className="selected-territory">{selectedRegion?.name ?? "Brasil"}</p>
        <dl className="sidebar-metrics"><div><dt>Passagens</dt><dd>{selectedCoverage?.acquisitions ?? '—'}</dd></div><div><dt>Dias observados</dt><dd>{selectedCoverage?.distinctDates ?? '—'}</dd></div></dl>
        {pending && !coverage.isError && <p role="status">Consultando cobertura…</p>}
        {coverage.isError && !coverageData && <ErrorMessage onRetry={()=>coverage.refetch()}>{describeError(coverage.error)}</ErrorMessage>}
        <StaleNotice dataSource={coverageData?.dataSource}/>
        {selectedRegion ? <Link className="radar-action" to={`${paths.region(selectedRegion.id,period)}&tab=radar`}>Abrir Radar de {selectedRegion.code}<span aria-hidden>→</span></Link> : <p className="sidebar-hint">Selecione um estado para abrir o calendário de passagens.</p>}
        {selectedRegion && <details className="sidebar-disclosure"><summary>Detalhes da cobertura</summary><RegionSummary region={selectedRegion} regions={regions.data??[]} coverage={coverageData} period={period} month={month} pending={pending} onSelect={region=>update({region})}/></details>}
      </section>
      {story && <section className="explorer-block sidebar-story"><span className="panel-eyebrow">HISTÓRIA EM DESTAQUE</span><StoryCard story={story} detail={storyDetail.data}/></section>}
      <details className="sidebar-disclosure sidebar-sources"><summary>Sobre as fontes e camadas</summary><PhenomenaNotice/></details>
    </div>
  );

  return (
    <MapPageLayout
      panelLabel="Map controls"
      panel={panel}
      map={
        <div className="territory-stage"><div className="territory-heading"><h2>{selectedRegion?.name ?? "Brasil"}</h2><span>Cobertura radar · Limites IBGE</span></div><div className="territory-canvas"><CoverageMap
          geo={geo.data}
          geoError={geo.isError ? describeError(geo.error) : null}
          coverage={coverageData}
          coverageLoading={coverage.isFetching}
          coveragePending={pending}
          month={month}
          regions={regions.data ?? []}
          selectedId={selectedId}
          onSelect={(region) => update({ region })}
          story={story}
          storyPlace={storyDetail.data?.places[0]}
        /></div><div className="territory-stats"><span>Passagens <strong>{pending ? "—" : (selectedId === "br" ? coverageData?.total.acquisitions : coverageData?.states.find(s=>s.id===selectedId)?.acquisitions) ?? "—"}</strong></span><span>Período UTC <strong>{period.start} — {period.end}</strong></span><span>Fonte <strong>NISAR / ASF</strong></span></div></div>
      }
    />
  );
}
