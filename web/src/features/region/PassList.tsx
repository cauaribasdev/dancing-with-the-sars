import { useMemo } from "react";
import type { IsoDate, Pass } from "../../api/types";
import { formatDateLong, formatDayShort, formatNumber } from "../../ui/format";
import { SectionTitle } from "../../ui/MapPageLayout";
import { directionLabel, stripLabel } from "./passText";
import { formatTimeUtc, groupByDay } from "./regionLogic";

/** Above this many passes (country or macro-region in a month) the list waits for a day, to stay responsive. */
export const LIST_LIMIT = 150;

interface Props {
  passes: Pass[];
  selectedDay: IsoDate | null;
  onSelectPass: (pass: Pass) => void;
  disabled: boolean;
}

/** Passes of the chosen day, or of the whole period when it is small enough. */
export function PassList({ passes, selectedDay, onSelectPass, disabled }: Props) {
  const shown = useMemo(
    () => (selectedDay ? passes.filter((p) => p.date === selectedDay) : passes),
    [passes, selectedDay],
  );
  const groups = useMemo(() => (shown.length <= LIST_LIMIT ? groupByDay(shown) : []), [shown]);

  return (
    <section className={`flex flex-col gap-3 ${disabled ? "opacity-40" : ""}`} aria-labelledby="passes-title">
      <SectionTitle id="passes-title">{selectedDay ? `Passes on ${formatDateLong(selectedDay)}` : "All passes"}</SectionTitle>
      {shown.length > LIST_LIMIT ? (
        <p className="text-[14px] leading-snug text-ink-2">
          There are {formatNumber(shown.length)} passes in this period, all outlined on the map. Pick a day above to list
          its passes, or click an outline on the map.
        </p>
      ) : (
        <>
          <p className="text-[13px] leading-snug text-ink-3">Pick a pass to see its radar image on the map.</p>
          {groups.map((g) => (
            <div key={g.date} className="flex flex-col">
              {selectedDay ? null : <h3 className="pb-1 text-[13px] font-[600] text-ink-2">{formatDayShort(g.date)}</h3>}
              <ul className="border-t border-rule">
                {g.passes.map((p) => (
                  <li key={p.id} className="border-b border-rule">
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => onSelectPass(p)}
                      className="flex w-full items-baseline gap-3 px-1 py-1.5 text-left transition-colors hover:bg-signal-wash"
                    >
                      <span className="num w-[76px] shrink-0 text-[14px] font-[600] text-ink">{formatTimeUtc(p.start)}</span>
                      <span className="text-[13px] text-ink-2">
                        {directionLabel(p.direction)}, {stripLabel(p.stackId)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </>
      )}
    </section>
  );
}
