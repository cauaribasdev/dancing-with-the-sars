# Plano para fechar o projeto

Este plano transforma as pendências do inventário em entregas revisáveis. A prioridade é um produto confiável e demonstrável com dados reais disponíveis; fonte indisponível deve aparecer como indisponível, nunca como dado real sintético.

## Estado de partida

- Branch de trabalho: `feat/home-e-exploracao`, baseada na cadeia local de commits de redesign, navegação e composição; a alteração preexistente em `.gitignore` foi preservada fora do commit.
- Home, exploração nacional/estadual, Radar, comparação e história já estavam implementados. Esta execução acrescenta endpoints e integrações de INMET, IPEA e Posts, além de uma página dedicada a alertas ativos/histórico e navegação visível no cabeçalho.
- `server/` agora inclui adaptadores CAP/WIS2 e CSV IPEA, rotas e cache; o feed de Posts deriva do catálogo existente.
- PRs #1–#4 continuam abertas como dependências; a PR consolidada #5 foi publicada contra `feat/frontend-prototipo`.
- Permanecem limites externos: o CSV do IPEA observado tem centenas de MB e está antigo; categorias de habitação e comunidades/favelas não são campos independentes nele. Campanhas GlobalGiving não estão configuradas; Safari e leitor de tela não foram validados neste ambiente.

## Princípios de aceite

1. Cada funcionalidade externa tem contrato versionado, origem, atribuição, atualização e estados de vazio/erro/stale definidos.
2. Fixtures são identificadas e habilitadas apenas em desenvolvimento; nunca são confundidas com dados reais.
3. Falha numa fonte complementar não bloqueia Radar, história ou comparação.
4. Nenhuma métrica de inundação ou detecção automática é inferida das prévias PNG.
5. Toda tarefa delegada ao agente local tem um único arquivo de saída permitido, teste reproduzível e revisão de diff pelo tech lead.
6. PRs devem formar uma cadeia de bases válida; publicar não implica merge.

## Marcos

### F0 — Baseline e plano

- Registrar plano, dependências entre PRs, configuração disponível e comandos atuais.
- Confirmar `npm test`, `npm run typecheck` e `npm run build` antes de mudanças de produto.
- Aceite: baseline reproduzível e working tree preexistente preservada.

### F1 — Contratos e fixtures

- Definir schemas JSON/OpenAPI para rotas existentes e para fontes opcionais, incluindo respostas e erros, `dataSource`, timestamps, campos opcionais e semântica de vazios.
- Marcar claramente as limitações dos contratos conforme capacidades verificadas das fontes.
- Produzir fixtures válidas por contrato, exemplos vazios e falhas parciais.
- Aceite: validação automática de fixtures e documentação sem alegar integração que não existe.

### F2 — Robustez do servidor e fontes

- Implementar adaptadores isolados e cache para fontes cuja API e licença estejam verificadas; timeout, rate limit, parsing defensivo, atribuição e stale.
- Para INMET: filtrar alertas por município/UF via código IBGE, converter CAP lat/lon corretamente, ordenar e expirar alertas pelo relógio.
- Para IPEA: áreas, proximidade, limite, metadados do snapshot e distinção entre campanhas ausentes/vazias/falha.
- Posts automáticos: gerar apenas a partir de passagens/pares/histórias existentes, sem alegar detecção; links tipados e ordenação determinística.
- Aceite: testes de contrato e casos de falha; nenhuma chamada externa nos testes unitários.

### F3 — Integração frontend

- Trocar feeds demo por hooks reais quando endpoints estiverem disponíveis, manter demo exclusivamente opt-in em dev.
- Completar Overview (história, par, emergência), Alerts, Posts e Help com estados independentes, freshness, retry e sem dados de outro estado/período.
- Criar a página `/alerts` para avisos ativos e encerrados no snapshot CAP móvel de oito dias, com filtro por estado.
- Tornar alertas visíveis no cabeçalho e substituir as contagens circulares ambíguas sobre o mapa por um link para a página dedicada.
- Aceite: chaves de cache completas, AbortSignal, ausência/erro/stale distintos e integração por feature documentada.

### F4 — Qualidade e acessibilidade

- Cobrir critérios A01–A24 e jornadas de links antigos, navegação/voltar/recarregar, troca de UF/período, composição, falhas independentes e links de Posts.
- Executar E2E em Chromium e inspeção manual de teclado, leitor de tela, zoom, foco, contraste, movimento reduzido e larguras 320/390/1024/1280.
- Validar Firefox/Safari quando ambientes estiverem disponíveis; registrar limitações sem alegar conformidade certificada.
- Tradução: traduzir interface própria legada para português; preservar textos oficiais do INMET e idioma original de narrativas/citações com indicação de idioma.
- Aceite: evidências anexadas ao inventário e regressão completa aprovada.

### F5 — Entrega e publicação

- Atualizar README, rotas, inventário, aceite e instruções de deploy (API, CORS, `VITE_API_BASE`, fallback SPA e cache).
- Executar testes, typecheck, build, smokes e validação de contratos; rever diffs por arquivo.
- Reconciliar PRs #1–#4 e publicar a cadeia consolidada com bases existentes, sem merge automático.
- Aceite: PR #5 aberta e interligada à base correta, descrição inclui escopo, evidências e limitações; arquivos locais do agente permanecem fora do commit.

## Execução e dependências

Ordem: F0 → F1 → F2/F4 em paralelo lógico → F3 → F4 final → F5. A parte de F2 referente a fontes reais depende de APIs acessíveis e condições de uso verificáveis. Se não houver fonte ou credencial pública, entregar adapter de indisponibilidade e contrato explícito, mantendo a integração real como bloqueio declarado; não simular sucesso.

Cada incremento será delegado pelo `./junior.sh` conforme `AGENTS.md`, em branch Git de trabalho e com arquivos delimitados. O tech lead revisará diffs e repetirá validações antes de incorporar. Nenhuma PR será mesclada sem autorização específica.

### Verificação atual de fontes (2026-11-15)

- INMET documenta seus avisos no portal oficial e publica notificações CAP no nó WIS2 `wis2bra.inmet.gov.br`. A API WIS2 consultada retorna notificações com links XML, mas a amostra recebida era de setembro enquanto o portal já mostrava avisos de novembro; a aplicação deve medir a idade da última publicação e marcar os dados como `stale` quando ultrapassarem o limite configurado. Fonte: [API WIS2 do INMET](https://wis2bra.inmet.gov.br/oapi/openapi), [portal de avisos](https://avisos.inmet.gov.br/).
- O IPEA oferece [API pública](https://mapaosc.ipea.gov.br/api/api/documentation), [tabela oficial de áreas](https://mapaosc.ipea.gov.br/api/api/area_atuacao) e [bases mensais para download](https://mapaosc.ipea.gov.br/base-dados). O CSV geral tem cerca de 344 MB, inclui CNPJ, situação, UF, coordenadas e flags de área, mas não o id interno de perfil. A consulta ao vivo da tabela confirmou que 1 é Habitação, 2 Saúde, 5 Assistência social e 12 OSCs em comunidades/favelas. O CSV atual tem colunas para 2 e 5, mas não 1 ou 12. A importação streaming produz cache compacto e usa stale após 45 dias; a primeira carga sem cache pode demorar vários minutos e exige `CACHE_DIR` persistente.
- O adaptador IPEA passou também pela carga fria completa: snapshot de 2026-08-18, 3.832 organizações no RS, marcado como `stale` pelo limite de 45 dias. A importação levou vários minutos e gravou cache compacto em `CACHE_DIR`; não há CSV bruto no repositório.

## Progresso

- [x] F0 inspeção inicial e registro do plano.
- [x] F0 baseline de comandos na branch de trabalho: testes 33 servidor + 89 web; typecheck e build passaram.
- [x] F1 schemas Zod e especificação OpenAPI 3.1 dos três feeds; testes verificam fixtures e referências.
- [x] F2 rotas, contratos, cache e adaptadores INMET, IPEA e Posts; 62 testes do servidor passam. A carga fria IPEA foi concluída e o cache pré-aquecido foi validado.
- [x] F3 integração dos painéis de fonte, paginação, página dedicada `/alerts` e histórico de oito dias; consultas têm cache keys próprias e AbortSignal. O cabeçalho tem link persistente e o mapa encaminha para a lista, sem círculos/contagens sobre polígonos.
- [ ] F4 parcial: 153 testes (62 servidor + 91 web), typecheck e build passam. Smokes Chromium com fixtures para busca estadual, radar diário, composição multiday, recorte territorial e `/alerts` passaram. O smoke da home foi repetido, mas expirou após 120 s aguardando as imagens externas; o endpoint ASF respondeu aos headers, porém o corpo de 5,2 MB não concluiu em 35 s no Chromium. Essa repetição não confirma a jornada da home nesta execução. Axe em `/alerts` no Chromium e Firefox: zero violações WCAG A/AA; nas quatro rotas anteriores (`/`, `/explore`, `/region/rs?tab=alerts`, `/compare`) há evidência registrada no inventário. Primeiro foco “Pular para o conteúdo”; `prefers-reduced-motion` reconhecido. Ainda não houve revisão com leitor de tela, Safari ou zoom; A01–A24 não têm aceite completo.
- [x] F5 PR #5 publicada e aberta contra `feat/frontend-prototipo`; sem merge. PRs #1–#4 permanecem abertas como dependências upstream.

### Auditoria por critério A01–A24 (2026-11-15)

O arquivo [frontend-aceite.md](frontend-aceite.md) continua sendo a especificação original; esta tabela registra evidência encontrada nesta branch. “Parcial” significa que a jornada tem cobertura relacionada, mas não cobre todos os passos/ambientes do critério.

| Critério | Status atual | Evidência / lacuna concreta |
|---|---|---|
| A01 | Parcial | Smokes territorial e busca cobrem escolha por lista; não há verificação explícita do clique em polígono do mapa. |
| A02 | Verificado por smoke | `state-search-smoke.mjs` abre `br`, macrorregião e UF desconhecida; cada caminho mostra página não encontrada e volta ao mapa. |
| A03 | Verificado por unidade + smoke | `navigation.test.ts` e `state-search-smoke.mjs` cobrem links sem `tab` com `day`/`pass`, normalizados para Radar. |
| A04 | Verificado por unidade + smoke | O smoke abre `/region/sc` sem parâmetros, confirma Overview e normalização de URL/período. |
| A05 | Parcial | `navigation.test.ts` testa aba e período inválidos, aviso e limpeza da seleção; falta E2E de URL. |
| A06 | Parcial | Multiday verifica recarga/seleção; falta Browser Back entre abas e restauração completa por jornada. |
| A07 | Parcial | Multiday verifica limpeza e troca de UF; não cobre troca de período por todos os caminhos da interface. |
| A08 | Aberto | Sem teste de duas respostas concluindo em ordem inversa para a mesma tela. |
| A09 | Parcial | `pairs.test.ts` confirma `medianGapDays: null` com zero ou uma data; falta validar a mensagem no Overview. |
| A10 | Parcial | `pairs.test.ts` confirma ausência de par e desempate estável por stack; falta validar a mensagem visual no Overview. |
| A11 | Aberto | Comparação incompatível ainda requer inspeção de interface. |
| A12 | Parcial | `browseImage.test.ts` cobre georef nula/baixa; smoke diário confirma exclusão visual, mas falta inspecionar detalhes em estado de erro. |
| A13 | Aberto | Imagem/WebGL indisponível exige inspeção visual/teclado; não revalidado nesta execução. |
| A14 | Verificado por smoke | `alerts-smoke.mjs` cobre listas vazias e ativos/histórico preenchidos. |
| A15 | Verificado por smoke | `alerts-smoke.mjs` injeta INMET 503, confirma retry e navega ao Radar estadual com os demais endpoints funcionais. |
| A16 | Adaptado | Os selos no mapa foram removidos a pedido do usuário por serem ambíguos; `app.test.ts` confirma o filtro de municípios RS/SC na API usada pela página dedicada. |
| A17 | Verificado em unidade + smoke | Expiração muda de ativo para histórico com relógio do navegador avançado, sem novo fetch. |
| A18 | Parcial | Helpers e contrato cobrem UTC; falta verificar visualmente a virada do dia na interface de alertas. |
| A19 | Parcial | `/alerts` mostra aviso stale específico do INMET no smoke; outras seções ainda não têm falha-com-cache verificada via browser. |
| A20 | Parcial | `alerts-smoke.mjs` confirma que mudar UF limpa os avisos da UF anterior; falta simular duas respostas simultâneas fora de ordem. |
| A21 | Parcial | Contratos e rota cobrem vazios/erros; falta smoke da interface Help distinguindo os dois estados. |
| A22 | Aberto | Sem smoke de campanhas vazias na interface. |
| A23 | Aberto | Distância de referência durante pan/zoom requer inspeção manual. |
| A24 | Parcial | `/alerts` smoke usa teclado, expansão de texto e viewport 320 px; demais larguras e leitor de tela não foram inspecionados. |

O smoke territorial passou após restringir o seletor à navegação “Seções do estado”; o seletor anterior se tornou ambíguo com o link global “Alertas”.
