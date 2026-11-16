# Correção de busca estadual
**Objetivo:** Digitar nome/sigla deve exibir resultados visíveis e selecionáveis, sem depender de abrir select separado.
**Arquivo de saída:** web/src/features/overview/RegionPicker.tsx
**Interface:** Preservar Props e RegionPicker.
**Comportamento:** normalizar texto com normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim(); corrigir regex atual que está incorreta. Filtrar somente estados por name + code. Quando search.trim() não vazio, mostrar lista de botões type=button com texto exato "São Paulo (SP)" etc. Clicar ou Enter/Space nesses botões chama onChange(id) e limpa busca. Mostrar "Nenhum estado encontrado." em role=status quando não houver resultado. Manter select existente com Brasil e todos estados, independente da busca. Retornar ao Brasil chama onChange('br') e limpa busca. Não disparar onChange ao digitar. Disabled em todos controles. Remover seta decorativa do campo de busca. Lista com max-h-60 overflow-y-auto, botões w-full text-left p-2 bg-sheet text-ink e foco visível.
**Contexto:** arquivo atual e smoke.
**Restrições:** somente arquivo solicitado; sem dependências.
**Critério de pronto:** npm run typecheck -w web && PLAYWRIGHT_MODULE=/home/luciano/.npm/_npx/420ff84f11983ee5/node_modules/playwright/index.mjs CHROMIUM_PATH=/home/luciano/.cache/ms-playwright/chromium-1255/chrome-linux64/chrome node web/scripts/state-search-smoke.mjs

Revisão 1: regex ainda incorreta, nomes sem sigla, select removido e lista sempre aberta.
Correção: use str.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim(). Botões devem renderizar {r.name} ({r.code}). Renderizar resultados apenas com search.trim(). Restaurar select com todos estados e aria-label="Estado selecionado". onChange/select/retorno limpam search. Estado vazio visível, não sr-only.
Validação: smoke existente deve passar SEM alterar testes.

Revisão 2 (última): remova função regionName não usada; regex deve conter UMA barra antes de p: /\p{Diacritic}/gu, e normalização termina em .trim(). Select independente com todos estados e Brasil; botões de resultado somente durante busca. Corrigir apenas RegionPicker; não tentar resolver erros de outros arquivos gerados por tarefas paralelas.
