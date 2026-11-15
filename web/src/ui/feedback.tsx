// State components: loading, stale-data notice, error. Use them on every page.
import type { ReactNode } from "react";
import type { DataSource } from "../api/types";

/** Thin bar. Without `value`: indeterminate (sweep). With `value` 0..1: real progress. */
export function ProgressBar({ value, label, className }: { value?: number | null; label: string; className?: string }) {
  const determinate = typeof value === "number";
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={determinate ? 0 : undefined}
      aria-valuemax={determinate ? 100 : undefined}
      aria-valuenow={determinate ? Math.round(value * 100) : undefined}
      className={`relative h-[3px] w-full overflow-hidden bg-rule ${className ?? ""}`}
    >
      {determinate ? (
        <div className="h-full bg-ink transition-[width] duration-200" style={{ width: `${value * 100}%` }} />
      ) : (
        <div className="progress-sweep h-full w-2/5 bg-ink" />
      )}
    </div>
  );
}

function CautionIcon() {
  return (
    <svg aria-hidden viewBox="0 0 20 20" className="mt-0.5 size-4 shrink-0" fill="currentColor">
      <path d="M10 2.5 18.5 17h-17L10 2.5Zm0 4.2-.9 6.1h1.8L10 6.7Zm0 7.6a1.05 1.05 0 1 0 0 2.1 1.05 1.05 0 0 0 0-2.1Z" />
    </svg>
  );
}

/**
 * Shown only when a response came back with dataSource "stale": NASA did not answer and the server
 * returned the last saved copy. Put it next to the numbers that came from that response.
 */
export function StaleNotice({ dataSource, className }: { dataSource: DataSource | undefined; className?: string }) {
  if (dataSource !== "stale") return null;
  return (
    <p
      role="status"
      className={`flex gap-2 rounded-[3px] bg-caution-wash px-3 py-2 text-[13px] leading-snug text-caution ${className ?? ""}`}
    >
      <CautionIcon />
      <span>O catálogo da NASA não respondeu agora. Estes dados são a última cópia salva e podem estar desatualizados.</span>
    </p>
  );
}

/** Error with what to do next. `onRetry` adds a "Try again" button. */
export function ErrorMessage({ children, onRetry, className }: { children: ReactNode; onRetry?: () => void; className?: string }) {
  return (
    <div role="alert" className={`flex flex-col items-start gap-2 text-[14px] text-ink ${className ?? ""}`}>
      <p className="flex gap-2 text-caution">
        <CautionIcon />
        <span>{children}</span>
      </p>
      {onRetry ? (
        <button type="button" onClick={onRetry} className="link text-[14px]">
          Tentar novamente
        </button>
      ) : null}
    </div>
  );
}
