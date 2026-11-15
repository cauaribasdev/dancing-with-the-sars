import { useMemo } from "react";
import type { DateWindow, IsoDate, TimelineDay } from "../../api/types";
import { formatDateLong, formatDayShort, plural } from "../../ui/format";
import { SectionTitle } from "../../ui/MapPageLayout";
import { buildCalendar } from "./regionLogic";

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

interface Props {
  window: DateWindow;
  timeline: TimelineDay[];
  selectedDay: IsoDate | null;
  onSelectDay: (day: IsoDate | null) => void;
  /** Data on screen belongs to the previous period while the new one loads. */
  disabled: boolean;
}

/** Timeline as a calendar: each day with a pass is a button showing how many passes it had. */
export function DayCalendar({ window, timeline, selectedDay, onSelectDay, disabled }: Props) {
  const weeks = useMemo(() => buildCalendar(window, timeline), [window, timeline]);

  return (
    <section className="flex flex-col gap-2" aria-labelledby="days-title">
      <div className="flex items-baseline justify-between gap-3">
        <SectionTitle id="days-title">Dias com passagem</SectionTitle>
        {selectedDay ? (
          <button type="button" className="link text-[13px]" onClick={() => onSelectDay(null)}>
            Mostrar todos os dias
          </button>
        ) : null}
      </div>
      <p className="text-[13px] leading-snug text-ink-3">
        O número indica quantas passagens ocorreram no dia. Selecione uma data para ver essas passagens.
      </p>
      <div className={`grid grid-cols-7 gap-1 ${disabled ? "opacity-40" : ""}`} aria-busy={disabled || undefined}>
        {WEEKDAYS.map((d) => (
          <div key={d} aria-hidden className="pb-0.5 text-center text-[11px] text-ink-3">
            {d}
          </div>
        ))}
        {weeks.flat().map((cell, i) => {
          if (!cell) return <div key={`pad-${i}`} aria-hidden />;
          // The month name appears on the first day of the period and of each month.
          const label = cell.day === 1 || cell.date === window.start ? formatDayShort(cell.date) : String(cell.day);
          if (cell.passes === 0) {
            return (
              <div key={cell.date} className="num flex h-11 flex-col px-1 pt-0.5 text-[11px] text-ink-3" title={`${formatDateLong(cell.date)}: sem passagem`}>
                {label}
              </div>
            );
          }
          const selected = cell.date === selectedDay;
          return (
            <button
              key={cell.date}
              type="button"
              disabled={disabled}
              aria-pressed={selected}
              aria-label={`${formatDateLong(cell.date)}: ${plural(cell.passes, "passagem", "passagens")}`}
              onClick={() => onSelectDay(selected ? null : cell.date)}
              className={`num flex h-11 flex-col rounded-[3px] border px-1 pt-0.5 text-left transition-colors ${
                selected ? "border-ink bg-signal-wash" : "border-rule bg-sheet hover:border-rule-strong"
              }`}
            >
              <span className="text-[11px] leading-tight text-ink-2">{label}</span>
              <span className="text-[15px] font-[650] leading-tight text-ink">{cell.passes}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
