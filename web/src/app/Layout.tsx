import { Link, NavLink, Outlet } from "react-router";
import { useStories } from "../api/hooks";

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
        Skip to content
      </a>
      <header className="z-20 flex h-12 items-center gap-6 border-b border-rule bg-paper px-4 sm:px-5">
        <Link to={paths.overview()} className="rounded-sm" aria-label="NISAR over Brazil, home">
          <span className="font-semibold text-[14px]">Dancing With the SARs</span><span className="hidden sm:block text-[11px] text-ink-3">Inteligência territorial · Observação da Terra</span>
        </Link>
        <nav aria-label="Main" className="flex items-center gap-4">
          <NavLink to={paths.overview()} end className={navClass}>
            Map
          </NavLink>
          {firstStory ? (
            <NavLink to={paths.story(firstStory.id)} className={navClass}>
              Story
            </NavLink>
          ) : null}
        </nav>
        <p className="ml-auto hidden text-[12px] text-ink-3 md:block">NASA Space Apps 2026, Dancing with the SARs</p>
      </header>
      <main id="content" className="min-h-0 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
