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
import { orderComposition } from "./compositionOrder";
import { mergeImageSelection } from "./imageSelection";
import { resolvePeriod } from "./regionLogic";
import { useStackNeighbors } from "./useStackNeighbors";

/** Empty dates: the API applies its default period (the last 30 days). */
const API_DEFAULT_WINDOW: DateWindow = { start: "", end: "" };
/** First day of NISAR data over Brazil (see the root README). */
const FIRST_PASS_OVER_BRAZIL = "2025-10-30";
const NO_PASSES: Pass[] = [];

function kindLabel(region: Region, regions: Region[]): string | null {
  if (region.kind === "region") return "Macrorregião do Brasil";
  if (region.kind === "state") {
    const parent = regions.find((r) => r.id === region.parentId);
    return parent ? `Estado da região ${regionName(parent)}` : "Estado do Brasil";
  }
  return null;
}

function periodPhrase(month: MonthKey | null, window: DateWindow, isDefault: boolean): string {
  if (month) return `Em ${formatMonth(month)}`;
  if (isDefault) return `Nos últimos 30 dias (${formatDayRange(window.start, window.end)})`;
  return `De ${formatDateLong(window.start)} a ${formatDateLong(window.end)}`;
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

  const allowedImageIds = periodPasses.map(p=>p.id);
  const dayImageIds = periodPasses.filter(p=>p.date===selectedDay).map(p=>p.id);
  const compositeMode = params.get("images") === "selection" || params.get("images") === "day";
  const dailyPassIds = orderComposition(params.get("images") === "day" ? dayImageIds : params.getAll("image"), periodPasses);
  const showDayImages = !!selectedDay && dayImageIds.length > 0 && dayImageIds.every(id=>dailyPassIds.includes(id));
  const [dailyOpacity,setDailyOpacity] = useState(0.65);
  const image = useBrowseImage(compositeMode ? undefined : selectedPass?.id);
  const updateImages = (ids: string[]) => {
    const next = new URLSearchParams(params);
    next.set('images','selection');next.delete('image');
    mergeImageSelection([],ids,allowedImageIds).forEach(id=>next.append('image',id));
    setParams(next);
  };
  const neighbors = useStackNeighbors(regionId, selectedPass, periodPasses, window, today);
  const [focus, setFocus] = useState<{ bbox: BBox; n: number } | null>(null);

  const setSelection = useCallback(
    (next: { day: string | null; pass: string | null }) => {
      setParams(
        (prev) => {
          const p = new URLSearchParams(prev);
          // Legacy daily URLs become a fixed composition before changing the calendar filter.
          if(p.get('images')==='day') {
            p.set('images','selection');p.delete('image');
            periodPasses.filter(pass=>pass.date===p.get('day')).forEach(pass=>p.append('image',pass.id));
          }
          if (next.day) p.set("day", next.day);
          else p.delete("day");
          if (next.pass) p.set("pass", next.pass);
          else p.delete("pass");
          return p;
        },
        { replace: true },
      );
    },
    [setParams, periodPasses],
  );

  const selectPass = useCallback((p: Pass) => setSelection({ day: p.date, pass: p.id }), [setSelection]);
  const selectPassFromList = useCallback(
    (p: Pass) => {
      selectPass(p);
      setFocus((f) => ({ bbox: p.bbox, n: (f?.n ?? 0) + 1 }));
    },
    [selectPass],
  );

  const changeMonth = (m: MonthKey) => setParams(new URLSearchParams({ ...monthRange(m, today), tab: "radar" }));

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
          customLabel={period.kind === "default" ? "Últimos 30 dias" : formatDayRange(window.start, window.end)}
          period={window}
          onChange={changeMonth}
          loading={passes.isFetching && (!data || pending)}
          lastDate={current ? current.summary.lastDate : undefined}
        />
        <StaleNotice
          dataSource={data?.dataSource}
          onRetry={() => void Promise.all([passes.refetch(), footprints.refetch()])}
          isUpdating={passes.isFetching || footprints.isFetching}
        />
        {error ? <PeriodError error={error} region={region} onRetry={() => (passes.isError ? passes.refetch() : footprints.refetch())} /> : null}
        {!data && !error && region?.kind === "country" ? (
          <p className="text-[13px] leading-snug text-ink-3">O Brasil tem cerca de mil passagens por mês, então o mapa precisa desenhar muitos contornos.</p>
        ) : null}
        {summary && region ? (
          summary.acquisitions > 0 ? (
            <p className="text-[15px] leading-[1.55] text-ink">
              {periodPhrase(period.month, window, period.kind === "default")}, o radar passou sobre {regionNameInSentence(region)} em{" "}
              {plural(summary.distinctDates, "dia", "dias")}, com {plural(summary.acquisitions, "passagem", "passagens")} ao todo.
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
            <PassList passes={periodPasses} selectedDay={selectedDay} onSelectPass={selectPassFromList} disabled={pending} selectedImageIds={dailyPassIds} onToggleImage={pass=>updateImages(dailyPassIds.includes(pass.id)?dailyPassIds.filter(id=>id!==pass.id):[...dailyPassIds,pass.id])} />
          </>
        ) : null}
      </>
    );
  }

  const panel = (
    <div ref={topRef} className="flex scroll-mt-6 flex-col gap-6">
      <header className="flex flex-col gap-2">
        <Link to={paths.overview({ region: regionId, month: period.month ?? undefined })} className="link self-start text-[13px]">
          Voltar ao mapa de {region?.name ?? regionId.toUpperCase()}
        </Link>
        <PageTitle>{name}</PageTitle>
        {region ? <p className="text-[13px] text-ink-3">{kindLabel(region, regions.data ?? [])}</p> : null}
        {regions.data && !region ? <p className="text-ink-2">Esta região não existe. Volte ao mapa e escolha outra.</p> : null}
      </header>
      <section className="daily-controls" aria-label="Composição de imagens">
        <h2>Imagens de múltiplas datas</h2>
        <p>Esta composição reúne aquisições em momentos diferentes, não uma observação simultânea do estado.</p>
        <label><input type="checkbox" checked={showDayImages} disabled={!dayImageIds.length || pending} onChange={e=>{
          const enabled=e.currentTarget.checked;
          updateImages(enabled ? mergeImageSelection(dailyPassIds,dayImageIds,allowedImageIds) : dailyPassIds.filter(id=>!dayImageIds.includes(id)));
          if(enabled && region)setFocus(f=>({bbox:region.bbox,n:(f?.n??0)+1}));
        }}/> Exibir todas as passagens do dia</label>
        {!selectedDay && <p>Selecione um dia no calendário para combinar suas imagens.</p>}
        <p>Trocar o dia filtra a lista sem remover as imagens já escolhidas. Combine datas para ampliar a área observada; cobertura completa depende das imagens disponíveis.</p>
        <button type="button" disabled={pending || !periodPasses.length} onClick={()=>{updateImages(allowedImageIds);if(region)setFocus(f=>({bbox:region.bbox,n:(f?.n??0)+1}));}}>Adicionar todas do período ({periodPasses.length})</button>
        {dailyPassIds.length > 0 && <button type="button" onClick={()=>updateImages([])}>Limpar imagens</button>}
        {selectedPass && <button type="button" disabled={pending} onClick={()=>updateImages(dailyPassIds.includes(selectedPass.id)?dailyPassIds.filter(id=>id!==selectedPass.id):[...dailyPassIds,selectedPass.id])}>{dailyPassIds.includes(selectedPass.id)?'Remover esta passagem da composição':'Adicionar esta passagem à composição'}</button>}
        {dailyPassIds.length > 0 && <details open><summary>{dailyPassIds.length} imagens na composição</summary><p>Ordem de desenho: da mais antiga à mais recente. As mais recentes ficam sobre as anteriores quando disponíveis.</p><ol>{dailyPassIds.map((id,index)=>{const pass=passesById.get(id);return <li key={id}><span>{index+1}. {pass?.date} · {pass?.start.slice(11,16)} UTC<small className="block break-all text-ink-3">{id}</small></span><button type="button" aria-label={`Remover imagem ${id}`} onClick={()=>updateImages(dailyPassIds.filter(selected=>selected!==id))}>Remover</button></li>;})}</ol></details>}
        {compositeMode && <><p>{dailyPassIds.length} passagens selecionadas. Áreas sobrepostas são combinadas por transparência; não representam detecção de mudança.</p><label>Opacidade das imagens: {Math.round(dailyOpacity*100)}%<input type="range" min="0.1" max="1" step="0.05" value={dailyOpacity} onChange={e=>setDailyOpacity(Number(e.target.value))}/></label></>}
      </section>
      {body}
    </div>
  );

  return (
    <MapPageLayout
      panelLabel="Radar estadual"
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
          dailyPassIds={dailyPassIds}
          dailyOpacity={dailyOpacity}
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
          Ver os últimos 30 dias
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
        {periodPhrase(month, window, false)}, o radar não passou sobre {regionNameInSentence(region)}.
      </p>
      {beforeData ? (
        <p className="text-ink-2">Os dados do NISAR sobre o Brasil começam em {formatDateLong(FIRST_PASS_OVER_BRAZIL)}. Escolha um mês posterior.</p>
      ) : (
        <p className="text-ink-2">
          Tente {other ? (
            <button type="button" className="link" onClick={() => onMonth(other)}>
              {formatMonth(other)}
            </button>
          ) : (
            "outro mês"
          )}
          {canWiden ? (
            <>
              {" "}ou uma área maior,{" "}
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
