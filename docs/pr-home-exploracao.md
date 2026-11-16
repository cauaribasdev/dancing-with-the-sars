# Home Space Apps e exploração territorial com imagens de múltiplas datas

A aplicação abre com uma home que apresenta o objetivo, imagens reais antes/depois do RS e acesso direto à história e ao mapa. O explorador passa para `/explore`; links antigos da raiz com filtros continuam funcionando.

Esta PR consolidada depende da PR #3 (`feat/frontend-prototipo`, por sua vez sobre a #2) e inclui os incrementos locais ainda não publicados: redesign territorial, correção da busca de estados/navegação, composição diária e multiday, home, identidade Space Apps, feeds complementares de alertas/organizações/publicações e página dedicada ao histórico de alertas com cabeçalho atualizado.

## Comportamento

- Tema escuro com logos oficiais Space Apps 2026 e Overpass local; fontes/licença documentadas.
- Brasil/estados isolados com recorte do canvas pelo polígono real, incluindo raster, ilhas e furos.
- Seleção de passagens de vários dias persistida na URL. Lista identifica datas e ordem; camadas mais recentes ficam sobre as anteriores, com transparência ajustável.
- Calendário, downloads individuais, comparação compatível e histórias preservados. Atalho de comparação e detalhes de passagem mais claros; informações complementares recolhíveis.
- Alertas do INMET/CAP/WIS2 com filtro IBGE, expiração correta e lista dedicada de ativos/histórico; o mapa não sobrepõe círculos ou contagens aos estados.
- Posts gerados de passagens/pares/histórias, com links tipados e paginação determinística.
- Help com snapshot público do IPEA em CSV streaming, filtro atual para assistência social/saúde, proximidade, atribuição, stale e warm-up de cache.
- Contratos Zod e OpenAPI 3.1 para feeds novos; sem novos dados sintéticos fora dos smokes.
- Interface própria em português brasileiro, com datas/contagens localizadas e textos oficiais ou narrativas originais identificados no idioma de origem.

## Validação

- 62 testes servidor / 12 arquivos e 91 testes frontend / 16 arquivos aprovados; typecheck e build TypeScript + Vite aprovados.
- Chromium: home com imagens reais, logos, estados de erro/vazio, teclado, links antigos, desktop e mobile 320/390px; painéis opcionais com respostas controladas em 320px.
- Smokes sintéticos: links inválidos/legados, navegação e composição multiday com voltar/avançar/reload e troca de mês/UF (`multiday-radar-smoke.mjs`), seleção de estado no polígono e pela lista (`territorial-smoke.mjs`), Overview vazio, georreferenciamento nulo com detalhes preservados (`daily-radar-smoke.mjs`), comparação incompatível com falha/retry de imagem (`compare-smoke.mjs`), Help vazio/indisponível/stale/pan (`help-smoke.mjs`), dados stale e retry em Overview/Publicações (`stale-smoke.mjs`) e `alerts-smoke.mjs` (teclado, UTC, expiração, retry isolado, corrida de UFs, resposta `history` inconsistente com fallback `recent`, links visíveis e sem overflow em 390/320 px).
- INMET consultado ao vivo: endpoint estadual RS respondeu 200 com 4 alertas ativos; timezone CAP foi normalizado para UTC.
- `/alerts` apresenta alertas ativos e encerrados no snapshot CAP móvel de oito dias e filtra por estado. O cabeçalho foi reorganizado com marca SAR e identificação do projeto em um bloco, navegação principal separada e identidade NASA Space Apps; em telas pequenas os links passam para uma faixa abaixo da marca, mantendo Alertas acessível. O mapa não sobrepõe círculos e contagens aos polígonos estaduais.
- Axe em Chromium e Firefox, depois da hidratação, nas rotas `/`, `/explore`, `/region/rs?tab=alerts`, `/compare` e `/alerts`: nenhuma violação WCAG A/AA. A nova página corrigiu contraste de texto; smoke verifica primeiro foco, tecla Enter e resumo expansível.
- Repetição atual do smoke home expirou após 120 s aguardando as imagens ASF. O endpoint browse respondeu HTTP 200 aos headers, mas o corpo de 5,2 MB não concluiu em 35 s no Chromium; o teste anterior bem-sucedido de previews reais permanece registrado, sem reprodução nesta execução.
- Capturas em `artifacts/home/` e `artifacts/redesign/`.

## Limitações

O arquivo geral do IPEA tem cerca de 344 MB e sua primeira carga exige warm-up/cache persistente; o snapshot verificado é de agosto de 2026 e recebe marca stale. O CSV não tem categorias separadas para habitação ou comunidades/favelas nem id interno de perfil. Campanhas GlobalGiving não estão configuradas. Composições misturam datas e não garantem cobertura integral; prévias não são medidas calibradas. Narrativas e títulos das fontes permanecem no idioma original e são identificados como inglês. Interface própria traduzida para pt-BR. Testado em Chromium e Firefox; axe não encontrou violações WCAG A/AA nas cinco rotas auditadas. Permanecem pendentes Safari, leitor de tela, zoom e revisão manual dos resultados incompletos do axe; o critério A01–A24 segue parcialmente aberto.

Plano e rastreabilidade: `docs/plano-fechamento.md`, `docs/frontend-inventario.md`. PR alvo: base `feat/frontend-prototipo`; publicar sem merge.
