import { useQuery } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router";
import { apiGet, describeError } from "../../api/client";
import type { AlertsResponse, AlertSeverity, WeatherAlert } from "../../api/types";
import { useRegions } from "../../api/hooks";
import { paths } from "../../app/paths";
import { ErrorMessage, ProgressBar, StaleNotice } from "../../ui/feedback";
import { PageTitle, SectionTitle } from "../../ui/MapPageLayout";
import { formatNumber } from "../../ui/format";

const severityLabel: Record<AlertSeverity, string> = {
  extreme: "Extremo",
  severe: "Severo",
  moderate: "Moderado",
  minor: "Baixo",
};

const dateTime = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "UTC",
});

function formatTimestamp(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Horário não informado" : `${dateTime.format(date)} UTC`;
}

export function AlertsPage() {
  const [search, setSearch] = useSearchParams();
  const regionId = search.get("region") ?? "br";
  const regions = useRegions("state");
  const query = useQuery({
    queryKey: ["alerts", regionId, "history"],
    queryFn: ({ signal }) => apiGet<AlertsResponse>(`/regions/${encodeURIComponent(regionId)}/alerts`, { include: "history" }, signal),
    retry: false,
    staleTime: 300_000,
    refetchInterval: 300_000,
  });

  const alerts = query.data?.alerts ?? [];
  const active = alerts.filter((alert) => alert.status === "active");
  const history = alerts.filter((alert) => alert.status === "expired");
  const regionName = regionId === "br"
    ? "Brasil"
    : regions.data?.find((region) => region.id === regionId)?.name ?? regionId.toUpperCase();

  const selectRegion = (id: string) => {
    const next = new URLSearchParams(search);
    if (id === "br") next.delete("region");
    else next.set("region", id);
    setSearch(next, { replace: true });
  };

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-7 px-4 py-7 sm:px-7 sm:py-10">
      <header className="flex flex-col gap-5 border-b border-rule pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-3">
          <p className="text-[12px] font-[650] uppercase tracking-[0.12em] text-signal">Avisos oficiais · INMET</p>
          <PageTitle>Alertas meteorológicos</PageTitle>
          <p className="max-w-2xl text-[15px] leading-relaxed text-ink-2">
            Consulte avisos ativos e os encerrados recentemente. O histórico disponível nesta página cobre o snapshot CAP consultado nos últimos oito dias.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex flex-col gap-1 text-[12px] font-medium text-ink-2">
            Estado
            <select
              aria-label="Filtrar alertas por estado"
              value={regionId}
              onChange={(event) => selectRegion(event.target.value)}
              className="min-w-48 rounded border border-rule bg-sheet px-3 py-2 text-[14px] text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal"
            >
              <option value="br">Todo o Brasil</option>
              {(regions.data ?? []).map((region) => <option key={region.id} value={region.id}>{region.name}</option>)}
            </select>
          </label>
          <button
            type="button"
            className="mt-4 rounded border border-rule px-3 py-2 text-[14px] text-ink hover:border-signal focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal"
            onClick={() => query.refetch()}
            disabled={query.isFetching}
          >
            {query.isFetching ? "Atualizando…" : "Atualizar"}
          </button>
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[13px] text-ink-2">
        <span><strong className="text-ink">{formatNumber(active.length)}</strong> ativos em {regionName}</span>
        <span><strong className="text-ink">{formatNumber(history.length)}</strong> encerrados no histórico</span>
        {query.data ? <span>Fonte consultada em {formatTimestamp(query.data.updatedAt)}</span> : null}
        <StaleNotice dataSource={query.data?.dataSource} />
      </div>

      {query.isPending ? <ProgressBar label="Carregando alertas e histórico" /> : null}
      {query.error ? (
        <div role="alert" className="max-w-2xl">
          <ErrorMessage onRetry={() => query.refetch()}>
            Não foi possível consultar os alertas. {describeError(query.error)}
          </ErrorMessage>
        </div>
      ) : null}

      {!query.error && query.data ? (
        <>
          <section aria-labelledby="active-alerts-title" className="flex flex-col gap-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-rule pb-2">
              <SectionTitle id="active-alerts-title">Alertas ativos</SectionTitle>
              <span className="text-[13px] text-ink-3">{formatNumber(active.length)} avisos</span>
            </div>
            {active.length ? (
              <div className="grid gap-3 md:grid-cols-2">
                {active.map((alert) => <AlertCard key={alert.id} alert={alert} />)}
              </div>
            ) : <p className="rounded border border-rule bg-sheet p-5 text-[14px] text-ink-2">Nenhum alerta ativo foi retornado para {regionName}.</p>}
          </section>

          <section aria-labelledby="alert-history-title" className="flex flex-col gap-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-rule pb-2">
              <div className="flex flex-col gap-1">
                <SectionTitle id="alert-history-title">Histórico recente</SectionTitle>
                <p className="text-[13px] text-ink-3">Alertas encerrados encontrados no snapshot dos últimos oito dias.</p>
              </div>
              <span className="text-[13px] text-ink-3">{formatNumber(history.length)} avisos</span>
            </div>
            {history.length ? (
              <div className="grid gap-3 md:grid-cols-2">
                {history.map((alert) => <AlertCard key={alert.id} alert={alert} />)}
              </div>
            ) : <p className="rounded border border-rule bg-sheet p-5 text-[14px] text-ink-2">Ainda não há alertas encerrados neste período.</p>}
          </section>
        </>
      ) : null}

      <p className="border-t border-rule pt-4 text-[12px] leading-relaxed text-ink-3">
        Os textos dos avisos são reproduzidos como publicados pelo INMET. A expiração informada é a do CAP e não substitui novas atualizações da Defesa Civil.
      </p>
      {regionId !== "br" ? <Link to={`${paths.region(regionId)}?tab=alerts`} className="link self-start text-[13px]">Abrir o painel de {regionName} ↗</Link> : null}
    </div>
  );
}

function AlertCard({ alert }: { alert: WeatherAlert }) {
  const active = alert.status === "active";
  const municipalities = alert.municipalities.slice(0, 6);
  const remaining = alert.municipalities.length - municipalities.length;
  return (
    <article className={`flex flex-col gap-3 rounded border border-rule bg-sheet p-4 sm:p-5 ${active ? "border-l-4 border-l-[#b3261e]" : "border-l-4 border-l-ink-3 opacity-90"}`}>
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex flex-col gap-1">
          <span className={`text-[11px] font-[700] uppercase tracking-[0.08em] ${active ? "text-[#ff7b72]" : "text-ink-3"}`}>
            {active ? "Ativo" : "Encerrado"} · {severityLabel[alert.severity]}
          </span>
          <h3 className="text-[16px] font-[650] leading-snug text-ink">{alert.headline || alert.event}</h3>
        </div>
        {alert.url ? <a className="link shrink-0 text-[13px]" href={alert.url} target="_blank" rel="noreferrer">Fonte INMET ↗</a> : null}
      </header>
      <div className="grid gap-x-4 gap-y-2 text-[12px] text-ink-2 sm:grid-cols-2">
        <p>Início: <time dateTime={alert.onset}>{formatTimestamp(alert.onset)}</time></p>
        <p>Validade: <time dateTime={alert.expires}>{formatTimestamp(alert.expires)}</time></p>
        <p>Publicado: <time dateTime={alert.sent}>{formatTimestamp(alert.sent)}</time></p>
        <p>Municípios afetados: {formatNumber(alert.municipalityCountTotal)}</p>
      </div>
      {municipalities.length ? (
        <p className="text-[13px] leading-relaxed text-ink-2">
          {municipalities.map((municipality) => municipality.name).join(", ")}{remaining > 0 ? ` e mais ${formatNumber(remaining)}` : ""}
        </p>
      ) : null}
      {alert.description || alert.instruction ? (
        <details className="border-t border-rule pt-2 text-[13px] text-ink-2">
          <summary className="cursor-pointer py-1 font-medium text-ink">Detalhes e orientações</summary>
          {alert.description ? <p className="mt-2 whitespace-pre-line leading-relaxed">{alert.description}</p> : null}
          {alert.instruction ? <p className="mt-2 whitespace-pre-line leading-relaxed">{alert.instruction}</p> : null}
        </details>
      ) : null}
    </article>
  );
}
