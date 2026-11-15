# Tarefa — seleção acumulativa de imagens
**Objetivo:** Unir IDs escolhidos em dias diferentes sem duplicatas ou dados fora do contexto.
**Arquivo de saída:** web/src/features/region/imageSelection.ts
**Interface:** export function mergeImageSelection(current: readonly string[], additions: readonly string[], allowed: readonly string[]): string[]
**Comportamento:** unir current e additions, manter somente IDs presentes em allowed, eliminar duplicatas, ordenar com sort() padrão JS. Não mutar arrays.
**Contexto:** imageSelection.test.ts.
**Restrições:** somente arquivo, sem imports/dependências.
**Critério de pronto:** npm test -w web -- src/features/region/imageSelection.test.ts
