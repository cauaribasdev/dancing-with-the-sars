# Tarefa — selecionar passagens sem abrir detalhes
**Objetivo:** Checkbox independente em cada linha da lista de passagens.
**Arquivo de saída:** web/src/features/region/PassList.tsx
**Interface:** preservar Props e adicionar selectedImageIds?: string[]; onToggleImage?: (pass: Pass) => void. Desestruturar selectedImageIds = [], onToggleImage.
**Comportamento:** dentro de cada li da passagem, antes do botão existente, mostrar input type=checkbox apenas se onToggleImage existir. checked={selectedImageIds.includes(p.id)}; onChange={()=>onToggleImage(p)}; disabled={disabled}; aria-label={`Incluir imagem ${p.id}`}. Não modificar botão existente, agrupamento, datas ou limite.
**Contexto:** arquivo existente.
**Restrições:** apenas esse arquivo; sem dependências.
**Critério de pronto:** npm run typecheck -w web
