import type { ReactNode } from "react";

/**
 * Standard page layout: text panel on the left (380 px), map in the rest.
 * On phones the map comes first (58% of the screen height) and the panel follows, scrolling with the page.
 */
export function MapPageLayout({ panel, map, panelLabel }: { panel: ReactNode; map: ReactNode; panelLabel: string }) {
  return (
    <div className="flex h-full flex-col overflow-y-auto lg:grid lg:grid-cols-[380px_minmax(0,1fr)] lg:overflow-hidden">
      <div className="order-1 h-[58svh] min-h-[320px] shrink-0 lg:order-2 lg:h-full">{map}</div>
      <aside aria-label={panelLabel} className="order-2 border-rule bg-paper lg:order-1 lg:min-h-0 lg:overflow-y-auto lg:border-r">
        <div className="px-5 pb-8 pt-6 lg:px-6">{panel}</div>
      </aside>
    </div>
  );
}

/** Page title: expanded Archivo, the only place the typeface widens. */
export function PageTitle({ children }: { children: ReactNode }) {
  return (
    <h1 className="text-[28px] font-[680] leading-[1.08] tracking-[-0.015em] text-balance text-ink" style={{ fontStretch: "118%" }}>
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
