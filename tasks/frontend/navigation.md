# Tarefa para o júnior — T2.01
**Objetivo:** Normalizar query estadual conforme A03–A05.
**Arquivo de saída:** `web/src/features/region/navigation.ts`
**Assinatura/interface:** export function normalizeRegionQuery(input: URLSearchParams, today: Date): {params: URLSearchParams; warning: boolean}
**Entradas e saídas:** copiar input; tab válido overview/radar/alerts/help/posts. Sem tab: radar se day/pass, senão overview. Tab inválido: overview e warning. Período sem ambas datas: últimos 30 dias UTC incluindo hoje; se alguma presente mas inválida/incompleta/futura/invertida/>366 dias: default e warning. Sempre escrever start/end. Período inválido limpa day/pass. day inválido ou fora da janela: remover day e pass. Preservar outros parâmetros.
**Contexto:** web/src/api/dates.ts e teste navigation.test.ts.
**Restrições:** somente arquivo de saída; sem dependências; não alterar testes.
**Critério de pronto:** npm test -w web -- src/features/region/navigation.test.ts
