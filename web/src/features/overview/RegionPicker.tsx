import { useState } from "react";
import type { Region } from "../../api/types";

const normalize = (str: string) => str.normalize('NFD').toLowerCase().replace(/[\u0300-\u036f]/g, '');

interface Props {
  regions: Region[];
  value: string;
  onChange: (regionId: string) => void;
  disabled?: boolean;
}

const regionName = (region: Region) => region.name || region.code;

export function RegionPicker({ regions, value, onChange, disabled }: Props) {
  const [search, setSearch] = useState("");

  const filteredRegions = regions.filter((r) =>
    r.kind === 'state' && (r.id === value || normalize(r.name + ' ' + r.code).includes(normalize(search)))
  );

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange(e.target.value);
  };

  const handleReturnToBrazil = () => {
    if (value !== "br") {
      onChange("br");
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <label id="region-label" htmlFor="region-select" className="text-[13px] font-medium text-ink-2">
        Localização
      </label>
      <div className="relative">
        <input
          id="region-search"
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar estado"
          aria-label="Buscar estado"
          className="h-10 w-full cursor-pointer appearance-none rounded-[4px] border border-rule bg-sheet px-3 pr-9 text-[15px] font-[600] text-ink hover:border-rule-strong disabled:cursor-wait disabled:text-ink-3"
          disabled={disabled}
        />
        <svg aria-hidden viewBox="0 0 16 16" className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-ink-2">
          <path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      </div>
      <select
        id="region-select"
        value={value}
        onChange={handleSelectChange}
        disabled={disabled}
        className="h-10 w-full cursor-pointer appearance-none rounded-[4px] border border-rule bg-sheet pl-3 pr-9 text-[15px] font-[600] text-ink hover:border-rule-strong disabled:cursor-wait disabled:text-ink-3"
      >
        <option key="br" value="br" disabled={value === "br"} className="bg-sheet">
          Brasil
        </option>
        {filteredRegions.map((r) => (
          <option key={r.id} value={r.id} disabled={r.id === "br"}>
            {regionName(r)}
          </option>
        ))}
      </select>
      {value !== "br" && (
        <button
          onClick={handleReturnToBrazil}
          disabled={disabled}
          className="text-[13px] font-medium text-ink-2 mt-2"
        >
          Retornar ao Brasil
        </button>
      )}
    </div>
  );
}
