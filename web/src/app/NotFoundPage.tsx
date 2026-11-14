import { Link } from "react-router";
import { PageTitle } from "../ui/MapPageLayout";
import { paths } from "./paths";

export function NotFoundPage() {
  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4 px-5 py-16">
      <PageTitle>There is nothing at this address</PageTitle>
      <p className="text-ink-2">The link may be incomplete. The map of Brazil is the best place to start.</p>
      <Link to={paths.overview()} className="btn-primary self-start">
        Open the map
      </Link>
    </div>
  );
}
