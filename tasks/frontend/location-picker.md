# Tarefa — seletor de localização
**Objetivo:** Seletor pesquisável acessível de estados com retorno Brasil.
**Arquivo de saída:** web/src/features/overview/RegionPicker.tsx
**Assinatura/interface:** Preservar Props e export RegionPicker existentes.
**Entradas e saídas:** Mostrar label Localização, input type search com aria-label Buscar estado; filtrar por nome ou sigla sem case e acentos; select com Brasil value br sempre, somente estados filtrados. Preservar opção selecionada mesmo fora do filtro. Botão Retornar ao Brasil quando value != br. Sem disparar onChange ao digitar, somente ao selecionar ou botão. Disabled respeitado.
**Contexto:** arquivo existente e api/types.ts.
**Restrições:** único arquivo, React useState, sem dependências; classes Tailwind bg-sheet text-ink border-rule w-full h-10; não remover acessibilidade.
**Critério de pronto:** npm run typecheck -w web

Arquivo: web/src/features/overview/RegionPicker.tsx
Problema: falta opção Brasil; pesquisa não considera sigla/acentos, perde selecionado, aceita macrorregiões; botão ignora disabled.
Correção: incluir option br sempre; derivar lista SEM useEffect: kind==='state' && (id===value || normalize(name+' '+code).includes(normalize(search))); normalize usa NFD e remove diacríticos; botão disabled={disabled}. Label Localização.
Validação: npm run typecheck -w web e revisão desses cinco comportamentos.

Arquivo: web/src/features/overview/RegionPicker.tsx
Problema: revisão 1 ainda não filtra kind, sigla nem preserva selecionado; label continua inglês.
Correção obrigatória literal: const filteredRegions = regions.filter(r => r.kind === 'state' && (r.id === value || normalize(r.name + ' ' + r.code).includes(normalize(search)))); Trocar conteúdo da label por Localização. Não remover opção Brasil nem disabled dos controles.
Validação: typecheck; revisão final desses comportamentos. Segunda e última correção.
