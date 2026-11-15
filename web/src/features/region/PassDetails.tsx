import type { ReactNode } from "react";
import { Link } from "react-router";
import type { Pass } from "../../api/types";
import { paths } from "../../app/paths";
import { ErrorMessage, ProgressBar } from "../../ui/feedback";
import { formatBytes, formatDateLong, formatDayShort, plural } from "../../ui/format";
import { SectionTitle } from "../../ui/MapPageLayout";
import { directionExplained, MATURITY_TEXT, polarizationsExplained } from "./passText";
import { daysBetween, formatTimeUtc } from "./regionLogic";
import type { NeighborState } from "./useStackNeighbors";

interface Props {
  pass: Pass;
  previous: NeighborState;
  next: NeighborState;
  onBack: () => void;
}

function Fact({ term, children }: { term: string; children: ReactNode }) {
  return (
    <div className="contents">
      <dt className="border-b border-rule py-2 pr-3 text-ink-2">{term}</dt>
      <dd className="border-b border-rule py-2 text-ink">{children}</dd>
    </div>
  );
}

const compareBox =
  "flex flex-col gap-0.5 rounded-[4px] border border-rule bg-sheet px-3 py-2.5 transition-colors hover:border-ink";

function CompareOption({ pass, state, side }: { pass: Pass; state: NeighborState; side: "previous" | "next" }) {
  const word = side === "previous" ? "anterior" : "posterior";
  if (state.status === "found") {
    const other = state.pass;
    const days = Math.abs(daysBetween(pass.date, other.date));
    const [before, after] = side === "previous" ? [other, pass] : [pass, other];
    return (
      <Link to={paths.compare(before.id, after.id)} className={compareBox}>
        <span className="text-[15px] font-[650] text-ink">
          Comparar com outra data: {formatDayShort(other.date)}
        </span>
        <span className="num text-[13px] text-ink-2">
          {formatDateLong(before.date)} e {formatDateLong(after.date)}, {plural(days, "dia", "dias")} de intervalo
        </span>
      </Link>
    );
  }
  if (state.status === "searching") {
    return (
      <div className="flex flex-col gap-1.5 py-1" role="status">
        <p className="text-[13px] text-ink-2">Procurando pela passagem {word} desta faixa, apenas fora do período escolhido…</p>
        <ProgressBar label={`Procurando pela passagem ${word} desta faixa`} />
      </div>
    );
  }
  if (state.status === "error") return <ErrorMessage>{state.message}</ErrorMessage>;
  return (
    <p className="text-[13px] text-ink-3">
      Nenhuma passagem {word} desta faixa encontrada nos {side === "previous" ? "24 dias antes" : "24 dias após"} do período.
    </p>
  );
}

/** Detalhes do pass selecionado em palavras simples, e links anterior e posterior na mesma faixa. */
export function PassDetails({ pass, previous, next, onBack }: Props) {
  const maturity = MATURITY_TEXT[pass.maturity];
  return (
    <div className="flex flex-col gap-6">
      <button type="button" onClick={onBack} className="link self-start text-[14px]">
        Voltar às passagens de {formatDayShort(pass.date)}
      </button>

      <div>
        <h2 id="pass-title" className="text-[20px] font-[650] leading-tight text-ink">
          Passagem em {formatDateLong(pass.date)}
        </h2>
        <p className="num text-[14px] text-ink-2">às {formatTimeUtc(pass.start)}</p>
      </div>

      <section className="flex flex-col gap-3" aria-labelledby="compare-title">
        <SectionTitle id="compare-title">Antes e depois</SectionTitle>
        <p className="text-[14px] leading-snug text-ink-2">
          Compare esta passagem com a anterior ou posterior na mesma faixa, normalmente a 12 dias de distância.
        </p>
        <CompareOption pass={pass} state={previous} side="previous" />
        <CompareOption pass={pass} state={next} side="next" />
      </section>

      <section className="flex flex-col gap-3" aria-labelledby="about-title">
        <SectionTitle id="about-title">Sobre esta passagem</SectionTitle>
        <dl className="grid grid-cols-[auto_1fr] border-t border-rule text-[14px] leading-snug">
          <Fact term="Data e hora">
            <span className="num">
              {formatDateLong(pass.date)}, {formatTimeUtc(pass.start)}
            </span>
          </Fact>
          <Fact term="Direção">{directionExplained(pass.direction)}</Fact>
          <Fact term="Faixa de imagem">
            <span className="num font-[600]">{pass.stackId.replace(/_/g, "-")}</span>
            <span className="block text-[13px] text-ink-2">
              Órbita relativa {pass.track}, quadro {pass.frame}. Compare apenas aquisições da mesma faixa e geometria.
            </span>
          </Fact>
          <Fact term="Polarizações">
            <span className="text-[13px]">{polarizationsExplained(pass.polarizations)}</span>
          </Fact>
          <Fact term="Maturidade dos dados">
            <span className="font-[600]">{maturity.label}</span>
            <span className="block text-[13px] text-ink-2">{maturity.note}</span>
          </Fact>
          <Fact term="Produto completo">
            <span className="num">{formatBytes(pass.sizeBytes)}</span>
            <span className="block text-[13px] text-ink-2">
              O arquivo completo requer uma conta gratuita no{" "}
              <a href="https://urs.earthdata.nasa.gov/users/new" target="_blank" rel="noreferrer" className="link font-[500]">
                NASA Earthdata
              </a>
              .{" "}
              <a href={pass.download} target="_blank" rel="noreferrer" className="link font-[500]">
                Baixar produto
              </a>
            </span>
          </Fact>
          <Fact term="Relatório de qualidade">
            <a href={pass.qaReport} target="_blank" rel="noreferrer" className="link font-[500]">
              Abra o relatório de qualidade (PDF)
            </a>
          </Fact>
        </dl>
      </section>
    </div>
  );
}
