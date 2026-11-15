# M0 — inventário inicial e validação da delegação

T1.01 iniciada em 2026-11-14, base PR #2 aberta, commit 31d32cf84d2020868d5e3bd53349df5669e933a3. Nenhum aceite funcional é declarado por inspeção estática.

| Área | Evidência atual | Trabalho do plano |
|---|---|---|
| Navegação | router.tsx tem nacional, região, comparação e história; paths.ts centraliza links | T2.01–T2.04: cinco abas, normalização e histórico; A01–A07, A24 pendentes |
| Regiões | OverviewPage e RegionPage chamam useRegions sem filtro; RegionPage admite país e macrorregiões | T2.02 restringir a estados; A02 pendente |
| Radar | Calendário, lista, detalhes, mapas e seleção day/pass já existem | T3.01 preservar e testar restauração; A06–A13 pendentes |
| Concorrência | Hooks passam AbortSignal e incluem UF/período na chave; keepPreviousData presente | T2.05 auditar placeholder entre UFs; A08/A20 pendentes |
| HTTP | client.ts usa fetch e erro tipado, sem timeout explícito ou tratamento Retry-After | T1.07 implementar transporte/adapters e política de erro |
| Contratos | api/types.ts e rotas HTTP existentes; sem OpenAPI identificado | T1.02–T1.04 transcrever existentes e propor novos, sem declarar acordo backend |
| Novas fontes | Sem hooks para alerts, organizations ou posts | T1.06–T1.07 e M3/M4; fixtures sintéticas ainda não criadas |
| Ferramentas | Vitest Node e oito arquivos de testes web; sem MSW, Testing Library, Playwright ou Storybook nos manifests | T1.05 e T6.01–T6.04 pendentes |

## Integração isolada

Artefatos em `/tmp/sars-junior-jy28s84k` (temporários): task.md, test_sum.py, baseline.diff, red.log, delegation.log e addition.py.

- Codex escreveu primeiro um teste unittest com cinco casos: positivos, zero, negativos, sinais mistos e inteiro grande. A execução inicial falhou por módulo ausente.
- Snapshot inicial no índice Git e baseline.diff, sem commit conforme restrição desta execução.
- junior.sh copiado sem alterações; modelo explicitamente qwen2.5-coder:7b e TEST_CMD explicitamente python3 -m unittest -v test_sum.py.
- Trace bash registra curl em localhost:11434/api/generate, processamento da resposta, gravação do arquivo e teste concluído com OK na primeira tentativa.
- Qwen produziu addition.py; Codex revisou com git diff --no-index e repetiu o teste: 1 teste, 5 subcasos, sucesso. Sem intervenção na implementação e sem correções.
- Não foram modificadas funcionalidades do produto durante essa integração.

## Pendências

M0 não concluído: contratos, mocks, adapters e ferramentas ainda pendentes. A01–A24 continuam sem aceite nesta entrega. ARCHITECTURE.md foi atualizado localmente, mas a regra preexistente de .gitignore o exclui do versionamento; essa regra foi preservada. O conector GitHub retornou 404; gh confirmou ambas as PRs abertas.

## Validação da baseline frontend

`npm ci --ignore-scripts --no-audit --no-fund` concluiu (164 pacotes). Após a instalação, `npm test -w web` passou: 8 arquivos, 67 testes. `npm run build` passou, incluindo TypeScript e Vite. Tentativas feitas antes de a instalação concluir falharam por executáveis ausentes; a repetição após conclusão resolveu. Lint não executado: não há script. Backend, browser/E2E e acessibilidade não foram testados.

## Incremento estadual — 2026-11-14

Branch `feat/frontend-prototipo`, empilhada sobre PR #2 ainda aberta. Publicação autorizada posteriormente pelo usuário; sem merge automático.

- M0 parcial / T1.06: fixtures vazias para alerts, organizations e posts produzidas pelo Qwen via junior.sh. Teste de envelopes aprovado. OpenAPI, geração de tipos, MSW e demais cenários ainda pendentes; não há validação de schema completa.
- M1 parcial / T2.01–T2.04: shell com cinco links, seleção estadual, rejeição de IDs não estaduais e normalização de URL. A03–A05 têm cobertura unitária (9 testes); integração browser ainda pendente. Link legado abre radar; padrão overview; período inválido volta a 30 dias UTC com aviso. Não declarar A01/A02/A06/A07/A24 aceitos sem E2E/manual.
- M2: Radar existente reutilizado sem reescrita. Regressões de navegação/mapas ainda exigem browser.
- M3 parcial: resumo com medianGapDays nulo como dados insuficientes, par com desempate determinístico e blocos independentes. A09/A10 ainda precisam testes específicos. História e emergência no Overview pendentes.
- M4 parcial: painéis Alerts, Help e Posts com loading, vazio, erro/retry e stale. Alertas exibem textos completos em details e expiração pelo relógio. Help omite campanhas vazias sem inferir causa. Posts reconhecem destinos region/compare/story. Ordenação, agregação IBGE, filtros Help, referência explícita e cenários completos pendentes.
- M5 parcial: `npm test -w web` passou (10 arquivos, 77 testes); `npm run build` passou (TypeScript + Vite); `git diff --check` passou. Sem E2E, avaliação visual, acessibilidade ou integração real das fontes novas.

### Autoria e revisão

Qwen: `demoFeeds.ts`, primeira execução aprovada. `navigation.ts` foi delegado, mas falhou nas três tentativas internas (9 testes falhando); a implementação gerada foi substituída pelo Codex por sutilezas de datas e compatibilidade de URL. Codex: parser final, testes prévios, integração multi-arquivo StatePage/router/OverviewPage/styles e documentação. Revisão por git diff, incluindo arquivos novos. Nenhuma mudança backend ou dependência adicional.

### Demonstração e limitações

`VITE_DEMO_FEEDS=true npm run dev:web` habilita somente fixtures vazias das novas fontes em desenvolvimento, com identificação visível. Produção ignora essa flag. Mapa, resumo e Radar continuam dependendo da API existente. Sem flag, novas rotas indisponíveis mostram erro local. Não é uma demonstração offline completa, nem conclusão de qualquer marco integral do plano. A simplificação incremental de M0 não substitui o contrato planejado: tipos locais são projeções provisórias e não geração OpenAPI.

Arquivos: `web/src/features/region/{StatePage.tsx,navigation.ts,navigation.test.ts,demoFeeds.ts,demoFeeds.test.ts}`, `web/src/app/{router.tsx,styles.css}`, `web/src/features/overview/OverviewPage.tsx`; tarefas reproduzíveis em `tasks/frontend/`. `.gitignore` preexistente preservado; ARCHITECTURE.md continua local. Documentação versionada reside neste inventário. Publicar como rascunho enquanto os critérios restantes estiverem pendentes.

## Redesign territorial — 2026-11-15

Branch local `feat/territorial-redesign`, baseada no commit da PR #3. Na inspeção, #1 → dev, #2 → #1, #3 → #2 e #4 → dev continuavam abertas. Nenhum merge automático. `.gitignore` preexistente permanece fora da entrega.

### Entrega e autoria

- Codex: integração do tema preto/azul, cabeçalho compacto, sidebar de 280px, mapa predominante, indicadores de aquisições/período/fonte e controles recolhíveis mobile. Overview e histórias complementares ficam recolhíveis; as cinco seções estaduais e Radar permanecem acessíveis.
- Qwen: `PhenomenaNotice.tsx` e `RegionPicker.tsx` (busca por nome/sigla sem acentos, Brasil e retorno, preservação da seleção). **2 tarefas delegadas, 2 concluídas pelo Qwen, 0 assumidas pelo Codex após falhas nesta execução.** O seletor recebeu duas correções de revisão; houve retentativas internas do script por erros de typecheck. São quatro invocações reais de junior.sh no total, contando as correções. As tarefas estão em `tasks/frontend/location-picker.md` e `territory-note.md`.
- Codex: `TerritoryClip.tsx`, `territory.ts`, testes geoespaciais e smoke de navegador, por envolverem projeção, câmera e composição de pixels. Revisão por diff de todos os arquivos alterados/novos.

### Técnica territorial

O GeoJSON IBGE existente é projetado pela câmera ativa do MapLibre. Cada anel de Polygon/MultiPolygon vira um subcaminho de `clip-path: path(evenodd, ...)`, aplicado ao **canvas WebGL inteiro**. Assim, pixels de vetores, raster e imagens georreferenciadas compartilham o mesmo recorte; ilhas e furos são preservados. Não é recorte por bbox, imagem estática nem deformação da geometria.

Na visão nacional entram somente geometrias estaduais brasileiras; na estadual, somente a geometria do ID selecionado. O estilo territorial não carrega países vizinhos. O canvas começa fechado (`inset(100%)`) e permanece fechado sem geometria, inclusive em transições. O recorte acompanha renderizações e resize; resize reenquadra a geometria. World copies estão desativadas. MaxBounds limita a câmera com margens neutras para não cortar o território em viewports de proporções diferentes. Essas margens não revelam dados fora do polígono.

Radar oculta footprints e imagem durante placeholder de outro contexto. Mapas legados de comparação/história recebem por padrão a máscara nacional, sem alterar a comparação de imagens; a visão estadual explícita usa a máscara estadual. Marcador HTML de história foi retirado do mapa nacional, pois não pertence ao canvas; acesso à história permanece no painel e navegação. Outros overlays HTML são controles/informações, não camadas geográficas.

### Dados e limitações

Não existem camadas geográficas contratadas de alagamentos, enchentes, deslizamentos ou tornados. A interface informa a indisponibilidade e não inventa checkboxes operacionais, áreas afetadas ou indicadores de desastres. A camada efetiva continua sendo cobertura/passagens radar. Mocks novos permanecem identificados conforme incremento anterior.

Precisão limitada à resolução do GeoJSON IBGE já fornecido pelo projeto. Não foi feita auditoria cartográfica externa. O recorte é visual, não modifica/download recortado dos dados originais. Navegadores sem suporte a CSS path evenodd devem manter o canvas fechado; compatibilidade foi exercitada em Chromium, não Safari/Firefox. Integração ao vivo das imagens ASF, APIs novas e fontes ambientais continua pendente; nenhuma funcionalidade backend foi implementada.

### Validação e reprodução

- `npm test -w web`: 80 testes aprovados, 11 arquivos. Inclui Polygon com furo, MultiPolygon/ilhas, reprojeção e todas as 27 geometrias estaduais reais fornecidas.
- `npm run build`: TypeScript + Vite aprovados. Sem novo script de lint e sem dependências adicionadas aos manifests.
- `web/scripts/territorial-smoke.mjs`: smoke Chromium com respostas HTTP **sintéticas** e limites reais do repositório. Exercita seleção Brasil/SC, pesquisa, zoom, resize, rota Radar e aba Alerts com falha isolada. Teste de pixels verifica raster e traço vetorial que atravessam polígono côncavo e furo: pixels externos ficam ocultos, internos permanecem. Isso valida a técnica de composição; não substitui teste de imagens reais da ASF.
- Inspeção visual efetiva das capturas desktop 1440×900 e mobile 390×844 em `artifacts/redesign/`. Corrigidos enquadramento inicialmente cortado por maxBounds e máscara desatualizada durante transição. Sem alegação de auditoria completa WCAG.

Executar aplicação: `npm run dev` (API existente e web). Frontend isolado: `npm run dev:web`; novas fontes vazias demonstrativas: `VITE_DEMO_FEEDS=true npm run dev:web`.

Para repetir o smoke sem alterar dependências do projeto: instalar `@playwright/test` em diretório temporário, instalar Chromium com seu CLI, iniciar Vite na porta 5173 e rodar, da raiz, `PLAYWRIGHT_MODULE=/caminho/temporario/node_modules/playwright/index.mjs node web/scripts/territorial-smoke.mjs`. `CHROMIUM_PATH` opcional permite indicar o executável. As capturas usam mocks, não observações ambientais reais.
