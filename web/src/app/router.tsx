import { createBrowserRouter } from "react-router";
import { ComparePage } from "../features/compare/ComparePage";
import { OverviewPage } from "../features/overview/OverviewPage";
import { RegionPage } from "../features/region/RegionPage";
import { StoryPage } from "../features/story/StoryPage";
import { Layout } from "./Layout";
import { NotFoundPage } from "./NotFoundPage";

/**
 * Routes. Each page lives in features/<name>/ and owns its folder.
 * Build links with the helpers in app/paths.ts instead of writing URLs by hand.
 */
export const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { index: true, element: <OverviewPage /> },
      { path: "region/:regionId", element: <RegionPage /> },
      { path: "story/:storyId", element: <StoryPage /> },
      { path: "compare", element: <ComparePage /> },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
]);
