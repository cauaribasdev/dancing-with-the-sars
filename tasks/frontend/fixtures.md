# Tarefa T1.06 — fixture proposta
**Objetivo:** Dados sintéticos de demonstração para três fontes propostas.
**Arquivo de saída:** web/src/features/region/demoFeeds.ts
**Assinatura/interface:** export function demoFeed(feature: string, id: string): object
**Entradas e saídas:** feature alerts, organizations ou posts. alerts retorna dataSource:'cache',region:{id,name:id},updatedAt:null,summary:{active:0,highestSeverity:null},alerts:[]; organizations retorna region:{id,name:id},reference:{lon:0,lat:0,kind:'state'},total:0,organizations:[],campaigns:[],notice:'Dados sintéticos — não são dados reais'; posts retorna dataSource:'cache',region:{id,name:id},posts:[],nextCursor:null. Feature desconhecida lança Error.
**Contexto:** tarefa autocontida, fixtures vazias conforme contrato proposto no plano.
**Restrições:** somente arquivo saída; sem dependências; não alterar testes; não inventar dados reais.
**Critério de pronto:** npm test -w web -- src/features/region/demoFeeds.test.ts
