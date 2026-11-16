# Tarefa para o júnior
**Objetivo:** criar faixa discreta de fontes e limitações em português para a home.
**Arquivo de saída:** `web/src/features/home/DataSources.tsx`
**Assinatura/interface:** export function DataSources(), React sem props.
**Entradas e saídas:** section acessível aria-label="Fontes e limites", links NASA/ISRO NISAR https://nisar.jpl.nasa.gov/ ; ASF DAAC https://asf.alaska.edu/ ; IBGE https://www.ibge.gov.br/ . Texto distingue prévias visuais de medidas calibradas e explica que composição pode combinar datas diferentes e não garante cobertura integral.
**Arquivos de contexto/exemplo:** nenhum.
**Restrições:** somente arquivo de saída, nenhuma dependência, não prometer endosso NASA, sem logos; classes Tailwind text-ink-2 text-ink-3 border-rule bg-sheet rounded-xl, links className="link"; export nomeado; não importar React desnecessariamente.
**Critério de pronto:** npm run typecheck -w web
