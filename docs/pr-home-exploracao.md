# Home Space Apps e exploração territorial com imagens de múltiplas datas

A aplicação abre com uma home que apresenta o objetivo, imagens reais antes/depois do RS e acesso direto à história e ao mapa. O explorador passa para `/explore`; links antigos da raiz com filtros continuam funcionando.

Esta PR consolidada depende da PR #3 (`feat/frontend-prototipo`, por sua vez sobre a #2) e inclui os incrementos locais ainda não publicados: redesign territorial, correção da busca de estados/navegação, composição diária e multiday, home, identidade Space Apps e fechamento dos feeds complementares de alertas, organizações e publicações.

## Comportamento

- Tema escuro com logos oficiais Space Apps 2026 e Overpass local; fontes/licença documentadas.
- Brasil/estados isolados com recorte do canvas pelo polígono real, incluindo raster, ilhas e furos.
- Seleção de passagens de vários dias persistida na URL. Lista identifica datas e ordem; camadas mais recentes ficam sobre as anteriores, com transparência ajustável.
- Calendário, downloads individuais, comparação compatível e histórias preservados. Atalho de comparação e detalhes de passagem mais claros; informações complementares recolhíveis.
- Alertas do INMET/CAP/WIS2 com filtro IBGE, expiração correta e selos estaduais na visão nacional.
- Posts gerados de passagens/pares/histórias, com links tipados e paginação determinística.
- Help com snapshot público do IPEA em CSV streaming, filtro atual para assistência social/saúde, proximidade, atribuição, stale e warm-up de cache.
- Contratos Zod e OpenAPI 3.1 para feeds novos; sem novos dados sintéticos fora dos smokes.

## Validação

- 60 testes servidor / 12 arquivos e 89 testes frontend / 15 arquivos aprovados; typecheck e build TypeScript + Vite aprovados.
- Chromium: home com imagens reais, logos, estados de erro/vazio, teclado, links antigos, desktop e mobile 320/390px; painéis opcionais com respostas controladas em 320px.
- Smokes sintéticos: busca/seleção estadual, imagens diárias, multiday, reload, troca de estado e recorte raster/vetorial atravessando limites/furos.
- INMET consultado ao vivo: endpoint estadual RS respondeu 200 com 4 alertas ativos; timezone CAP foi normalizado para UTC.
- Capturas em `artifacts/home/` e `artifacts/redesign/`.

## Limitações

O arquivo geral do IPEA tem cerca de 344 MB e sua primeira carga exige warm-up/cache persistente; o snapshot verificado é de agosto de 2026 e recebe marca stale. O CSV não tem categorias separadas para habitação ou comunidades/favelas nem id interno de perfil. Campanhas GlobalGiving não estão configuradas. Composições misturam datas e não garantem cobertura integral; prévias não são medidas calibradas. Narrativas e títulos das fontes permanecem no idioma original e são identificados como inglês. Testado em Chromium; sem auditoria completa de leitor de tela/contraste nem validação Safari/Firefox.

Plano e rastreabilidade: `docs/plano-fechamento.md`, `docs/frontend-inventario.md`. PR alvo: base `feat/frontend-prototipo`; publicar sem merge.
