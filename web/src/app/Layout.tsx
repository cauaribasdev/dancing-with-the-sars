import { Link, NavLink, Outlet } from "react-router";
import { useStories } from "../api/hooks";

import { SpaceAppsBrand } from "../ui/SpaceAppsBrand";
import { paths } from "./paths";

const navClass = ({ isActive }: { isActive: boolean }) =>
  `relative px-1 py-1 text-[14px] font-medium transition-colors ${
    isActive
      ? "text-ink after:absolute after:inset-x-1 after:-bottom-[13px] after:h-[2px] after:bg-ink"
      : "text-ink-2 hover:text-ink"
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
      <header className="app-header z-20 flex h-16 items-center gap-3 border-b border-rule bg-paper px-4 sm:px-5">
        <Link to={paths.home()} className="rounded-sm" aria-label="Dancing With the SARs, início">
          <span className="font-semibold text-[14px]">Dancing With the SARs</span><span className="hidden sm:block text-[11px] text-ink-3">Inteligência territorial · Observação da Terra</span>
        </Link>
        <nav aria-label="Navegação principal" className="flex items-center gap-3">
          <NavLink to={paths.home()} end className={navClass}>Início</NavLink>
          <NavLink to={paths.overview()} end className={navClass}>
            Mapa
          </NavLink>
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
