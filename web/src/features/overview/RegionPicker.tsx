import { regionName } from "../../api/regionNames";
import type { Region } from "../../api/types";

interface Props {
  regions: Region[];
  value: string;
  onChange: (regionId: string) => void;
  disabled?: boolean;
}

const byName = (a: Region, b: Region) => regionName(a).localeCompare(regionName(b), "en");

/** Keyboard-friendly choice of any region: Brazil, the 5 macro-regions and the 27 states. */
export function RegionPicker({ regions, value, onChange, disabled }: Props) {
  const country = regions.filter((r) => r.kind === "country");
  const macro = regions.filter((r) => r.kind === "region").sort(byName);
  const states = regions.filter((r) => r.kind === "state").sort(byName);

  return (
    <div className="flex flex-col gap-2">
      <label id="region-label" htmlFor="region-select" className="text-[13px] font-medium text-ink-2">
        Region <span className="font-normal text-ink-3">(or click a state on the map)</span>
      </label>
      <div className="relative">
        <select
          id="region-select"
          value={regions.length ? value : ""}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className="h-10 w-full cursor-pointer appearance-none rounded-[4px] border border-rule bg-sheet pl-3 pr-9 text-[15px] font-[600] text-ink hover:border-rule-strong disabled:cursor-wait disabled:text-ink-3"
        >
          {!regions.length ? <option value="">Loading regions…</option> : null}
          {country.map((r) => (
            <option key={r.id} value={r.id}>
              {regionName(r)}
            </option>
          ))}
          {macro.length ? (
            <optgroup label="Macro-regions">
              {macro.map((r) => (
                <option key={r.id} value={r.id}>
                  {regionName(r)}
                </option>
              ))}
            </optgroup>
          ) : null}
          {states.length ? (
            <optgroup label="States">
              {states.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} ({r.code})
                </option>
              ))}
            </optgroup>
          ) : null}
        </select>
        <svg aria-hidden viewBox="0 0 16 16" className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-ink-2">
          <path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      </div>
    </div>
  );
}
