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
        <PageTitle>Where the radar passed</PageTitle>
        <p className="max-w-[36ch] text-[15px] leading-[1.55] text-ink-2">
          NISAR, a radar satellite from NASA and ISRO, sees the ground through clouds, day and night. Pick a month to see
          on how many days it passed over each state.
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
        <RegionSummary
          region={selectedRegion}
          regions={regions.data ?? []}
          coverage={coverageData}
          period={period}
          month={month}
          pending={pending}
          onSelect={(region) => update({ region })}
        />
      </section>

      {story ? <StoryCard story={story} detail={storyDetail.data} /> : null}
    </div>
  );

  return (
    <MapPageLayout
      panelLabel="Map controls"
      panel={panel}
      map={
        <CoverageMap
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
        />
      }
    />
  );
}
