import { Link, NavLink, Outlet } from "react-router";
import { useStories } from "../api/hooks";

import { SpaceAppsBrand } from "../ui/SpaceAppsBrand";
import { paths } from "./paths";

const navClass = ({ isActive }: { isActive: boolean }) =>
  `relative whitespace-nowrap rounded-full px-3 py-1.5 text-[13px] font-[600] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal sm:text-[14px] ${
    isActive
      ? "bg-[#17375f] text-[var(--space-yellow)]"
      : "text-ink-2 hover:bg-[#10284c] hover:text-paper"
  }`;

/**
 * App shell: a thin top bar + the page area. The page gets the remaining height
 * (`min-h-0`), so map pages can use `h-full`.
 */
export function Layout() {
  const stories = useStories();
  const firstStory = stories.data?.[0];

  return (
    <div className="grid h-full grid-rows-[auto_minmax(0,1fr)]">
      <a
        href="#content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:bg-sheet focus:px-3 focus:py-2"
      >
        Pular para o conteúdo
      </a>
      <header className="app-header z-20 flex min-h-16 flex-wrap items-center gap-x-3 gap-y-1 border-b border-rule bg-paper px-3 py-2 sm:h-16 sm:flex-nowrap sm:px-5">
        <Link to={paths.home()} className="min-w-0 flex-1 rounded-sm sm:flex-none" aria-label="Dancing With the SARs, início">
          <span className="block truncate font-semibold text-[14px]">Dancing With the SARs</span><span className="hidden text-[11px] text-ink-3 sm:block">Inteligência territorial · Observação da Terra</span>
        </Link>
        <nav aria-label="Navegação principal" className="order-3 flex w-full items-center gap-1 overflow-x-auto sm:order-none sm:w-auto sm:gap-1.5">
          <NavLink to={paths.home()} end className={navClass}>Início</NavLink>
          <NavLink to={paths.overview()} end className={navClass}>
            Mapa
          </NavLink>
          <NavLink to={paths.alerts()} className={navClass}>Alertas</NavLink>
          {firstStory ? (
            <NavLink to={paths.story(firstStory.id)} className={navClass}>
              História
            </NavLink>
          ) : null}
        </nav>
        <p className="ml-auto hidden text-[12px] text-ink-2 lg:block">Projeto para o NASA Space Apps 2026</p>
        <SpaceAppsBrand compact />
      </header>
      <main id="content" className="min-h-0 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
