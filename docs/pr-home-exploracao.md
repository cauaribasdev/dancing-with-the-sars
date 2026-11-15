# Home Space Apps e exploração territorial com imagens de múltiplas datas

A aplicação abre com uma home que apresenta o objetivo, imagens reais antes/depois do RS e acesso direto à história e ao mapa. O explorador passa para `/explore`; links antigos da raiz com filtros continuam funcionando.

Esta PR consolidada depende da PR #3 (`feat/frontend-prototipo`, por sua vez sobre a #2) e inclui os incrementos locais ainda não publicados: redesign territorial, correção da busca de estados/navegação, composição diária e multiday, home e identidade Space Apps.

## Comportamento

- Tema escuro com logos oficiais Space Apps 2026 e Overpass local; fontes/licença documentadas.
- Brasil/estados isolados com recorte do canvas pelo polígono real, incluindo raster, ilhas e furos.
- Seleção de passagens de vários dias persistida na URL. Lista identifica datas e ordem; camadas mais recentes ficam sobre as anteriores, com transparência ajustável.
- Calendário, downloads individuais, comparação compatível e histórias preservados. Atalho de comparação e detalhes de passagem mais claros; informações complementares recolhíveis.
- Mocks identificados apenas nos ambientes previstos; sem novas funcionalidades backend nem dependências npm.

## Validação

- 89 testes frontend / 15 arquivos aprovados; build TypeScript + Vite aprovado.
- Chromium: home com imagens reais, logos, estados de erro/vazio, teclado, links antigos, desktop e mobile 320/390px.
- Smokes sintéticos: busca/seleção estadual, imagens diárias, multiday, reload, troca de estado e recorte raster/vetorial atravessando limites/furos.
- Capturas em `artifacts/home/` e `artifacts/redesign/`.

## Limitações

Alguns textos legados e narrativas da API permanecem em inglês. Composições misturam datas e não garantem cobertura integral; prévias não são medidas calibradas. Novas fontes de alertas/organizações/publicações mantêm suas dependências de backend. Testado em Chromium, sem auditoria completa WCAG ou Safari/Firefox.

Plano e rastreabilidade: `docs/plano-home-exploracao.md`, `docs/frontend-inventario.md`. Origem: Qwen concluiu 3 de 4 tarefas delegadas; Codex assumiu detalhes após os retornos, além de design, integração e validação.
