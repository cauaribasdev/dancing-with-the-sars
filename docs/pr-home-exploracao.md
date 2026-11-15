# Home Space Apps e exploração territorial com imagens de múltiplas datas

A aplicação abre com uma home que apresenta o objetivo, imagens reais antes/depois do RS e acesso direto à história e ao mapa. O explorador passa para `/explore`; links antigos da raiz com filtros continuam funcionando.

Esta PR consolidada depende da PR #3 (`feat/frontend-prototipo`, por sua vez sobre a #2) e inclui os incrementos locais ainda não publicados: redesign territorial, correção da busca de estados/navegação, composição diária e multiday, home, identidade Space Apps, feeds complementares de alertas/organizações/publicações e página dedicada ao histórico de alertas com cabeçalho atualizado.

## Comportamento

- Tema escuro com logos oficiais Space Apps 2026 e Overpass local; fontes/licença documentadas.
- Brasil/estados isolados com recorte do canvas pelo polígono real, incluindo raster, ilhas e furos.
- Seleção de passagens de vários dias persistida na URL. Lista identifica datas e ordem; camadas mais recentes ficam sobre as anteriores, com transparência ajustável.
- Calendário, downloads individuais, comparação compatível e histórias preservados. Atalho de comparação e detalhes de passagem mais claros; informações complementares recolhíveis.
- Alertas do INMET/CAP/WIS2 com filtro IBGE, expiração correta e selos estaduais na visão nacional.
- Posts gerados de passagens/pares/histórias, com links tipados e paginação determinística.
- Help com snapshot público do IPEA em CSV streaming, filtro atual para assistência social/saúde, proximidade, atribuição, stale e warm-up de cache.
- Contratos Zod e OpenAPI 3.1 para feeds novos; sem novos dados sintéticos fora dos smokes.
- Interface própria em português brasileiro, com datas/contagens localizadas e textos oficiais ou narrativas originais identificados no idioma de origem.

## Validação

- 60 testes servidor / 12 arquivos e 89 testes frontend / 15 arquivos aprovados; typecheck e build TypeScript + Vite aprovados.
- Chromium: home com imagens reais, logos, estados de erro/vazio, teclado, links antigos, desktop e mobile 320/390px; painéis opcionais com respostas controladas em 320px.
- Smokes sintéticos: busca/seleção estadual, imagens diárias, multiday, reload, troca de estado e recorte raster/vetorial atravessando limites/furos.
- INMET consultado ao vivo: endpoint estadual RS respondeu 200 com 4 alertas ativos; timezone CAP foi normalizado para UTC.
- `/alerts` apresenta alertas ativos e encerrados no snapshot CAP móvel de oito dias, filtra por estado e está ligado no cabeçalho; o mapa não sobrepõe círculos e contagens aos polígonos estaduais. Smoke Chromium com respostas INMET sintéticas confirmou navegação, duas listas, filtro/URL e layout sem overflow a 320 px.
- Axe em Chromium e Firefox, depois da hidratação, nas rotas `/`, `/explore`, `/region/rs?tab=alerts` e `/compare`: nenhuma violação WCAG A/AA. Smoke da home repetido após a tradução; link de salto recebeu o primeiro foco.
- Capturas em `artifacts/home/` e `artifacts/redesign/`.

## Limitações

O arquivo geral do IPEA tem cerca de 344 MB e sua primeira carga exige warm-up/cache persistente; o snapshot verificado é de agosto de 2026 e recebe marca stale. O CSV não tem categorias separadas para habitação ou comunidades/favelas nem id interno de perfil. Campanhas GlobalGiving não estão configuradas. Composições misturam datas e não garantem cobertura integral; prévias não são medidas calibradas. Narrativas e títulos das fontes permanecem no idioma original e são identificados como inglês. Interface própria traduzida para pt-BR. Testado em Chromium e Firefox; axe não encontrou violações WCAG A/AA nas quatro rotas auditadas. Permanecem pendentes Safari, leitor de tela, zoom e revisão manual dos resultados incompletos do axe.

Plano e rastreabilidade: `docs/plano-fechamento.md`, `docs/frontend-inventario.md`. PR alvo: base `feat/frontend-prototipo`; publicar sem merge.
