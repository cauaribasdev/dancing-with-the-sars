// Compare page: /compare?before=<passId>&after=<passId> (build it with paths.compare).
// Any two passes; when their viewing geometry differs, the page says plainly that brightness changes are not ground changes.
import type { ReactNode } from "react";
import { Link, useSearchParams } from "react-router";
import { ApiError, describeError } from "../../api/client";
import { usePass } from "../../api/hooks";
import type { Pass } from "../../api/types";
import { paths } from "../../app/paths";
import { BaseMap } from "../../map/BaseMap";
import { BeforeAfterMap } from "../../map/BeforeAfterMap";
import { describeGeometry } from "../../map/beforeAfter";
import { ErrorMessage, ProgressBar, StaleNotice } from "../../ui/feedback";
import { formatBytes, formatDateLong, plural } from "../../ui/format";
import { MapPageLayout, PageTitle, SectionTitle } from "../../ui/MapPageLayout";
import { compareArea, compareNotes, daysBetween, formatTimeUtc, orderPasses, readCompareParams } from "./compareLogic";

export function ComparePage() {
  const [params] = useSearchParams();
  const ids = readCompareParams(params);
  const first = usePass(ids.before ?? undefined);
  const second = usePass(ids.after ?? undefined);

  const shell = (panel: ReactNode, map: ReactNode = <BaseMap />) => (
    <MapPageLayout panelLabel="Comparação" panel={<div className="flex flex-col gap-6">{panel}</div>} map={map} />
  );
  const back = (
    <Link to={paths.overview()} className="link self-start text-[14px]">
      Voltar ao mapa
    </Link>
  );

  if (!ids.before || !ids.after) {
    const missing = !ids.before && !ids.after ? "as duas passagens" : !ids.before ? "a passagem anterior" : "a passagem posterior";
    return shell(
      <>
        <PageTitle>Antes e depois</PageTitle>
        <p className="text-[15px] leading-[1.55] text-ink-2">
          Este endereço não informa {missing}. Selecione duas passagens do mesmo local para compará-las: abra um estado no mapa para ver
          as passagens disponíveis.
        </p>
        {back}
      </>,
    );
  }

  const failures = [
    { label: "anterior", id: ids.before, query: first },
    { label: "posterior", id: ids.after, query: second },
  ].filter((f) => f.query.isError);
  if (failures.length > 0) {
    return shell(
      <>
        <PageTitle>Antes e depois</PageTitle>
        {failures.map((f) => {
          const notFound = f.query.error instanceof ApiError && f.query.error.status === 404;
          return (
            <div key={f.label} className="flex flex-col gap-1.5">
              <ErrorMessage onRetry={notFound ? undefined : () => f.query.refetch()}>
                Não foi possível carregar a passagem {f.label}. {describeError(f.query.error)}
              </ErrorMessage>
              <p className="num break-all text-[12px] text-ink-3">{f.id}</p>
            </div>
          );
        })}
        <p className="text-[14px] text-ink-2">Verifique o endereço ou escolha duas passagens do mesmo local em um estado no mapa.</p>
        {back}
      </>,
    );
  }

  if (!first.data || !second.data) {
    return shell(
      <>
        <PageTitle>Antes e depois</PageTitle>
        <div className="flex flex-col gap-2">
          <ProgressBar label="Carregando as duas passagens" />
          <p className="text-[14px] text-ink-2">Carregando as passagens do catálogo da NASA…</p>
        </div>
      </>,
    );
  }

  const { before, after, swapped } = orderPasses(first.data.pass, second.data.pass);
  const notes = compareNotes(before, after);
  const days = daysBetween(before.date, after.date);
  const stale = first.data.dataSource === "stale" || second.data.dataSource === "stale" ? "stale" : "live";

  return shell(
    <>
      <header className="flex flex-col gap-3">
        <PageTitle>Antes e depois</PageTitle>
        <p className="text-[15px] leading-[1.55] text-ink-2">
          {notes.samePass
            ? `Uma passagem de radar em ${formatDateLong(before.date)}.`
            : `Duas imagens de radar com intervalo de ${plural(days, "dia", "dias")}, em ${formatDateLong(before.date)} e ${formatDateLong(after.date)}.${notes.sameGeometry ? " Alterne entre elas no mapa para observar as diferenças." : " Leia o aviso abaixo antes de alternar entre elas no mapa."}`}
        </p>
      </header>
      <StaleNotice
        dataSource={stale}
        onRetry={() => void Promise.all([first.refetch(), second.refetch()])}
        isUpdating={first.isFetching || second.isFetching}
      />

      {!notes.sameGeometry ? (
        <Caution>
          <strong className="font-[650]">Estas passagens foram captadas com geometrias de observação diferentes.</strong> O radar
          observou o solo de uma trilha, direção ou faixa distinta ({describeGeometry(before)}, depois{" "}
          {describeGeometry(after)}); diferenças de brilho não significam que o terreno mudou.
        </Caution>
      ) : null}
      {notes.samePass ? <Caution>Os dois identificadores do endereço apontam para a mesma passagem, então as imagens são idênticas.</Caution> : null}
      {swapped ? (
        <p className="text-[13px] leading-snug text-ink-3">
          O endereço indicava a passagem mais recente como anterior. A exibição segue a ordem das datas.
        </p>
      ) : null}

      <section className="flex flex-col gap-2" aria-labelledby="details-title">
        <SectionTitle id="details-title">As duas passagens</SectionTitle>
        <PassTable before={before} after={after} />
        {notes.sameGeometry ? (
          <p className="text-[13px] leading-snug text-ink-3">
            Mesma trilha, direção e faixa: o radar observou o solo pelo mesmo ângulo nas duas datas.
          </p>
        ) : null}
      </section>

      <section className="flex flex-col gap-2" aria-labelledby="read-title">
        <SectionTitle id="read-title">Como interpretar as imagens</SectionTitle>
        <ul className="flex list-disc flex-col gap-1.5 pl-4 text-[14px] leading-[1.55] text-ink-2 marker:text-ink-3">
          <li>A água parada reflete o pulso do radar para longe do satélite e aparece escura.</li>
          <li>Estas são imagens de prévia: representações visuais, não medições calibradas.</li>
        </ul>
      </section>

      {back}
    </>,
    <BeforeAfterMap
      before={{ passId: before.id, date: before.date }}
      after={{ passId: after.id, date: after.date }}
      initialBbox={compareArea(before, after)}
      pairBbox={compareArea(before, after)}
    />,
  );
}

function Caution({ children }: { children: ReactNode }) {
  return (
    <div role="note" className="flex gap-2 rounded-[3px] bg-caution-wash px-3 py-2.5 text-[14px] leading-snug text-caution">
      <svg aria-hidden viewBox="0 0 20 20" className="mt-0.5 size-4 shrink-0" fill="currentColor">
        <path d="M10 2.5 18.5 17h-17L10 2.5Zm0 4.2-.9 6.1h1.8L10 6.7Zm0 7.6a1.05 1.05 0 1 0 0 2.1 1.05 1.05 0 0 0 0-2.1Z" />
      </svg>
      <p>{children}</p>
    </div>
  );
}

function PassTable({ before, after }: { before: Pass; after: Pass }) {
  const rows: [string, (p: Pass) => ReactNode][] = [
    ["Data", (p) => formatDateLong(p.date)],
    ["Horário", (p) => formatTimeUtc(p.start)],
    ["Direção", (p) => (p.direction === "ascending" ? "Ascendente (sentido norte)" : "Descendente (sentido sul)")],
    ["Trilha", (p) => p.track],
    ["Faixa", (p) => p.frame],
    ["Versão dos dados", (p) => `${p.maturity[0].toUpperCase()}${p.maturity.slice(1)}, ${p.productVersion}`],
    ["Arquivo completo", (p) => formatBytes(p.sizeBytes)],
  ];
  return (
    <table className="num w-full border-collapse text-left text-[13px]">
      <thead>
        <tr className="border-b border-rule text-ink-2">
          <th scope="col" className="py-1.5 pr-2 font-[500]">
            <span className="sr-only">Detalhe</span>
          </th>
          <th scope="col" className="py-1.5 pr-2 font-[650] text-ink">
            Antes
          </th>
          <th scope="col" className="py-1.5 font-[650] text-ink">
            Depois
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.map(([label, get]) => (
          <tr key={label} className="border-b border-rule align-top">
            <th scope="row" className="py-1.5 pr-2 font-[500] text-ink-2">
              {label}
            </th>
            <td className="py-1.5 pr-2 text-ink">{get(before)}</td>
            <td className="py-1.5 text-ink">{get(after)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
