# Tarefa para o júnior
**Objetivo:** traduzir somente os textos próprios do componente PassDetails para português e destacar comparação.
**Arquivo de saída:** `web/src/features/region/PassDetails.tsx`
**Assinatura/interface:** preservar Props, export PassDetails e comportamento atual de CompareOption; não alterar imports, lógica dos vizinhos ou URLs.
**Entradas e saídas:** rótulo do link compatível deve ser “Comparar com outra data: {formatDayShort(other.date)}”; download “Baixar produto”; todos demais textos JSX em português; usar anterior/posterior, dia/dias, antes/depois; preservar UTC e dados da API.
**Arquivos de contexto/exemplo:** arquivo atual.
**Restrições:** só este arquivo; não adicionar funcionalidades/dependências. Helpers importados continuam existentes sem alteração. Não inventar tradução automática para valores da API.
**Critério de pronto:** npm run typecheck -w web
