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
      <header className="app-header z-20">
        <div className="app-header-inner">
          <Link to={paths.home()} className="app-header-brand" aria-label="Dancing With the SARs, início">
            <span className="app-header-mark" aria-hidden="true">SAR</span>
            <span className="app-header-brand-copy">
              <span className="app-header-title">Dancing With the SARs</span>
              <span className="app-header-subtitle">Inteligência territorial · Observação da Terra</span>
            </span>
          </Link>
          <nav aria-label="Navegação principal" className="app-header-nav">
            <NavLink to={paths.home()} end className={navClass}>Início</NavLink>
            <NavLink to={paths.overview()} end className={navClass}>Mapa</NavLink>
            <NavLink to={paths.alerts()} className={navClass}>Alertas</NavLink>
            {firstStory ? (
              <NavLink to={paths.story(firstStory.id)} className={navClass}>História</NavLink>
            ) : null}
          </nav>
          <div className="app-header-event"><span>NASA Space Apps</span><SpaceAppsBrand compact /></div>
        </div>
      </header>
      <main id="content" className="min-h-0 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
