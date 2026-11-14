// Region page: when the radar passed over a state, macro-region or Brazil, what it saw, and what can be compared.
// URL: /region/:regionId?start=YYYY-MM-DD&end=YYYY-MM-DD[&day=YYYY-MM-DD][&pass=<id>]
// Without start/end the API default applies (the last 30 days).
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router";
import { ApiError, describeError } from "../../api/client";
import { daysInclusive, isIsoDate, listMonths, monthRange, type MonthKey } from "../../api/dates";
import { useRegionFootprints, useRegionPasses, useRegions, useRegionsGeoJSON } from "../../api/hooks";
import { regionName, regionNameInSentence } from "../../api/regionNames";
import type { BBox, DateWindow, Pass, Region } from "../../api/types";
import { paths } from "../../app/paths";
import { useBrowseImage } from "../../map/BrowseImageLayer";
import { ErrorMessage, StaleNotice } from "../../ui/feedback";
import { formatDateLong, formatDayRange, formatMonth, plural } from "../../ui/format";
import { MapPageLayout, PageTitle } from "../../ui/MapPageLayout";
import { MonthPicker } from "../../ui/MonthPicker";
import { DayCalendar } from "./DayCalendar";
import { PassDetails } from "./PassDetails";
import { PassList } from "./PassList";
import { RegionMap } from "./RegionMap";
import { resolvePeriod } from "./regionLogic";
import { useStackNeighbors } from "./useStackNeighbors";

/** Empty dates: the API applies its default period (the last 30 days). */
const API_DEFAULT_WINDOW: DateWindow = { start: "", end: "" };
/** First day of NISAR data over Brazil (see the root README). */
const FIRST_PASS_OVER_BRAZIL = "2025-10-30";
const NO_PASSES: Pass[] = [];

function kindLabel(region: Region, regions: Region[]): string | null {
  if (region.kind === "region") return "Macro-region of Brazil";
  if (region.kind === "state") {
    const parent = regions.find((r) => r.id === region.parentId);
    return parent ? `State in the ${regionName(parent)} region` : "State of Brazil";
  }
  return null;
}

function periodPhrase(month: MonthKey | null, window: DateWindow, isDefault: boolean): string {
  if (month) return `In ${formatMonth(month)}`;
  if (isDefault) return `In the last 30 days (${formatDayRange(window.start, window.end)})`;
  return `From ${formatDateLong(window.start)} to ${formatDateLong(window.end)}`;
}

export function RegionPage() {
  const { regionId = "" } = useParams();
  const [params, setParams] = useSearchParams();
  const today = useMemo(() => new Date(), []);
  const months = useMemo(() => listMonths(today), [today]);
  const startParam = params.get("start");
  const endParam = params.get("end");
  const period = useMemo(() => resolvePeriod(startParam, endParam, today), [startParam, endParam, today]);
  const requestWindow = period.kind === "default" ? API_DEFAULT_WINDOW : period.window;

  const regions = useRegions();
  const region = regions.data?.find((r) => r.id === regionId);
  const passes = useRegionPasses(regionId, requestWindow);
  const footprints = useRegionFootprints(regionId, requestWindow);
  const outlines = useRegionsGeoJSON(region?.kind ?? "state");
  const outline = useMemo(() => outlines.data?.features.find((f) => f.properties.id === regionId), [outlines.data, regionId]);

  // Data for this period (placeholder data belongs to the previous one and is shown dimmed).
  const pending = passes.isPlaceholderData || footprints.isPlaceholderData;
  const data = passes.data;
  const current = pending ? undefined : data;
  const queryStart = current?.query.start;
  const queryEnd = current?.query.end;
  const window = useMemo<DateWindow>(
    () => (queryStart && queryEnd ? { start: queryStart, end: queryEnd } : period.window),
    [queryStart, queryEnd, period.window],
  );
  const periodPasses = current?.passes ?? NO_PASSES;
  const passesById = useMemo(() => new Map((data?.passes ?? []).map((p) => [p.id, p])), [data]);

  const dayParam = params.get("day");
  const selectedDay = isIsoDate(dayParam) ? dayParam : null;
  const passParam = params.get("pass");
  const selectedPass = passParam && current ? passesById.get(passParam) : undefined;

  const image = useBrowseImage(selectedPass?.id);
  const neighbors = useStackNeighbors(regionId, selectedPass, periodPasses, window, today);
  const [focus, setFocus] = useState<{ bbox: BBox; n: number } | null>(null);

  const setSelection = useCallback(
    (next: { day: string | null; pass: string | null }) => {
      setParams(
        (prev) => {
          const p = new URLSearchParams(prev);
          if (next.day) p.set("day", next.day);
          else p.delete("day");
          if (next.pass) p.set("pass", next.pass);
          else p.delete("pass");
          return p;
        },
        { replace: true },
      );
    },
    [setParams],
  );

  const selectPass = useCallback((p: Pass) => setSelection({ day: p.date, pass: p.id }), [setSelection]);
  const selectPassFromList = useCallback(
    (p: Pass) => {
      selectPass(p);
      setFocus((f) => ({ bbox: p.bbox, n: (f?.n ?? 0) + 1 }));
    },
    [selectPass],
  );

  const changeMonth = (m: MonthKey) => setParams(new URLSearchParams({ ...monthRange(m, today) }));

  // The panel switches between browsing and pass details: bring its top into view.
  const topRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    topRef.current?.scrollIntoView({ block: "nearest" });
  }, [selectedPass?.id]);

  const name = region ? regionName(region) : regionId;
  const error = passes.isError && !data ? passes.error : footprints.isError && !footprints.data ? footprints.error : null;
  const summary = current?.summary;

  const missingRegion = !!regions.data && !region;
  let body;
  if (missingRegion) {
    body = null;
  } else if (selectedPass) {
    body = (
      <PassDetails
        pass={selectedPass}
        previous={neighbors.previous}
        next={neighbors.next}
        onBack={() => setSelection({ day: selectedPass.date, pass: null })}
      />
    );
  } else {
    body = (
      <>
        <MonthPicker
          months={months}
          value={period.month}
          customLabel={period.kind === "default" ? "Last 30 days" : formatDayRange(window.start, window.end)}
          period={window}
          onChange={changeMonth}
          loading={passes.isFetching && (!data || pending)}
          lastDate={current ? current.summary.lastDate : undefined}
        />
        <StaleNotice dataSource={data?.dataSource} />
        {error ? <PeriodError error={error} region={region} onRetry={() => (passes.isError ? passes.refetch() : footprints.refetch())} /> : null}
        {!data && !error && region?.kind === "country" ? (
          <p className="text-[13px] leading-snug text-ink-3">All of Brazil has about a thousand passes a month, so the map has a lot to draw.</p>
        ) : null}
        {summary && region ? (
          summary.acquisitions > 0 ? (
            <p className="text-[15px] leading-[1.55] text-ink">
              {periodPhrase(period.month, window, period.kind === "default")}, the radar passed over {regionNameInSentence(region)} on{" "}
              {plural(summary.distinctDates, "day", "days")}, with {plural(summary.acquisitions, "pass", "passes")} in all.
            </p>
          ) : (
            <EmptyPeriod region={region} regions={regions.data ?? []} window={window} month={period.month} onMonth={changeMonth} months={months} />
          )
        ) : null}
        {data && summary?.acquisitions !== 0 ? (
          <>
            <DayCalendar
              window={pending ? period.window : window}
              timeline={pending ? [] : data.timeline}
              selectedDay={selectedDay}
              onSelectDay={(day) => setSelection({ day, pass: null })}
              disabled={pending}
            />
            <PassList passes={periodPasses} selectedDay={selectedDay} onSelectPass={selectPassFromList} disabled={pending} />
          </>
        ) : null}
      </>
    );
  }

  const panel = (
    <div ref={topRef} className="flex scroll-mt-6 flex-col gap-6">
      <header className="flex flex-col gap-2">
        <Link to={paths.overview({ region: regionId, month: period.month ?? undefined })} className="link self-start text-[13px]">
          Back to the map of Brazil
        </Link>
        <PageTitle>{name}</PageTitle>
        {region ? <p className="text-[13px] text-ink-3">{kindLabel(region, regions.data ?? [])}</p> : null}
        {regions.data && !region ? <p className="text-ink-2">This region does not exist. Go back to the map and pick one.</p> : null}
      </header>
      {body}
    </div>
  );

  return (
    <MapPageLayout
      panelLabel="Region"
      panel={panel}
      map={
        <RegionMap
          region={region}
          outline={outline}
          footprints={footprints.data}
          passesById={passesById}
          selectedDay={selectedDay}
          selectedPassId={selectedPass?.id ?? null}
          pending={pending}
          loading={passes.isFetching || footprints.isFetching}
          image={image}
          onSelectPass={selectPass}
          focus={focus}
        />
      }
    />
  );
}

function PeriodError({ error, region, onRetry }: { error: unknown; region: Region | undefined; onRetry: () => void }) {
  const tooLong = error instanceof ApiError && error.code === "window_too_large";
  return (
    <div className="flex flex-col gap-2">
      <ErrorMessage onRetry={tooLong ? undefined : onRetry}>
        {/* The API's own message names the limit for this kind of region. */}
        {tooLong ? error.message : describeError(error)}
      </ErrorMessage>
      {tooLong && region ? (
        <Link to={paths.region(region.id)} className="link self-start text-[14px]">
          See the last 30 days instead
        </Link>
      ) : null}
    </div>
  );
}

function EmptyPeriod({
  region,
  regions,
  window,
  month,
  months,
  onMonth,
}: {
  region: Region;
  regions: Region[];
  window: DateWindow;
  month: MonthKey | null;
  months: MonthKey[];
  onMonth: (m: MonthKey) => void;
}) {
  const parent = region.parentId ? regions.find((r) => r.id === region.parentId) : undefined;
  const beforeData = window.end < FIRST_PASS_OVER_BRAZIL;
  const i = month ? months.indexOf(month) : -1;
  const other = i > 0 ? months[i - 1] : i >= 0 && i < months.length - 1 ? months[i + 1] : undefined;
  // The parent's limit is never smaller than a month (country: 31 days).
  const canWiden = parent && daysInclusive(window) <= 31;
  return (
    <div className="flex flex-col gap-2 text-[15px] leading-[1.55]">
      <p className="text-ink">
        {periodPhrase(month, window, false)}, the radar did not pass over {regionNameInSentence(region)}.
      </p>
      {beforeData ? (
        <p className="text-ink-2">NISAR data over Brazil starts on {formatDateLong(FIRST_PASS_OVER_BRAZIL)}. Pick a later month.</p>
      ) : (
        <p className="text-ink-2">
          Try {other ? (
            <button type="button" className="link" onClick={() => onMonth(other)}>
              {formatMonth(other)}
            </button>
          ) : (
            "another month"
          )}
          {canWiden ? (
            <>
              {" "}or a larger area,{" "}
              <Link to={paths.region(parent.id, window)} className="link">
                {regionNameInSentence(parent)}
              </Link>
            </>
          ) : null}
          .
        </p>
      )}
    </div>
  );
}
