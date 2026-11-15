# Home e leitura das composições

Incremento sobre M1, M2, M3 e M5 do plano frontend existente. Não altera contratos nem backend.

## Plano de ação e aceite

1. **H1 — Entrada e navegação (Codex):** home em `/`, explorador em `/explore`; URLs antigas `/?region&month` continuam abrindo o mapa com filtros. História RS acessível em um clique; rotas de radar/comparação preservadas.
2. **H2 — Home (Codex integração/design; Qwen componentes isolados):** apresentação curta, história RS com prévias reais retornadas pela API, datas, ações de história/mapa, três caminhos de exploração e fontes/limites. Falha ou ausência de imagens não bloqueia navegação. Sem estatísticas inventadas ou imagens sintéticas em produção.
3. **H3 — Composição (Codex integração; Qwen ordenação):** explicitar múltiplas datas e a ordem cronológica de desenho, identificar cada imagem, manter remoção e persistência em URL. Mais recente sobre as anteriores; não prometer cobertura integral nem detecção de mudanças.
4. **H4 — Clareza (Qwen tradução delimitada; Codex integração):** traduzir cabeçalho e detalhes de passagem, tornar explícito o atalho de comparação compatível. Priorizar Radar/Visão geral e agrupar seções complementares sem removê-las. Narrativas vindas da API permanecem no idioma da fonte.
5. **H5 — Validação e entrega (Codex):** testes de rotas, ordem temporal e componentes; regressão frontend, build, smoke Chromium desktop/mobile/fluxos e revisão por diff. Atualizar inventário e preparar descrição/comandos de PR.

## Organização Git

PRs #1–#4 verificadas abertas em 2026-11-15; #3 baseada na #2; #4 é documental sobre dev. Branch de trabalho `feat/home-e-exploracao` criada de `feat/radar-multiday` (`6ea92bb`). Dependências locais anteriores não publicadas: redesign → navegação diária → múltiplos dias. Publicação sugerida: PR consolidada contra `feat/frontend-prototipo` (#3), incluindo incrementos locais acumulados; não apontar apenas este incremento para uma base inexistente no GitHub. Sem merge automático. Preservar `.gitignore` preexistente. Documentação nesta branch; sincronizar dev após revisão/integração, sem antecipar entregas não incorporadas.

## H6 — Identidade Space Apps (pedido adicional)

Aplicar o guia oficial vigente (25/06/2026), logos oficiais 2026 sem alterações, Overpass local com licença, paleta azul com amarelo pontual, identidade compartilhada por home/mapa/radar/história/comparação. Preservar cores semânticas da cobertura e recorte territorial. Codex: design e integração; Qwen: `SpaceAppsBrand`. Verificar logos carregados, proporções, contraste dos pares principais, responsividade e regressão dos mapas. Fontes e atribuições em `web/public/brand/README.md`.

## Resultado e preparação de publicação

H1, H2, H3, H5 e H6 concluídos e validados. H4 concluído no escopo delimitado (cabeçalho, detalhes e organização complementar); tradução integral de textos legados/API fica pendente. Resultados e autoria registrados no inventário. Build aprovado, 89 testes aprovados e cinco smokes Chromium aprovados.

Branch pronta localmente, sem push/PR/merge nesta execução. Para publicar a entrega consolidada sobre a PR #3, após reconferir que sua branch ainda é a base adequada:

```bash
git push -u origin feat/home-e-exploracao
gh pr create --base feat/frontend-prototipo --head feat/home-e-exploracao --title "Home Space Apps e exploração territorial multiday" --body-file docs/pr-home-exploracao.md
```

Rodar aplicação: `npm run dev`, abrir `http://localhost:5173/`. Para repetir smokes, manter aplicação rodando e configurar `PLAYWRIGHT_MODULE` e, se necessário, `CHROMIUM_PATH` conforme instruções do inventário. `home-smoke.mjs` consulta a API real para as prévias; demais smokes usam fixtures explícitas.
