import { useState, type ReactNode } from "react";

/**
 * Standard page layout: text panel on the left (280 px), map in the rest.
 * On phones the map comes first (68% of the screen height) and the panel follows, scrolling with the page.
 */
export function MapPageLayout({ panel, map, panelLabel }: { panel: ReactNode; map: ReactNode; panelLabel: string }) {
  const [controlsOpen, setControlsOpen] = useState(false);
  return (
    <div className="flex h-full flex-col overflow-y-auto lg:grid lg:grid-cols-[280px_minmax(0,1fr)] lg:overflow-hidden">
      <div className="order-1 h-[68svh] min-h-[320px] shrink-0 lg:order-2 lg:h-full">{map}</div>
      <aside aria-label={panelLabel} className="map-page-panel order-2 border-rule bg-paper lg:order-1 lg:min-h-0 lg:overflow-y-auto lg:border-r">
        <button type="button" className="lg:hidden w-full p-3 text-left border-b border-rule" aria-expanded={controlsOpen} onClick={()=>setControlsOpen(!controlsOpen)}>Localização e filtros {controlsOpen ? "−" : "+"}</button>
        <div className={`${controlsOpen ? "block" : "hidden"} lg:block px-5 pb-8 pt-6 lg:px-6`}>{panel}</div>
      </aside>
    </div>
  );
}

/** Shared title using the application typeface. */
export function PageTitle({ children }: { children: ReactNode }) {
  return (
    <h1 className="text-[28px] font-[680] leading-[1.08] tracking-[-0.015em] text-balance text-ink">
      {children}
    </h1>
  );
}

/** Section heading inside the panel. Sentence case, never all caps. */
export function SectionTitle({ children, id }: { children: ReactNode; id?: string }) {
  return (
    <h2 id={id} className="text-[15px] font-[650] text-ink">
      {children}
    </h2>
  );
}
