Arquivo: web/src/features/region/PassDetails.tsx
Problema: teste falha pois atalho segue diferente; tradução ainda tem passos/pass/Polítomos e erros de gênero.
Correção: link “Comparar com outra data: {formatDayShort(other.date)}”; “Voltar às passagens de”; “Procurando a passagem {word} desta faixa…”; “Nenhuma passagem {word} encontrada nos 24 dias {side === 'previous' ? 'antes' : 'depois'} do período.”; “Compare esta passagem com a anterior ou posterior na mesma faixa.”; “Órbita relativa {pass.track}, quadro {pass.frame}. Compare apenas aquisições da mesma faixa e geometria.”; Fact term="Polarizações"; download “Baixar produto”. Preserve demais lógica/imports/props.
Validação: npm test -w web -- src/features/region/PassDetails.test.ts && npm run typecheck -w web
Saída única: web/src/features/region/PassDetails.tsx. Retornar arquivo completo.
