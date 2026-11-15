Arquivo: web/src/features/home/DataSources.tsx
Problema: “Previsões” altera significado; asteriscos aparecem na interface e links não recebem classe; aria-label diverge.
Correção: substituir texto por “As prévias são renderizações visuais, não medidas calibradas.” e “A composição pode combinar datas diferentes e não garante cobertura integral.” Sem asteriscos; aria-label="Fontes e limites"; className="link" nas âncoras; manter export e URLs, legibilidade e espaçamento.
Validação: npm run typecheck -w web. Produzir somente arquivo corrigido.
