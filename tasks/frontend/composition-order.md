# Tarefa para o júnior
**Objetivo:** ordenar IDs de imagens pela aquisição, antiga primeiro e recente por último, para desenho de camadas consistente.
**Arquivo de saída:** `web/src/features/region/compositionOrder.ts`
**Assinatura/interface:** export function orderComposition(ids: readonly string[], passes: readonly {id:string;start:string}[]): string[]
**Entradas e saídas:** start ISO UTC; deduplicar IDs, ignorar IDs fora de passes, ordem crescente start e desempate id usando comparação lexical determinística.
**Arquivos de contexto/exemplo:** web/src/features/region/compositionOrder.test.ts
**Restrições:** somente saída, sem dependências, não mutar entradas, sem hooks.
**Critério de pronto:** npm test -w web -- src/features/region/compositionOrder.test.ts
