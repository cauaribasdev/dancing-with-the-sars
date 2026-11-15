import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router";
import { describeError } from "../../api/client";
import { clampMonth, listMonths, monthRange } from "../../api/dates";
import { useCoverage, useRegions, useRegionsGeoJSON, useStories, useStory } from "../../api/hooks";
import { ErrorMessage, StaleNotice } from "../../ui/feedback";
import { MapPageLayout, PageTitle } from "../../ui/MapPageLayout";
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

  const panel = (
    <div className="flex flex-col gap-7">
      <header className="flex flex-col gap-3">
        <PageTitle>{selectedRegion?.name ?? "Brasil"}</PageTitle>
        <p className="max-w-[36ch] text-[15px] leading-[1.55] text-ink-2">
          Observação territorial por radar NISAR. Cobertura de aquisições, não detecção automática de desastres.
        </p>
      </header>

      <MonthPicker
        months={months}
        value={month}
        period={period}
        onChange={(m) => update({ month: m })}
        loading={coverage.isFetching}
        lastDate={pending ? undefined : coverageData?.total.lastDate}
      />

      {coverage.isError && !coverageData ? (
        <ErrorMessage onRetry={() => coverage.refetch()}>{describeError(coverage.error)}</ErrorMessage>
      ) : null}
      <StaleNotice dataSource={coverageData?.dataSource} />

      <section className="flex flex-col gap-4" aria-labelledby="region-label">
        <RegionPicker
          regions={regions.data ?? []}
          value={selectedId}
          onChange={(region) => update({ region })}
          disabled={!regions.data}
        />
        {regions.isError ? <ErrorMessage onRetry={() => regions.refetch()}>{describeError(regions.error)}</ErrorMessage> : null}
        <details><summary>Explorar dados e Radar</summary><RegionSummary
          region={selectedRegion}
          regions={regions.data ?? []}
          coverage={coverageData}
          period={period}
          month={month}
          pending={pending}
          onSelect={(region) => update({ region })}
        /></details>
      </section>

      <PhenomenaNotice/>
      {story ? <details><summary>História em destaque</summary><StoryCard story={story} detail={storyDetail.data} /></details> : null}
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
