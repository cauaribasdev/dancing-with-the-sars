import { Link } from "react-router";
import { daysInclusive, type MonthKey } from "../../api/dates";
import { regionName, regionNameInSentence } from "../../api/regionNames";
import type { CoverageResponse, CoverageSummary, DateWindow, Region, StateCoverage } from "../../api/types";
import { paths } from "../../app/paths";
import { formatDayRange, formatMonth, formatNumber, plural } from "../../ui/format";
import { coverageColor } from "./coverageScale";

interface Props {
  region: Region | undefined;
  regions: Region[];
  coverage: CoverageResponse | undefined;
  period: DateWindow;
  month: MonthKey;
  /** No data for the chosen month yet (loading, or still showing the previous month). */
  pending: boolean;
  onSelect: (regionId: string) => void;
}

function Facts({ s, period }: { s: CoverageSummary; period: DateWindow }) {
  const rows: [string, string][] = [
    ["Passes", formatNumber(s.acquisitions)],
    ["Different image strips", formatNumber(s.stacks)],
  ];
  if (s.firstDate && s.lastDate) rows.push(["First and last", formatDayRange(s.firstDate, s.lastDate)]);
  if (s.medianGapDays != null) rows.push(["Typical gap", plural(s.medianGapDays, "day", "days")]);
  rows.push(["Period checked", plural(daysInclusive(period), "day", "days")]);
  return (
    <dl className="grid grid-cols-[1fr_auto] gap-x-4 border-t border-rule text-[14px]">
      {rows.map(([k, v]) => (
        <div key={k} className="contents">
          <dt className="border-b border-rule py-1.5 text-ink-2">{k}</dt>
          <dd className="num border-b border-rule py-1.5 text-right font-[600] text-ink">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

function Swatch({ days }: { days: number }) {
  const color = coverageColor(days);
  return (
    <span
      aria-hidden
      className="inline-block size-3 shrink-0 rounded-[2px]"
      style={color ? { background: color } : { border: "1px dashed var(--color-ink-3)" }}
    />
  );
}

/** Summary of the selected region for the chosen month, with a link to its region page. */
export function RegionSummary({ region, regions, coverage, period, month, pending, onSelect }: Props) {
  if (!region) return null;
  const monthLabel = formatMonth(month);
  const name = regionNameInSentence(region);

  let summary: CoverageSummary | undefined;
  let children: StateCoverage[] = [];
  if (coverage && !pending) {
    if (region.kind === "country") {
      summary = coverage.total;
      children = coverage.states;
    } else if (region.kind === "state") {
      summary = coverage.states.find((s) => s.id === region.id);
    } else {
      children = coverage.states.filter((s) => s.parentId === region.id);
    }
  }
  const parent = region.parentId ? regions.find((r) => r.id === region.parentId) : undefined;
  const ranked = [...children].sort((a, b) => b.distinctDates - a.distinctDates || a.name.localeCompare(b.name, "pt-BR"));
  const shownChildren = region.kind === "country" ? ranked.slice(0, 5) : ranked;

  return (
    <div className="flex flex-col gap-4" aria-live="polite">
      <div>
        <h2 className="place text-[26px] leading-tight text-ink">{regionName(region)}</h2>
        {parent && parent.kind === "region" ? <p className="text-[13px] text-ink-3">Região {regionName(parent)}</p> : null}
        {region.kind === "region" ? <p className="text-[13px] text-ink-3">Macrorregião do Brasil</p> : null}
      </div>

      {pending ? (
        <p className="text-[15px] text-ink-3">Contando passagens em {monthLabel}…</p>
      ) : summary ? (
        <p className="text-[16px] leading-[1.5] text-ink">
          {summary.distinctDates > 0 ? (
            <>
              Em {monthLabel}, o radar passou sobre {name} em{" "}
              <strong className="num font-[700]">{plural(summary.distinctDates, "dia", "dias")}</strong>.
            </>
          ) : (
            <>O radar não passou sobre {name} em {monthLabel}.</>
          )}
        </p>
      ) : null}

      {!pending && summary ? <Facts s={summary} period={period} /> : null}

      {!pending && shownChildren.length ? (
        <div className="flex flex-col gap-1.5">
          <h3 className="text-[13px] font-medium text-ink-2">
            {region.kind === "country" ? "Estados com mais dias observados" : "Dias com passagem, por estado"}
          </h3>
          <ul className="border-t border-rule text-[14px]">
            {shownChildren.map((s) => (
              <li key={s.id} className="border-b border-rule">
                <button
                  type="button"
                  onClick={() => onSelect(s.id)}
                  className="flex w-full items-center gap-2.5 px-1 py-1.5 text-left hover:bg-signal-wash"
                >
                  <Swatch days={s.distinctDates} />
                  <span className="flex-1">{s.name}</span>
                  <span className="num font-[600]">{plural(s.distinctDates, "dia", "dias")}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <Link to={`${paths.region(region.id, period)}&tab=radar`} className="link self-start text-[15px]">
        Ver passagens de {region.name}
      </Link>
    </div>
  );
}
