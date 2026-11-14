import { useId } from "react";
import type { MonthKey } from "../../api/dates";
import type { DateWindow, IsoDate } from "../../api/types";
import { ProgressBar } from "../../ui/feedback";
import { formatDayRange, formatDayShort, formatMonth } from "../../ui/format";

interface Props {
  months: MonthKey[];
  value: MonthKey;
  period: DateWindow;
  onChange: (month: MonthKey) => void;
  loading: boolean;
  /** Last pass in the period: null if there was none, undefined while there is no data yet. */
  lastDate: IsoDate | null | undefined;
}

function Chevron({ dir }: { dir: "left" | "right" }) {
  return (
    <svg aria-hidden viewBox="0 0 16 16" className="size-4">
      <path
        d={dir === "left" ? "M10 3 5 8l5 5" : "M6 3l5 5-5 5"}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const stepBtn =
  "grid size-10 place-items-center rounded-[4px] border border-rule bg-sheet text-ink transition-colors hover:border-rule-strong disabled:cursor-not-allowed disabled:text-rule-strong disabled:hover:border-rule";

/** Month picker: previous / list / next. From October 2025 (first data) to the current month. */
export function MonthPicker({ months, value, period, onChange, loading, lastDate }: Props) {
  const id = useId();
  const i = months.indexOf(value);
  const prev = i > 0 ? months[i - 1] : undefined;
  const next = i < months.length - 1 ? months[i + 1] : undefined;
  const isCurrent = i === months.length - 1;

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-[13px] font-medium text-ink-2">
        Month
      </label>
      <div className="flex items-stretch gap-1.5">
        <button
          type="button"
          className={stepBtn}
          onClick={() => prev && onChange(prev)}
          disabled={!prev}
          aria-label={prev ? `Previous month: ${formatMonth(prev)}` : "No earlier month with data"}
        >
          <Chevron dir="left" />
        </button>
        <div className="relative min-w-0 flex-1">
          <select
            id={id}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="h-10 w-full cursor-pointer appearance-none rounded-[4px] border border-rule bg-sheet pl-3 pr-9 text-[15px] font-[600] text-ink hover:border-rule-strong"
          >
            {[...months].reverse().map((m) => (
              <option key={m} value={m}>
                {formatMonth(m)}
              </option>
            ))}
          </select>
          <svg aria-hidden viewBox="0 0 16 16" className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-ink-2">
            <path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </div>
        <button
          type="button"
          className={stepBtn}
          onClick={() => next && onChange(next)}
          disabled={!next}
          aria-label={next ? `Next month: ${formatMonth(next)}` : "This is the current month"}
        >
          <Chevron dir="right" />
        </button>
      </div>
      <div className="min-h-[38px]" aria-live="polite">
        {loading ? (
          <div className="flex flex-col gap-1.5 pt-1">
            <ProgressBar label={`Counting passes in ${formatMonth(value)}`} />
            <p className="text-[13px] text-ink-2">Counting passes in {formatMonth(value)} in NASA's catalog. This can take a few seconds.</p>
          </div>
        ) : (
          <p className="text-[13px] leading-snug text-ink-3">
            {isCurrent ? `Month in progress: ${formatDayRange(period.start, period.end)}. ` : null}
            {lastDate === undefined
              ? null
              : lastDate
                ? `Latest pass on record: ${formatDayShort(lastDate)}.`
                : "No passes on record in this period."}
          </p>
        )}
      </div>
    </div>
  );
}
