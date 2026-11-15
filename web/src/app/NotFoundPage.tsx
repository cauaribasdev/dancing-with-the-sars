import { Link } from "react-router";
import { PageTitle } from "../ui/MapPageLayout";
import { paths } from "./paths";

export function NotFoundPage() {
  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4 px-5 py-16">
      <PageTitle>Esta página não existe</PageTitle>
      <p className="text-ink-2">O endereço pode estar incompleto. Comece pelo mapa do Brasil.</p>
      <Link to={paths.overview()} className="btn-primary self-start">
        Abrir o mapa
      </Link>
    </div>
  );
}
