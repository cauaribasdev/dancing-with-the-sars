import { formatMonth } from "../../ui/format";
import { COVERAGE_CLASSES, NO_COVERAGE_LABEL, coverageClassLabel } from "./coverageScale";

/**
 * Stepped legend, like the elevation scale on a chart: blocks set side by side (2 px of paper between them)
 * with each range written underneath.
 */
export function CoverageLegend({ month, dimmed }: { month: string; dimmed: boolean }) {
  return (
    <figure className="pointer-events-auto rounded-[4px] bg-sheet/95 px-3 pb-2.5 pt-2 shadow-[0_0_0_1px_var(--color-rule)]">
      <figcaption className="mb-1.5 text-[12px] font-[600] leading-tight text-ink">
        Days with a pass <span className="font-normal text-ink-2">in {formatMonth(month)}</span>
      </figcaption>
      <ol className={`flex items-start gap-[2px] transition-opacity ${dimmed ? "opacity-40" : ""}`}>
        <li className="flex w-[38px] flex-col gap-1">
          <span aria-hidden className="h-3 rounded-[2px] border border-dashed border-ink-3" />
          <span className="text-[11px] leading-none text-ink-2" aria-label="no days with a pass">
            {NO_COVERAGE_LABEL}
          </span>
        </li>
        {COVERAGE_CLASSES.map((c) => (
          <li key={c.label} className="flex w-[38px] flex-col gap-1 sm:w-[42px]">
            <span aria-hidden className="h-3 rounded-[2px]" style={{ background: c.color }} />
            <span className="num whitespace-nowrap text-[11px] leading-none text-ink-2" aria-label={coverageClassLabel(c.min)}>
              {c.label}
            </span>
          </li>
        ))}
      </ol>
    </figure>
  );
}
